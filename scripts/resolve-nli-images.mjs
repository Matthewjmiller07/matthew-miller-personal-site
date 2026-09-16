#!/usr/bin/env node
/**
 * Fill in the poster images on tanakh_nli_poster_evidence from NLI's IIIF API.
 *
 * The evidence rows arrive with an NLI DOCID and a catalogue link but no picture.
 * The only supported way to get from a DOCID to an image is NLI's IIIF Presentation
 * manifest:
 *
 *   https://iiif.nli.org.il/IIIFv21/DOCID/{DOCID}/manifest
 *
 * which hands back the real image service base for each canvas, e.g.
 * https://iiif.nli.org.il/IIIFv21/FL58252370. Everything we store is built from that
 * base — an FL identifier is never guessed from a DOCID, an IE id, a system number or
 * a catalogue URL, because there is no derivable relationship between them. If the
 * manifest doesn't give us one, the row is left alone and reported.
 *
 * The Rosetta DeliveryManagerServlet thumbnail endpoint that the browser network tab
 * shows is deliberately not used: it's an internal delivery URL, not a documented API,
 * and it takes an IE id we would likewise have to guess.
 *
 * Every candidate URL is fetched before it is written, so a 403 (rights-restricted)
 * or a 404 never lands in the database as if it were a working image.
 *
 * Idempotent: it only ever UPDATEs existing rows by primary key — it never inserts, so
 * re-running cannot duplicate evidence. Rows that already have an image_url are
 * skipped unless --all is passed.
 *
 * Needs, in .env or the environment:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (writes bypass RLS, so this must stay server-side)
 *
 * Usage:
 *   node scripts/resolve-nli-images.mjs            # rows with a DOCID and no image
 *   node scripts/resolve-nli-images.mjs --all      # re-resolve every row with a DOCID
 *   node scripts/resolve-nli-images.mjs --dry-run  # look, don't save
 */

import { createClient } from '@supabase/supabase-js';

const TABLE = 'tanakh_nli_poster_evidence';
const IIIF_BASE = 'https://iiif.nli.org.il/IIIFv21';

/** Bounded size for the in-page thumbnail — 400px wide, height to match. */
const THUMBNAIL_SIZE = '400,';
/** IIIF "as large as the server will give us" — only ever loaded in the lightbox. */
const FULL_SIZE = 'max';

const USER_AGENT =
  process.env.NLI_CONTACT_AGENT ||
  'matthewjamesmiller.com tanakh-nli-evidence (https://matthewjamesmiller.com)';

const REQUEST_TIMEOUT_MS = 30_000;
/** NLI is a public institution's API; don't hammer it. */
const RATE_LIMIT_MS = 600;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const log = (...args) => console.log('[nli-images]', ...args);

export function manifestUrlForDocId(docId) {
  return `${IIIF_BASE}/DOCID/${encodeURIComponent(docId)}/manifest`;
}

/**
 * IIIF Image API URLs end in {region}/{size}/{rotation}/{quality}.{format}. Strip
 * those four segments off an image resource's @id to recover the service base.
 * This reads back what NLI returned rather than inventing an identifier.
 */
function serviceBaseFromResourceId(resourceId) {
  if (typeof resourceId !== 'string' || !resourceId) return null;
  const withoutQuery = resourceId.split(/[?#]/)[0];
  const parts = withoutQuery.split('/');
  if (parts.length < 5) return null;
  const [quality, ...rest] = parts.slice(-1)[0].split('.');
  if (!quality || !rest.length) return null;   // not a {quality}.{format} tail
  return parts.slice(0, -4).join('/') || null;
}

/**
 * The service block is authoritative; the resource @id is the fallback for manifests
 * that inline a complete JPEG URL without advertising an image service.
 */
export function serviceBaseFromResource(resource) {
  if (!resource || typeof resource !== 'object') return null;

  const services = Array.isArray(resource.service) ? resource.service : [resource.service];
  for (const service of services) {
    const id = service && typeof service === 'object' ? service['@id'] || service.id : null;
    if (typeof id === 'string' && id) return id.replace(/\/+$/, '');
  }

  return serviceBaseFromResourceId(resource['@id'] || resource.id);
}

/** Only an FL identifier NLI actually handed us counts; anything else stays null. */
export function identifierFromServiceBase(serviceBase) {
  if (!serviceBase) return null;
  const last = serviceBase.split('/').filter(Boolean).pop() || '';
  return /^FL\d+$/i.test(last) ? last : null;
}

export function buildImageUrls(serviceBase) {
  const base = String(serviceBase).replace(/\/+$/, '');
  return {
    imageUrl: `${base}/full/${FULL_SIZE}/0/default.jpg`,
    thumbnailUrl: `${base}/full/${THUMBNAIL_SIZE}/0/default.jpg`,
  };
}

/** IIIF v2 lets a value be a bare string, a language map, or an array of either. */
function firstValue(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstValue(entry);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') return value['@id'] || value['@value'] || value.id || null;
  return null;
}

export function rightsFromManifest(manifest) {
  return {
    attribution: firstValue(manifest?.attribution),
    licenseUrl: firstValue(manifest?.license),
  };
}

/**
 * Every image resource in the manifest, in order. An NLI object is usually a
 * single-page poster today, but multi-canvas objects exist and the caller decides
 * what to do with the extras rather than this pretending page one is all there is.
 */
export function imagesFromManifest(manifest) {
  const found = [];
  const sequences = Array.isArray(manifest?.sequences) ? manifest.sequences : [];

  for (const sequence of sequences) {
    const canvases = Array.isArray(sequence?.canvases) ? sequence.canvases : [];
    for (const canvas of canvases) {
      const images = Array.isArray(canvas?.images) ? canvas.images : [];
      for (const image of images) {
        const resource = image?.resource;
        const serviceBase = serviceBaseFromResource(resource);
        if (!serviceBase) continue;
        found.push({
          serviceBase,
          resourceId: resource?.['@id'] || resource?.id || null,
          identifier: identifierFromServiceBase(serviceBase),
          canvasLabel: firstValue(canvas?.label),
        });
      }
    }
  }

  return found;
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Confirm the URL we built actually serves an image. A rights-restricted poster
 * answers 403 and a bad identifier answers 404; neither may be stored.
 */
export async function verifyImageUrl(url, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'image/*', Range: 'bytes=0-0', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const type = res.headers.get('content-type') || '';
    if (type && !type.startsWith('image/')) return { ok: false, status: res.status, contentType: type };
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** One row's worth of work, network included. Returns what should be written, or why not. */
export async function resolveRow(row, deps = {}) {
  const fetchManifest = deps.fetchManifest || getJson;
  const verify = deps.verifyImageUrl || verifyImageUrl;

  if (!row.nli_doc_id) return { skip: 'no-docid' };

  const manifestUrl = manifestUrlForDocId(row.nli_doc_id);

  let manifest;
  try {
    manifest = await fetchManifest(manifestUrl);
  } catch (err) {
    return { skip: 'manifest-unavailable', detail: err.status ? `HTTP ${err.status}` : err.message, manifestUrl };
  }

  const images = imagesFromManifest(manifest);
  if (!images.length) {
    const shapeless = !Array.isArray(manifest?.sequences);
    return { skip: shapeless ? 'unexpected-manifest' : 'no-image-resource', manifestUrl };
  }

  const primary = images[0];
  const { imageUrl, thumbnailUrl } = buildImageUrls(primary.serviceBase);

  const check = await verify(imageUrl);
  if (!check.ok) {
    return {
      skip: check.status === 403 ? 'rights-restricted' : 'image-unavailable',
      detail: check.status ? `HTTP ${check.status}` : check.error,
      manifestUrl,
    };
  }

  const { attribution, licenseUrl } = rightsFromManifest(manifest);

  return {
    manifestUrl,
    extraImages: images.length - 1,
    identifierMissing: !primary.identifier,
    patch: {
      nli_manifest_url: manifestUrl,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      image_identifier: primary.identifier,
      image_attribution: attribution,
      image_license_url: licenseUrl,
    },
  };
}

async function main() {
  const ALL = process.argv.includes('--all');
  const DRY_RUN = process.argv.includes('--dry-run');

  const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let query = supabase
    .from(TABLE)
    .select('id, nli_doc_id, nli_title, image_url')
    .not('nli_doc_id', 'is', null)
    .order('id');
  if (!ALL) query = query.is('image_url', null);

  const { data: rows, error } = await query;
  if (error) throw new Error(`could not read ${TABLE}: ${error.message}`);

  log(`${rows.length} row${rows.length === 1 ? '' : 's'} to resolve${ALL ? ' (--all)' : ''}`);

  let resolved = 0;
  const problems = [];

  for (const row of rows) {
    const result = await resolveRow(row);
    const label = `#${row.id} ${row.nli_title || row.nli_doc_id}`;

    if (result.skip) {
      problems.push(`${label}: ${result.skip}${result.detail ? ` (${result.detail})` : ''}`);
      log(`  ${label} — ${result.skip}`);
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    if (result.identifierMissing) {
      problems.push(`${label}: unexpected-identifier (service base is not an FL id, identifier left null)`);
    }
    if (result.extraImages > 0) {
      log(`  ${label} — manifest has ${result.extraImages} further canvas image(s); storing the first`);
    }

    if (DRY_RUN) {
      log(`  ${label} → ${result.patch.image_url} (dry run)`);
      resolved += 1;
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const { error: writeError } = await supabase.from(TABLE).update(result.patch).eq('id', row.id);
    if (writeError) {
      problems.push(`${label}: save failed (${writeError.message})`);
    } else {
      log(`  ${label} → ${result.patch.image_identifier || 'image'}`);
      resolved += 1;
    }

    await sleep(RATE_LIMIT_MS);
  }

  log(`${resolved} resolved${DRY_RUN ? ' (dry run — nothing saved)' : ''}`);
  if (problems.length) {
    log(`${problems.length} need attention:`);
    for (const problem of problems) log(`  · ${problem}`);
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error('[nli-images] failed:', err.message);
    process.exitCode = 1;
  });
}
