export const prerender = false;

/**
 * Write endpoint for the Mega Siddur commentary layer.
 *
 * The page reads siddur_commentary through the anon key (RLS allows SELECT of
 * published rows only). Adding, editing or removing commentary lands here
 * instead, where the service-role key lives, gated on MEGA_SIDDUR_PASSWORD
 * (falling back to MEGA_BIBLE_PASSWORD so one passcode can unlock both).
 *
 * Because the service-role key bypasses RLS, "list-all" also returns the
 * unpublished (draft / private) rows so they can be seen while unlocked.
 */

import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

const env = (name) => import.meta.env[name] || process.env[name];

const SUPABASE_URL = env('PUBLIC_SUPABASE_URL');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const PASSCODE = env('MEGA_SIDDUR_PASSWORD') || env('MEGA_BIBLE_PASSWORD');

const TABLE = 'siddur_commentary';
const COLUMNS =
  'id,ref,segment,prayer_names,anchor_text,kind,title,body,author,source,source_pages,source_url,tags,sort_order,published,created_at,updated_at';
const KINDS = new Set(['commentary', 'halacha', 'history', 'kavanah', 'source', 'language', 'personal', 'music']);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function passcodeMatches(supplied) {
  if (!PASSCODE || typeof supplied !== 'string') return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(PASSCODE);
  // timingSafeEqual throws on a length mismatch, which would itself leak the length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const text = (value, max = 2000) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const positiveInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 10000 ? n : null;
};

/** Accepts an array or a comma-separated string; trims, dedupes, caps. */
const list = (value, { lower = false } = {}) => {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  const out = [];
  for (const item of raw) {
    let s = String(item ?? '').trim().slice(0, 120);
    if (lower) s = s.toLowerCase();
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 30);
};

/** Turns the posted record into a row, or returns { error }. */
function toRow(record) {
  const ref = text(record.ref, 400);
  const prayerNames = list(record.prayer_names, { lower: true });
  const body = text(record.body, 50000);
  const kind = text(record.kind, 40) || 'commentary';
  if (!ref && !prayerNames.length) return { error: 'Anchor the note to a section or to at least one prayer name.' };
  if (!body) return { error: 'Write the commentary itself.' };
  if (!KINDS.has(kind)) return { error: `Unknown kind "${kind}".` };
  const url = text(record.source_url, 1000);
  if (url && !/^https?:\/\//i.test(url)) return { error: 'The source link must start with http(s)://' };
  return {
    row: {
      ref,
      segment: ref ? positiveInt(record.segment) : null,
      prayer_names: prayerNames,
      anchor_text: text(record.anchor_text, 1000),
      kind,
      title: text(record.title, 300),
      body,
      author: text(record.author, 300),
      source: text(record.source, 1000),
      source_pages: text(record.source_pages, 200),
      source_url: url,
      tags: list(record.tags),
      sort_order: Number.isInteger(Number(record.sort_order)) ? Number(record.sort_order) : 0,
      published: record.published !== false,
    },
  };
}

const validId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const actions = {
  async add(db, body) {
    const { row, error: invalid } = toRow(body.record ?? {});
    if (invalid) return { error: invalid, status: 400 };
    const { data, error } = await db.from(TABLE).insert(row).select(COLUMNS).single();
    return error ? { error: error.message, status: 400 } : { record: data };
  },

  async update(db, body) {
    const id = validId(body.id);
    if (!id) return { error: 'Missing id.', status: 400 };
    const { row, error: invalid } = toRow(body.record ?? {});
    if (invalid) return { error: invalid, status: 400 };
    const { data, error } = await db.from(TABLE).update(row).eq('id', id).select(COLUMNS).single();
    return error ? { error: error.message, status: 400 } : { record: data };
  },

  async delete(db, body) {
    const id = validId(body.id);
    if (!id) return { error: 'Missing id.', status: 400 };
    const { data, error } = await db.from(TABLE).delete().eq('id', id).select('id');
    if (error) return { error: error.message, status: 400 };
    if (!data?.length) return { error: 'Nothing to delete.', status: 404 };
    return { deleted: id };
  },

  /** Every row (drafts included) for one section ref and/or prayer names. */
  async list(db, body) {
    const ref = text(body.ref, 400);
    const names = list(body.prayer_names, { lower: true });
    const queries = [];
    if (ref) queries.push(db.from(TABLE).select(COLUMNS).eq('ref', ref));
    if (names.length) queries.push(db.from(TABLE).select(COLUMNS).overlaps('prayer_names', names));
    if (!queries.length) return { error: 'Nothing to look up.', status: 400 };
    const results = await Promise.all(queries);
    const failed = results.find((r) => r.error);
    if (failed) return { error: failed.error.message, status: 400 };
    const byId = new Map();
    for (const r of results) for (const rec of r.data ?? []) byId.set(rec.id, rec);
    return { records: [...byId.values()] };
  },
};

export async function POST({ request }) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Supabase is not configured on the server.' }, 500);
  }
  if (!PASSCODE) {
    return json({ error: 'MEGA_SIDDUR_PASSWORD (or MEGA_BIBLE_PASSWORD) is not set on the server.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  if (!passcodeMatches(request.headers.get('x-mega-siddur-key') || body.key)) {
    return json({ error: 'Wrong passcode.' }, 401);
  }

  // "unlock" lets the UI check a passcode before showing the editor.
  if (body.action === 'unlock') return json({ ok: true });

  const action = Object.hasOwn(actions, body.action) ? actions[body.action] : null;
  if (!action) return json({ error: `Unknown action "${body.action}".` }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const result = await action(db, body);
    return result.error ? json({ error: result.error }, result.status ?? 400) : json(result);
  } catch (err) {
    console.error('[api/mega-siddur-commentary]', body.action, err);
    return json({ error: 'Something went wrong saving that.' }, 500);
  }
}
