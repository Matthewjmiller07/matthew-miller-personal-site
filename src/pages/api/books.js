export const prerender = false;

/**
 * The bookshelf API behind /books.
 *
 *   GET  /api/books                 → every book (public, same as the page)
 *   GET  /api/books?resolve=<link>  → details for an archive.org / HebrewBooks / PDF link or ISBN (public, no write)
 *   POST /api/books                 → add or update a book. Body: {link?, id?, title?, status?, ...fields}.
 *                                     With just {link, status}, the link is looked up and the book saved.
 *                                     Pasting a link already on the shelf updates that book.
 *   POST /api/books {id, delete: true} → remove a book
 *
 * Writes need BOOKS_PASSWORD (falls back to DESK_PASSWORD), sent as "Authorization: Bearer <passcode>"
 * or a `password` field, and go to Supabase `books` with SUPABASE_SERVICE_ROLE_KEY.
 */

import { booksWriter, listBooks, resolveBookLink, BOOK_STATUSES, DIGITAL_SOURCES } from '../../lib/books';

const PASSWORD =
  import.meta.env.BOOKS_PASSWORD || process.env.BOOKS_PASSWORD || import.meta.env.DESK_PASSWORD || process.env.DESK_PASSWORD;

const CORS = { 'Access-Control-Allow-Origin': '*' };
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
}

export async function GET({ url }) {
  const link = url.searchParams.get('resolve');
  if (link) {
    const details = await resolveBookLink(link);
    if (!details) return json({ error: 'That doesn’t look like a link or an ISBN.' }, 400);
    return json(details);
  }
  return json(await listBooks());
}

const TEXT_FIELDS = { title: 300, title_he: 300, author: 300, year: 40, language: 60, isbn: 20, digital_id: 200, digital_url: 1000, pdf_url: 1000, cover_url: 1000, notes: 5000 };

function clean(body) {
  const row = {};
  for (const [k, max] of Object.entries(TEXT_FIELDS)) {
    if (k in body) row[k] = body[k] == null || String(body[k]).trim() === '' ? null : String(body[k]).trim().slice(0, max);
  }
  for (const k of ['digital_url', 'pdf_url', 'cover_url']) {
    if (row[k] && !/^https?:\/\//i.test(row[k])) row[k] = null;
  }
  if ('status' in body && BOOK_STATUSES.includes(body.status)) row.status = body.status;
  if ('digital_source' in body) row.digital_source = DIGITAL_SOURCES.includes(body.digital_source) ? body.digital_source : null;
  if ('parted_on' in body) row.parted_on = /^\d{4}-\d{2}-\d{2}$/.test(String(body.parted_on || '')) ? body.parted_on : null;
  if ('tags' in body) {
    row.tags = (Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(','))
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return row;
}

export async function POST({ request }) {
  const db = booksWriter();
  if (!PASSWORD || !db) return json({ error: 'The bookshelf is not configured on the server.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send JSON: {"link": "https://hebrewbooks.org/2101", "status": "digital"}' }, 400);
  }
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!sameSecret(bearer || String(body?.password || ''), PASSWORD)) return json({ error: 'Wrong passcode.' }, 401);

  if (body.delete) {
    if (!body.id) return json({ error: 'Which book? Send its id.' }, 400);
    const { error } = await db.from('books').delete().eq('id', body.id);
    return error ? json({ error: 'Couldn’t delete that just now.' }, 500) : json({ ok: true, deleted: body.id });
  }

  // A link fills in whatever the caller didn't send.
  let warning;
  let row = clean(body);
  if (body.link) {
    const found = await resolveBookLink(String(body.link));
    if (!found) return json({ error: 'That doesn’t look like a link or an ISBN.' }, 400);
    ({ warning } = found);
    const looked = clean(found);
    for (const [k, v] of Object.entries(looked)) if (row[k] == null && v != null) row[k] = v;
  }

  // Which row is this? An explicit id, else the same digital copy or ISBN already on the shelf.
  let id = body.id || null;
  if (!id && row.digital_source && row.digital_id) {
    const { data } = await db.from('books').select('id').eq('digital_source', row.digital_source).eq('digital_id', row.digital_id).maybeSingle();
    id = data?.id ?? null;
  }
  if (!id && row.isbn) {
    const { data } = await db.from('books').select('id').eq('isbn', row.isbn).limit(1).maybeSingle();
    id = data?.id ?? null;
  }

  if (id) {
    const { data, error } = await db.from('books').update(row).eq('id', id).select('*').single();
    if (error) return json({ error: 'Couldn’t save that just now.' }, 500);
    return json({ ok: true, updated: true, book: data, warning });
  }

  if (!row.title) return json({ error: 'A book needs a title (or a link that has one).', warning }, 400);
  if (!row.status) row.status = row.digital_source ? 'digital' : 'shelf';
  const { data, error } = await db.from('books').insert(row).select('*').single();
  if (error) return json({ error: 'Couldn’t save that just now.' }, 500);
  return json({ ok: true, created: true, book: data, warning });
}
