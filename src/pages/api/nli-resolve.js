export const prerender = false;

/**
 * Resolve and store the NLI poster image for a DOCID.
 *
 * NLI's hosts do not behave alike from a datacenter, which is what shapes this:
 *
 *   iiif.nli.org.il/IIIFv21/{FL}/…        200  — image delivery and info.json are open
 *   iiif.nli.org.il/IIIFv21/DOCID/…       403  — Cloudflare; the DOCID→FL lookup is shut
 *   www.nli.org.il/…                      403  — Cloudflare
 *   api.nli.org.il/openlibrary/search     200  — open to anyone with a (free) key
 *
 * So a server can validate any image but can only discover which FL to ask for
 * through the Open Library API. With NLI_API_KEY set this endpoint resolves entirely
 * on its own. Without it, it still accepts a service base discovered by the visitor's
 * browser — which passes the Cloudflare challenge where a server cannot — and stores
 * that instead. Either way the image is re-validated here before anything is written.
 *
 * Deliberately narrow, since it is unauthenticated:
 *   · a service base must match https://iiif.nli.org.il/IIIFv21/FL<digits> exactly,
 *     so no caller can point our records at another host,
 *   · the DOCID must already exist — rows are updated, never inserted,
 *   · the image is fetched and confirmed to be an image before any write,
 *   · a row that already has an image_url is left alone.
 * The worst a bad actor achieves is storing a genuine NLI image on a record missing one.
 */

import { createClient } from '@supabase/supabase-js';
import {
  SERVICE_BASE_RE,
  buildImageUrls,
  discoverViaNliApi,
  identifierFromServiceBase,
  imagesFromManifest,
  manifestUrlForDocId,
  rightsFromManifest,
  verifyImageUrl,
} from '../../lib/nli.js';

const TABLE = 'tanakh_nli_poster_evidence';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const NLI_API_KEY = import.meta.env.NLI_API_KEY || process.env.NLI_API_KEY;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** The canonical route, which only works from an IP Cloudflare doesn't challenge. */
async function discoverViaManifest(docId) {
  try {
    const res = await fetch(manifestUrlForDocId(docId), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const manifest = await res.json();
    const images = imagesFromManifest(manifest);
    if (!images.length) return null;
    return {
      serviceBase: images[0].serviceBase,
      imageCount: images.length,
      rights: rightsFromManifest(manifest),
    };
  } catch {
    return null;
  }
}

export async function POST({ request }) {
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'not configured' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }

  const docId = typeof body?.docId === 'string' ? body.docId.trim() : '';
  if (!docId) return json({ error: 'docId required' }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Only rows that exist and still need an image. Never an insert.
  const { data: rows, error: readError } = await supabase
    .from(TABLE)
    .select('id, image_url, thumbnail_url, image_identifier, image_attribution, image_license_url, nli_manifest_url')
    .eq('nli_doc_id', docId)
    .is('image_url', null);
  if (readError) return json({ error: 'lookup failed' }, 500);
  if (!rows?.length) return json({ updated: 0, reason: 'no row needs an image for that DOCID' });

  // A service base the caller already discovered, or one we find ourselves.
  let serviceBase = null;
  let rights = { attribution: null, licenseUrl: null };
  let imageCount = 1;
  let via = null;

  const supplied = typeof body?.serviceBase === 'string' ? body.serviceBase.trim() : '';
  if (supplied) {
    if (!SERVICE_BASE_RE.test(supplied)) {
      return json({ error: 'serviceBase must be an NLI IIIF FL service base' }, 400);
    }
    serviceBase = supplied;
    via = 'client';
  } else {
    const fromApi = await discoverViaNliApi(docId, { apiKey: NLI_API_KEY });
    if (fromApi) { serviceBase = fromApi.serviceBase; via = 'nli-api'; }
    if (!serviceBase) {
      const fromManifest = await discoverViaManifest(docId);
      if (fromManifest) {
        serviceBase = fromManifest.serviceBase;
        rights = fromManifest.rights;
        imageCount = fromManifest.imageCount;
        via = 'manifest';
      }
    }
  }

  if (!serviceBase) {
    return json({
      updated: 0,
      reason: NLI_API_KEY
        ? 'no image identifier found for that DOCID'
        : 'server cannot reach the NLI manifest and NLI_API_KEY is not set',
    }, 200);
  }

  const { imageUrl, thumbnailUrl } = buildImageUrls(serviceBase);
  const check = await verifyImageUrl(imageUrl);
  if (!check.ok) return json({ error: 'that identifier does not serve an image', detail: check }, 422);
  const thumbOk = (await verifyImageUrl(thumbnailUrl)).ok;

  const identifier = identifierFromServiceBase(serviceBase);
  let updated = 0;
  for (const row of rows) {
    const patch = { image_url: imageUrl, image_identifier: identifier };
    // A stored Rosetta thumbnail is weaker than a IIIF one, so it is worth replacing —
    // but only once the IIIF thumbnail has actually been confirmed to load.
    if (thumbOk) patch.thumbnail_url = thumbnailUrl;
    if (!row.nli_manifest_url) patch.nli_manifest_url = manifestUrlForDocId(docId);
    // Never blank out metadata that is already there.
    if (rights.attribution && !row.image_attribution) patch.image_attribution = rights.attribution;
    if (rights.licenseUrl && !row.image_license_url) patch.image_license_url = rights.licenseUrl;

    const { error: writeError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
    if (!writeError) updated += 1;
  }

  return json({
    updated, via, identifier, imageUrl,
    thumbnailUrl: thumbOk ? thumbnailUrl : null,
    imageCount,
  });
}
