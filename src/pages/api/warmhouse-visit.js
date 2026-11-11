export const prerender = false;

/**
 * Logs a view of /warmhouse or /warmhouse/for/<slug> to Supabase `warmhouse_visits`, so the
 * tracker (/warmhouse/tracker) shows which agents opened their page and the hourly
 * warmhouse-notify workflow emails an alert (started right away for an agent's page). Sent by the page's own script, so link scanners that
 * don't run JavaScript aren't counted, and the owner's browser (flagged by the tracker page)
 * never sends one. Insert-only with the anon key; nothing here can read visits back.
 */

import { createClient } from '@supabase/supabase-js';
import agents from '../../data/warmhouse/agents.json';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const DISPATCH_TOKEN = import.meta.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_DISPATCH_TOKEN;
const NOTIFY_URL =
  'https://api.github.com/repos/Matthewjmiller07/matthew-miller-personal-site/actions/workflows/warmhouse-notify.yml/dispatches';
const SLUGS = new Set(agents.map((a) => a.slug));
const SOURCES = new Set(['email', 'qr', 'dm', 'card', 'text']);
const BOTS = /bot|crawl|spider|preview|fetch|scan|headless|lighthouse|slurp|facebookexternalhit|embedly/i;

const done = (status = 204) => new Response(null, { status });

export async function POST({ request }) {
  if (!SUPABASE_URL || !ANON_KEY) return done(503);
  const ua = request.headers.get('user-agent') || '';
  if (BOTS.test(ua)) return done();
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return done(400);
  }
  const slug = SLUGS.has(body?.slug) ? body.slug : null;
  const src = SOURCES.has(body?.src) ? body.src : null;
  let referrerHost = null;
  try {
    if (body?.referrer) referrerHost = new URL(body.referrer).hostname.slice(0, 120);
  } catch {
    // not a URL: leave it out
  }
  const device = /iphone|android.+mobile|mobile/i.test(ua) ? 'phone' : /ipad|tablet|android/i.test(ua) ? 'tablet' : 'desktop';
  const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('warmhouse_visits').insert({ slug, src, referrer_host: referrerHost, device });
  // An agent opening their own page is worth knowing about now, not at the next hourly run.
  if (!error && slug && DISPATCH_TOKEN) {
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
    }).catch(() => {});
  }
  return done();
}
