export const prerender = false;

/**
 * Data for the private outreach tracker at /warmhouse/tracker. Guarded by the desk passcode
 * (DESK_PASSWORD, sent as "Authorization: Bearer <passcode>"), and reads with
 * SUPABASE_SERVICE_ROLE_KEY because visits, requests and outreach rows aren't readable with anon.
 *
 * GET  -> { agents: [...], unmatched: { visits, requests } } with each agent's outreach row,
 *         page visits and form requests.
 * POST -> { slug, status?, listing_modeled?, emailed_at?, dropped_at?, next_step?, notes? }
 *         saves that agent's outreach row.
 */

import { createClient } from '@supabase/supabase-js';
import agents from '../../data/warmhouse/agents.json';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = import.meta.env.DESK_PASSWORD || process.env.DESK_PASSWORD;

const STATUSES = [
  'Not started',
  'Model ready',
  'Emailed',
  'Dropped off',
  'Followed up',
  'Replied',
  'Call booked',
  'Ordered',
  'Not interested',
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUGS = new Set(agents.map((a) => a.slug));

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function guard(request) {
  if (!SUPABASE_URL || !SERVICE_KEY || !PASSWORD) return json({ error: 'The tracker is not configured on the server.' }, 503);
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!sameSecret(bearer, PASSWORD)) return json({ error: 'Wrong passcode.' }, 401);
  return null;
}

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export async function GET({ request }) {
  const blocked = guard(request);
  if (blocked) return blocked;
  const supabase = db();
  const [outreach, visits, requests] = await Promise.all([
    supabase.from('warmhouse_outreach').select('*'),
    supabase.from('warmhouse_visits').select('created_at, slug, src, referrer_host, device').order('created_at', { ascending: false }).limit(2000),
    supabase
      .from('warmhouse_requests')
      .select('created_at, agent_slug, name, email, kind, model_choice, property_address, closing_date')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);
  const err = outreach.error || visits.error || requests.error;
  if (err) return json({ error: 'Couldn’t read the tracker data.' }, 500);

  const rows = Object.fromEntries((outreach.data || []).map((r) => [r.slug, r]));
  const bySlug = (list, key) => {
    const m = {};
    for (const r of list || []) (m[r[key] || ''] ||= []).push(r);
    return m;
  };
  const v = bySlug(visits.data, 'slug');
  const q = bySlug(requests.data, 'agent_slug');
  return json({
    statuses: STATUSES,
    agents: agents.map((a) => ({
      slug: a.slug,
      name: a.name,
      brokerage: a.brokerage,
      area: a.area,
      listing: a.listing,
      delivered: Boolean(a.delivered),
      outreach: rows[a.slug] || { slug: a.slug, status: a.listing ? 'Model ready' : 'Not started' },
      visits: v[a.slug] || [],
      requests: q[a.slug] || [],
    })),
    unmatched: { visits: (v[''] || []).slice(0, 200), requests: q[''] || [] },
  });
}

export async function POST({ request }) {
  const blocked = guard(request);
  if (blocked) return blocked;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }
  if (!SLUGS.has(body?.slug)) return json({ error: 'Unknown agent.' }, 400);
  const text = (v, max) => (v == null ? undefined : String(v).trim().slice(0, max) || null);
  const date = (v) => (v == null ? undefined : DATE.test(v) ? v : null);
  const row = {
    slug: body.slug,
    status: STATUSES.includes(body.status) ? body.status : undefined,
    listing_modeled: text(body.listing_modeled, 200),
    emailed_at: date(body.emailed_at),
    dropped_at: date(body.dropped_at),
    next_step: text(body.next_step, 300),
    notes: text(body.notes, 4000),
    updated_at: new Date().toISOString(),
  };
  for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k];
  const { data, error } = await db().from('warmhouse_outreach').upsert(row, { onConflict: 'slug' }).select().single();
  if (error) return json({ error: 'Couldn’t save that.' }, 500);
  return json({ ok: true, outreach: data });
}
