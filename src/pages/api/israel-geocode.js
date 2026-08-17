export const prerender = false;

/**
 * Address search for pinning shuls and places on /israel.
 *
 * Proxies to Nominatim (OpenStreetMap) server-side rather than calling it from the
 * browser: Nominatim's usage policy wants a real, identifying User-Agent, which
 * browser fetch() cannot set — only a server request can. This runs as a Netlify
 * Function, which has ordinary outbound internet access.
 *
 * Gated on the same passcode as every other write on this page. It doesn't touch the
 * database, but it does spend our Nominatim request budget, and an unauthenticated
 * relay to a third-party API is worth keeping behind the same door as everything else.
 */

import { timingSafeEqual } from 'node:crypto';

const PASSCODE = import.meta.env.ISRAEL_TRACKER_PASSWORD || process.env.ISRAEL_TRACKER_PASSWORD;
const USER_AGENT = 'matthewjamesmiller.com israel-tracker (https://matthewjamesmiller.com)';

// Ra'anana's rough bounding box — biases (or, when bounded=1, restricts) results so
// "Herzl 5" resolves to the Herzl in Ra'anana rather than a same-named street
// somewhere else in the country.
const RAANANA_VIEWBOX = '34.845,32.210,34.905,32.160';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function passcodeMatches(supplied) {
  if (!PASSCODE || typeof supplied !== 'string') return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(PASSCODE);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET({ request, url }) {
  if (!PASSCODE) return json({ error: 'ISRAEL_TRACKER_PASSWORD is not set on the server.' }, 500);
  if (!passcodeMatches(request.headers.get('x-israel-key'))) {
    return json({ error: 'Wrong passcode.' }, 401);
  }

  const q = url.searchParams.get('q')?.trim().slice(0, 200);
  if (!q) return json({ error: 'Missing q.' }, 400);
  const bounded = url.searchParams.get('bounded') === '1';

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '5',
    countrycodes: 'il',
    viewbox: RAANANA_VIEWBOX,
    bounded: bounded ? '1' : '0',
  })}`;

  try {
    const response = await fetch(nominatimUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'he,en' },
    });
    if (!response.ok) {
      return json({ error: `Nominatim returned ${response.status}` }, 502);
    }
    const hits = await response.json();
    return json({
      results: hits.map((hit) => ({
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        label: hit.display_name,
      })),
    });
  } catch (err) {
    console.error('[api/israel-geocode]', err);
    return json({ error: 'Could not reach the geocoder.' }, 502);
  }
}
