export const prerender = false;

/**
 * The request form on /warmhouse and /warmhouse/for/<agent>. Writes the request to Supabase
 * `warmhouse_requests` with the anon key (RLS allows INSERT only), hands back one signed upload URL
 * per photo for the private `warmhouse-photos` bucket, then starts the warmhouse-notify workflow,
 * which emails the request. Without GITHUB_DISPATCH_TOKEN the workflow's hourly run sends it.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const DISPATCH_TOKEN = import.meta.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_DISPATCH_TOKEN;
const NOTIFY_URL =
  'https://api.github.com/repos/Matthewjmiller07/matthew-miller-personal-site/actions/workflows/warmhouse-notify.yml/dispatches';
const BUCKET = 'warmhouse-photos';
const MAX_PHOTOS = 8;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const str = (v, max) => String(v ?? '').trim().slice(0, max) || null;

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
  if (body?.website) return json({ ok: true, uploads: [] });

  const name = str(body?.name, 120);
  const email = (str(body?.email, 200) || '').toLowerCase();
  if (!name) return json({ error: 'Please add your name.' }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: 'That email address doesn’t look right.' }, 400);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body?.closing_date || '') ? body.closing_date : null;

  const id = crypto.randomUUID();
  const photos = (Array.isArray(body?.photos) ? body.photos : []).filter((p) => EXT[p?.type]).slice(0, MAX_PHOTOS);
  const paths = photos.map((p, n) => `${id}/${n + 1}.${EXT[p.type]}`);

  const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('warmhouse_requests').insert({
    id,
    name,
    email,
    phone: str(body?.phone, 40),
    brokerage: str(body?.brokerage, 160),
    kind: str(body?.kind, 80),
    tier: str(body?.tier, 40),
    property_address: str(body?.property_address, 240),
    plate_text: str(body?.plate_text, 120),
    closing_date: date,
    listing_url: str(body?.listing_url, 500),
    note: str(body?.note, 2000),
    agent_slug: str(body?.agent_slug, 80),
    model_choice: str(body?.model_choice, 120),
    photo_paths: paths,
  });
  if (error) return json({ error: 'Couldn’t send that just now. Please try again.' }, 500);

  const uploads = [];
  for (const path of paths) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (!data?.signedUrl) break;
    uploads.push({ url: data.signedUrl });
  }
  await notify();
  return json({ ok: true, uploads });
}
