export const prerender = false;

/**
 * Write endpoint for the Mega Bible "Books & Papers" layer.
 *
 * The page reads literary_bible through the anon key (RLS allows SELECT only).
 * Adding or removing a book/paper lands here instead, where the service-role key
 * lives, gated on MEGA_BIBLE_PASSWORD. Each book/paper is its own literary_bible
 * row with device left NULL, so it never shows up as a literary device.
 */

import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSCODE = import.meta.env.MEGA_BIBLE_PASSWORD || process.env.MEGA_BIBLE_PASSWORD;

const TABLE = 'literary_bible';
const COLUMNS = 'id,book,chapter,verse,words,book_paper,book_pages,book_notes';

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
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : null;
};

const actions = {
  async add(db, body) {
    const record = body.record ?? {};
    const book = text(record.book, 60);
    const chapter = positiveInt(record.chapter);
    const verse = positiveInt(record.verse);
    const bookPaper = text(record.book_paper, 1000);
    if (!book || !chapter || !verse) return { error: 'A book, chapter and verse are required.', status: 400 };
    if (!bookPaper) return { error: 'Enter the book or paper.', status: 400 };

    const { data, error } = await db
      .from(TABLE)
      .insert({
        book,
        chapter,
        verse,
        device: null,
        words: text(record.words, 500),
        book_paper: bookPaper,
        book_pages: text(record.book_pages, 200),
        book_notes: text(record.book_notes, 5000),
      })
      .select(COLUMNS)
      .single();
    return error ? { error: error.message, status: 400 } : { record: data };
  },

  /** Only ever removes a books-only row — never a literary-device entry. */
  async delete(db, body) {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return { error: 'Missing id.', status: 400 };
    const { data, error } = await db
      .from(TABLE)
      .delete()
      .eq('id', id)
      .is('device', null)
      .select('id');
    if (error) return { error: error.message, status: 400 };
    if (!data?.length) return { error: 'Nothing to delete.', status: 404 };
    return { deleted: id };
  },
};

export async function POST({ request }) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Supabase is not configured on the server.' }, 500);
  }
  if (!PASSCODE) {
    return json({ error: 'MEGA_BIBLE_PASSWORD is not set on the server.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  if (!passcodeMatches(request.headers.get('x-mega-bible-key') || body.key)) {
    return json({ error: 'Wrong passcode.' }, 401);
  }

  // "unlock" lets the UI check a passcode before showing the form.
  if (body.action === 'unlock') return json({ ok: true });

  const action = actions[body.action];
  if (!action) return json({ error: `Unknown action "${body.action}".` }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const result = await action(db, body);
    return result.error ? json({ error: result.error }, result.status ?? 400) : json(result);
  } catch (err) {
    console.error('[api/mega-bible-books]', body.action, err);
    return json({ error: 'Something went wrong saving that.' }, 500);
  }
}
