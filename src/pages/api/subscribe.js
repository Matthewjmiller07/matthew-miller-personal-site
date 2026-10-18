export const prerender = false;

/**
 * Email signup for the Projects page ("get new builds first"). Writes to the
 * Supabase `project_subscribers` table with the anon key; RLS on that table
 * allows INSERT only, so the key can't read the list back. A unique index on
 * lower(email) makes repeat signups a no-op, which we report as success.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Starts the newsletter delivery run now, so a new subscriber gets the latest issue within
// a minute instead of at the next hourly run. Needs GITHUB_DISPATCH_TOKEN (a token that can
// run workflows on this repo). Without it, or if GitHub doesn't answer, the hourly run still delivers.
const DISPATCH_TOKEN = import.meta.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_DISPATCH_TOKEN;
const DELIVER_URL =
  'https://api.github.com/repos/Matthewjmiller07/matthew-miller-personal-site/actions/workflows/newsletter-deliver.yml/dispatches';

async function startDelivery() {
  if (!DISPATCH_TOKEN) return;
  try {
    await fetch(DELIVER_URL, {
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
    // The hourly run picks this subscriber up.
  }
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function POST({ request }) {
  if (!SUPABASE_URL || !ANON_KEY) {
    return json({ error: 'Signups are not configured on the server.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot: real visitors never see or fill the `website` field.
  if (body?.website) return json({ ok: true });

  const email = String(body?.email || '').trim().toLowerCase();
  const source = String(body?.source || 'projects').slice(0, 64);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'That email address doesn’t look right.' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from('project_subscribers').insert({ email, source });
  if (error && error.code !== '23505') {
    return json({ error: 'Couldn’t save that just now — please try again.' }, 500);
  }
  if (!error) await startDelivery();
  return json({ ok: true });
}
