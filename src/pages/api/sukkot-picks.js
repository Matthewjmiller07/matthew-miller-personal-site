export const prerender = false;

/**
 * Read/write endpoint for the unlisted /dweck-sukkot-picks page: a handful of
 * short Sukkot clips that Rabbi Dweck can mark as favorites. The page is not
 * linked from anywhere — a private link is the only access control — so this
 * route talks to Supabase with the service-role key and never exposes it to
 * the browser, and only touches the one allowlisted table.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function client() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Supabase is not configured on the server.' }, 500);
  }

  const { data, error } = await client().from('dweck_sukkot_picks').select('clip_id, liked');
  if (error) return json({ error: error.message }, 500);

  const liked = Object.fromEntries(data.map((row) => [row.clip_id, row.liked]));
  return json({ liked });
}

export async function POST({ request }) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Supabase is not configured on the server.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const { clip_id: clipId, title, liked } = body;
  if (typeof clipId !== 'string' || !clipId) {
    return json({ error: 'Missing clip_id.' }, 400);
  }
  if (typeof liked !== 'boolean') {
    return json({ error: 'liked must be true or false.' }, 400);
  }

  const { error } = await client()
    .from('dweck_sukkot_picks')
    .upsert(
      { clip_id: clipId, title: typeof title === 'string' ? title.slice(0, 200) : clipId, liked, updated_at: new Date().toISOString() },
      { onConflict: 'clip_id' }
    );
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
}
