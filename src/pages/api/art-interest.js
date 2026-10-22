export const prerender = false;

/**
 * "I'd buy this" on /shas-art. Writes the request to the Supabase `art_interest` table with the
 * anon key (RLS allows INSERT only, so nobody can read requests back), then starts the
 * art-interest-notify workflow, which emails Matthew. Without GITHUB_DISPATCH_TOKEN, or if GitHub
 * doesn't answer, the workflow's hourly run sends it instead.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const DISPATCH_TOKEN = import.meta.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_DISPATCH_TOKEN;
const NOTIFY_URL =
  'https://api.github.com/repos/Matthewjmiller07/matthew-miller-personal-site/actions/workflows/art-interest-notify.yml/dispatches';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FORMATS = new Set(['Matte print', 'Stretched canvas', 'Framed poster', 'Not sure yet']);
const COLOURWAYS = new Set(['Illuminated', 'Classic', 'Ink & parchment', 'Not sure yet']);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const str = (v, max) => String(v ?? '').trim().slice(0, max);

async function notify() {
  if (!DISPATCH_TOKEN) return;
  try {
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DISPATCH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // The hourly run picks it up.
  }
}

export async function POST({ request }) {
  if (!SUPABASE_URL || !ANON_KEY) return json({ error: 'This form is not configured on the server.' }, 500);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  // Honeypot: real visitors never see or fill the `website` field.
  if (body?.website) return json({ ok: true });

  const email = str(body?.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ error: 'That email address doesn’t look right.' }, 400);
  const row = {
    email,
    name: str(body?.name, 120) || null,
    poster: str(body?.poster, 80) || null,
    format: FORMATS.has(body?.format) ? body.format : null,
    colourway: COLOURWAYS.has(body?.colourway) ? body.colourway : null,
    note: str(body?.note, 2000) || null,
  };
  const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('art_interest').insert(row);
  if (error) return json({ error: 'Couldn’t send that just now — please try again.' }, 500);
  await notify();
  return json({ ok: true });
}
