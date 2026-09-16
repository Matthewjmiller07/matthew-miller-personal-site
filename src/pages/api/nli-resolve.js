export const prerender = false;

/**
 * Write-back endpoint for NLI poster images.
 *
 * NLI puts its IIIF manifest and catalogue hosts behind a Cloudflare managed
 * challenge that refuses datacenter IPs, so scripts/resolve-nli-images.mjs can only
 * discover an FL identifier from an ordinary connection. Its image hosts, by
 * contrast, are open to everyone — a server can fetch FL images perfectly well, it
 * just can't look up which FL to ask for.
 *
 * So the lookup happens where it works: the Mega Bible page reads the manifest in
 * the visitor's browser, which passes the challenge, and posts the service base it
 * found here. This endpoint re-validates it server-side and stores it, so the next
 * visitor — and the site itself — gets the image straight from the database.
 *
 * It is deliberately narrow. The only thing it will accept is an NLI IIIF service
 * base for a DOCID already present in the table, and it only ever fills a row that
 * has no image yet:
 *   · the service base must match https://iiif.nli.org.il/IIIFv21/FL<digits> exactly,
 *     so no caller can point our records at an arbitrary host,
 *   · the DOCID must already exist — rows are updated, never inserted,
 *   · the image is fetched and confirmed to be an image before anything is written,
 *   · a row that already has an image_url is left alone.
 * The worst a bad actor can achieve is storing a genuine NLI image URL on a record
 * that was missing one.
 */

import { createClient } from '@supabase/supabase-js';

const TABLE = 'tanakh_nli_poster_evidence';
const SERVICE_BASE_RE = /^https:\/\/iiif\.nli\.org\.il\/IIIFv21\/(FL\d+)$/;

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Confirm the URL really serves an image; a challenge page or a 403 must not count. */
async function isRealImage(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'image/*', Range: 'bytes=0-0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return false;
    return (res.headers.get('content-type') || '').toLowerCase().startsWith('image/');
  } catch {
    return false;
  }
}

export async function POST({ request }) {
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'not configured' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }

  const docId = typeof body?.docId === 'string' ? body.docId.trim() : '';
  const serviceBase = typeof body?.serviceBase === 'string' ? body.serviceBase.trim() : '';
  if (!docId) return json({ error: 'docId required' }, 400);

  const match = SERVICE_BASE_RE.exec(serviceBase);
  if (!match) return json({ error: 'serviceBase must be an NLI IIIF FL service base' }, 400);
  const identifier = match[1];

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Only rows that exist and still need an image. Never an insert.
  const { data: rows, error: readError } = await supabase
    .from(TABLE)
    .select('id, image_url, thumbnail_url, image_identifier, nli_manifest_url')
    .eq('nli_doc_id', docId)
    .is('image_url', null);
  if (readError) return json({ error: 'lookup failed' }, 500);
  if (!rows?.length) return json({ updated: 0, reason: 'no row needs an image for that DOCID' });

  const imageUrl = `${serviceBase}/full/max/0/default.jpg`;
  const thumbnailUrl = `${serviceBase}/full/400,/0/default.jpg`;
  if (!(await isRealImage(imageUrl))) return json({ error: 'that URL does not serve an image' }, 422);
  const thumbOk = await isRealImage(thumbnailUrl);

  let updated = 0;
  for (const row of rows) {
    const patch = { image_url: imageUrl, image_identifier: identifier };
    // A stored Rosetta thumbnail is weaker than a IIIF one, so it is worth replacing —
    // but only once the IIIF thumbnail has actually been confirmed to load.
    if (thumbOk) patch.thumbnail_url = thumbnailUrl;
    if (!row.nli_manifest_url) {
      patch.nli_manifest_url = `https://iiif.nli.org.il/IIIFv21/DOCID/${encodeURIComponent(docId)}/manifest`;
    }
    const { error: writeError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
    if (!writeError) updated += 1;
  }

  return json({ updated, identifier, imageUrl, thumbnailUrl: thumbOk ? thumbnailUrl : null });
}
