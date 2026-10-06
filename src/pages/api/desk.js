export const prerender = false;

/**
 * Add a note to the newsletter desk (/desk). Used by the paste form on /desk and by any
 * LLM or script that can make an HTTP request. Guarded by DESK_PASSWORD, sent as
 * "Authorization: Bearer <passcode>" or a `password` field; writes go to Supabase
 * desk_items with SUPABASE_SERVICE_ROLE_KEY (anon can only read that table).
 */

import { deskWriter, DESK_STATUSES } from '../../lib/desk';

const PASSWORD = import.meta.env.DESK_PASSWORD || process.env.DESK_PASSWORD;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST({ request }) {
  const db = deskWriter();
  if (!PASSWORD || !db) return json({ error: 'The desk is not configured on the server.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send JSON: {"title": "...", "body": "..."}' }, 400);
  }

  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!sameSecret(bearer || String(body?.password || ''), PASSWORD)) {
    return json({ error: 'Wrong desk passcode.' }, 401);
  }

  const text = String(body?.body || '').trim();
  const title = String(body?.title || '').trim() || text.split('\n')[0].replace(/^#+\s*/, '').slice(0, 120);
  const status = DESK_STATUSES.includes(body?.status) ? body.status : 'idea';
  const tags = (Array.isArray(body?.tags) ? body.tags : String(body?.tags || '').split(','))
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 12);
  const source = String(body?.source || 'api').slice(0, 64);

  if (!text) return json({ error: 'The note is empty.' }, 400);
  if (text.length > 100000) return json({ error: 'That note is over 100,000 characters.' }, 400);

  const { data, error } = await db
    .from('desk_items')
    .insert({ title: title.slice(0, 200), body: text, status, tags, source })
    .select('id')
    .single();
  if (error) return json({ error: 'Couldn’t save that just now. Please try again.' }, 500);
  return json({ ok: true, slug: `note-${data.id.slice(0, 8)}`, url: `https://theothermatthewmiller.com/desk/note-${data.id.slice(0, 8)}.md` });
}
