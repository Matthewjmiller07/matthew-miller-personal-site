#!/usr/bin/env node
/**
 * Fill in the poster images on tanakh_nli_poster_evidence from NLI.
 *
 * The evidence rows arrive with an NLI DOCID and a catalogue link but no picture.
 * Getting from a DOCID to an image means discovering the file identifier NLI
 * assigns it — an "FL" id such as FL58252370 — which is never derivable from the
 * DOCID, the IE id, the system number or the catalogue URL. It has to come back
 * from NLI. This script asks, in order:
 *
 *   1. The IIIF Presentation manifest at /IIIFv21/DOCID/{docid}/manifest, which
 *      carries the image service base per canvas. This is the canonical route.
 *   2. The NLI Open Library API, if NLI_API_KEY is set — same information,
 *      and the only route that works from a server (see below).
 *   3. The catalogue page at nli_url, scraped for an iiif service base, an FL id,
 *      or a Rosetta IE id used by the viewer.
 *
 * A note on where this can run. NLI puts its manifest and catalogue hosts behind a
 * Cloudflare managed challenge that refuses datacenter IPs, so steps 1 and 3 only
 * work from an ordinary connection — a laptop on home or office wifi. Verified from
 * two datacenters (a sandbox and a pg_net call out of Supabase itself): both got
 * "Checking your browser..." instead of a manifest. The image hosts are open to
 * everyone, so validation below always works wherever this runs, and step 2 works
 * from anywhere once a key is set. Run it from your own machine and it just works.
 *
 * Nothing is written until the URL has been fetched and confirmed to be an image,
 * so a 403 or an HTML error page can never land in the table looking like a poster.
 *
 * Idempotent: it only ever UPDATEs existing rows by primary key — it never inserts,
 * so re-running cannot duplicate evidence. Rows holding a validated canonical IIIF
 * image are skipped unless --force, and a weaker fallback never replaces a better
 * image that is already there.
 *
 * Needs, in .env or the environment:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (writes bypass RLS, so this must stay server-side)
 *   NLI_API_KEY                 (optional; free from https://api.nli.org.il)
 *
 * Usage:
 *   node scripts/resolve-nli-images.mjs             # rows missing image data
 *   node scripts/resolve-nli-images.mjs --dry-run   # print updates, write nothing
 *   node scripts/resolve-nli-images.mjs --force     # recheck rows already resolved
 *   node scripts/resolve-nli-images.mjs --id 12     # one row, for debugging
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// The identifier and validation rules live in src/lib/nli.js, shared with the
// on-demand endpoint at src/pages/api/nli-resolve.js so the two cannot drift.
import {
  IIIF_HOST,
  ROSETTA_THUMB,
  buildImageUrls,
  discoverViaNliApi,
  identifierFromServiceBase,
  identifiersFromText,
  imagesFromManifest,
  manifestUrlForDocId,
  rightsFromManifest,
  verifyImageUrl,
} from '../src/lib/nli.js';

export {
  buildImageUrls,
  identifierFromServiceBase,
  identifiersFromText,
  imagesFromManifest,
  manifestUrlForDocId,
  rightsFromManifest,
  serviceBaseFromResource,
  verifyImageUrl,
} from '../src/lib/nli.js';

const TABLE = 'tanakh_nli_poster_evidence';

const USER_AGENT =
  process.env.NLI_CONTACT_AGENT ||
  'matthewjamesmiller.com tanakh-nli-evidence (https://matthewjamesmiller.com)';

const REQUEST_TIMEOUT_MS = 30_000;
/** NLI is a public institution's API; don't hammer it. */
const RATE_LIMIT_MS = 600;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Network ─────────────────────────────────────────────────────────────────

async function httpGet(url, accept) {
  const res = await fetch(url, {
    headers: { Accept: accept, 'User-Agent': USER_AGENT },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

const getJson = async (url) => (await httpGet(url, 'application/json')).json();
const getText = async (url) => (await httpGet(url, 'text/html')).text();

// ── Discovery ───────────────────────────────────────────────────────────────

/** One row's worth of work, network included. Returns what to write, or why not. */
export async function resolveRow(row, deps = {}) {
  const fetchJson = deps.fetchJson || getJson;
  const fetchHtml = deps.fetchHtml || getText;
  const verify = deps.verifyImageUrl || ((url) => verifyImageUrl(url, { userAgent: USER_AGENT, timeoutMs: REQUEST_TIMEOUT_MS }));
  const steps = { manifest: null, api: null, page: null };

  if (!row.nli_doc_id) return { skip: 'no-docid', steps };

  const manifestUrl = row.nli_manifest_url || manifestUrlForDocId(row.nli_doc_id);

  let serviceBase = null;
  let imageCount = 0;
  let rights = { attribution: null, licenseUrl: null };
  let via = null;
  let ieId = null;

  // 1 — the canonical IIIF manifest
  try {
    const manifest = await fetchJson(manifestUrl);
    const images = imagesFromManifest(manifest);
    imageCount = images.length;
    if (images.length) {
      serviceBase = images[0].serviceBase;
      rights = rightsFromManifest(manifest);
      via = 'iiif';
      steps.manifest = 'ok';
    } else {
      steps.manifest = Array.isArray(manifest?.sequences) ? 'no-image-resource' : 'unexpected-shape';
    }
  } catch (err) {
    steps.manifest = `failed (${err.status ? `HTTP ${err.status}` : err.message})`;
  }

  // 2 — the Open Library API
  if (!serviceBase) {
    const fromApi = await discoverViaNliApi(row.nli_doc_id, { apiKey: process.env.NLI_API_KEY });
    steps.api = process.env.NLI_API_KEY ? (fromApi ? 'ok' : 'no match') : 'skipped (no NLI_API_KEY)';
    if (fromApi) { serviceBase = fromApi.serviceBase; imageCount = imageCount || 1; via = 'api'; ieId = ieId || fromApi.ieId; }
  }

  // 3 — the catalogue page the viewer itself loads
  if (!serviceBase && row.nli_url) {
    try {
      const found = identifiersFromText(await fetchHtml(row.nli_url));
      ieId = ieId || found.ieId;
      if (found.serviceBase) { serviceBase = found.serviceBase; imageCount = imageCount || 1; via = 'page'; steps.page = 'ok'; }
      else steps.page = found.ieId ? `only a Rosetta id (${found.ieId})` : 'no identifier found';
    } catch (err) {
      steps.page = `failed (${err.status ? `HTTP ${err.status}` : err.message})`;
    }
  }

  // A validated IIIF image is the goal.
  if (serviceBase) {
    const { imageUrl, thumbnailUrl } = buildImageUrls(serviceBase);
    const fullCheck = await verify(imageUrl);
    if (fullCheck.ok) {
      const thumbCheck = await verify(thumbnailUrl);
      return {
        via,
        steps,
        manifestUrl,
        imageCount,
        identifier: identifierFromServiceBase(serviceBase),
        validated: { image: fullCheck, thumbnail: thumbCheck },
        patch: {
          nli_manifest_url: manifestUrl,
          image_url: imageUrl,
          thumbnail_url: thumbCheck.ok ? thumbnailUrl : null,
          image_identifier: identifierFromServiceBase(serviceBase),
          image_attribution: rights.attribution,
          image_license_url: rights.licenseUrl,
        },
      };
    }
    steps.image = fullCheck.status === 403 ? 'rights-restricted' : `unavailable (${fullCheck.status || fullCheck.error})`;
  }

  // Rosetta thumbnail — a real image, but only a thumbnail, and never an invented FL.
  if (ieId) {
    const rosettaUrl = `${ROSETTA_THUMB}${encodeURIComponent(ieId)}`;
    const check = await verify(rosettaUrl);
    if (check.ok) {
      return {
        via: 'rosetta',
        steps,
        manifestUrl,
        imageCount: imageCount || 1,
        identifier: ieId,
        thumbnailOnly: true,
        validated: { thumbnail: check },
        patch: { nli_manifest_url: manifestUrl, thumbnail_url: rosettaUrl, image_identifier: ieId },
      };
    }
  }

  // Nothing usable, but the manifest URL itself is still worth recording.
  return {
    skip: 'unresolved',
    steps,
    manifestUrl,
    patch: row.nli_manifest_url ? null : { nli_manifest_url: manifestUrl },
  };
}

/**
 * Never blank out something good. Only fields that are currently empty are filled,
 * unless --force, and even then a null discovery never overwrites a stored value.
 */
export function mergePatch(row, patch, { force = false } = {}) {
  const merged = {};
  for (const [field, value] of Object.entries(patch || {})) {
    if (value === null || value === undefined) continue;
    const current = row[field];
    if (current === value) continue;
    if (current !== null && current !== undefined && current !== '' && !force) continue;
    merged[field] = value;
  }
  return merged;
}

/** A row is complete when it holds a canonical IIIF image with its identifier. */
export function isComplete(row) {
  return Boolean(
    row.image_url && row.thumbnail_url && row.image_identifier &&
    String(row.image_url).includes(IIIF_HOST)
  );
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const idFlag = argv.indexOf('--id');
  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    onlyId: idFlag >= 0 && argv[idFlag + 1] ? Number(argv[idFlag + 1]) : null,
  };
}

async function main() {
  const { dryRun, force, onlyId } = parseArgs(process.argv);

  const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let query = supabase.from(TABLE).select('*').not('nli_doc_id', 'is', null).order('id');
  if (onlyId) query = query.eq('id', onlyId);

  const { data: rows, error } = await query;
  if (error) throw new Error(`could not read ${TABLE}: ${error.message}`);

  const stats = { checked: 0, complete: 0, iiif: 0, fallback: 0, unresolved: 0, updated: 0 };
  const multi = [];
  const unresolved = [];

  for (const row of rows) {
    stats.checked += 1;
    const label = `[${row.id}] ${row.nli_title || row.nli_doc_id}`;

    if (isComplete(row) && !force) {
      stats.complete += 1;
      console.log(`${label}\n  already complete: ${row.image_identifier}`);
      continue;
    }

    const result = await resolveRow(row);
    console.log(label);
    console.log(`  DOCID: ${row.nli_doc_id}`);
    console.log(`  manifest: ${result.steps?.manifest ?? '\u2713'}`);
    if (result.steps?.api) console.log(`  NLI API: ${result.steps.api}`);
    if (result.steps?.page) console.log(`  NLI page fallback: ${result.steps.page}`);

    if (result.skip) {
      stats.unresolved += 1;
      unresolved.push(`${label} — ${Object.entries(result.steps || {}).map(([k, v]) => `${k}: ${v}`).join('; ')}`);
      console.log('  image: unresolved');
    } else {
      if (result.imageCount > 1) multi.push(`${label} — ${result.imageCount} canvases`);
      console.log(`  identifier: ${result.identifier || '(none returned)'}`);
      console.log(`  images in manifest: ${result.imageCount}`);
      console.log(`  image: ${result.thumbnailOnly ? 'thumbnail only (' + result.via + ')' : '\u2713 ' + result.validated.image.contentType}`);
      console.log(`  thumbnail: ${result.validated.thumbnail?.ok ? '\u2713' : 'unavailable'}`);
      if (result.via === 'iiif' || result.via === 'api') stats.iiif += 1; else stats.fallback += 1;
    }

    const merged = mergePatch(row, result.patch, { force });
    if (!Object.keys(merged).length) {
      console.log('  Supabase: unchanged');
    } else if (dryRun) {
      console.log(`  Supabase: would update ${JSON.stringify(merged)}`);
    } else {
      const { error: writeError } = await supabase.from(TABLE).update(merged).eq('id', row.id);
      if (writeError) {
        console.log(`  Supabase: FAILED (${writeError.message})`);
        unresolved.push(`${label} — save failed: ${writeError.message}`);
      } else {
        stats.updated += 1;
        console.log(`  Supabase: updated (${Object.keys(merged).join(', ')})`);
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log('\nNLI IMAGE RESOLUTION');
  console.log('--------------------');
  console.log(`Records checked:        ${stats.checked}`);
  console.log(`Already complete:       ${stats.complete}`);
  console.log(`Resolved via IIIF:      ${stats.iiif}`);
  console.log(`Resolved via fallback:  ${stats.fallback}`);
  console.log(`Unresolved:             ${stats.unresolved}`);
  console.log(`Database rows updated:  ${stats.updated}${dryRun ? ' (dry run — nothing written)' : ''}`);

  if (multi.length) {
    console.log(`\nMultiple images (${multi.length}):`);
    for (const m of multi) console.log(`  · ${m}`);
  }
  if (unresolved.length) {
    console.log(`\nUnresolved (${unresolved.length}):`);
    for (const u of unresolved) console.log(`  · ${u}`);
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error('[nli-images] failed:', err.message);
    process.exitCode = 1;
  });
}
