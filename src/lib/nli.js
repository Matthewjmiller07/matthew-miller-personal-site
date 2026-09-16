/**
 * Shared NLI image-resolution helpers.
 *
 * Used by both scripts/resolve-nli-images.mjs (the batch resolver) and
 * src/pages/api/nli-resolve.js (the on-demand endpoint), so the rules about what
 * counts as a real identifier and a real image are written once.
 *
 * The one rule everything here exists to protect: an FL identifier is only ever
 * one NLI actually returned. It is never derived from a DOCID, an IE id, a system
 * number or a catalogue URL — there is no relationship between them to derive.
 */

export const IIIF_HOST = 'iiif.nli.org.il';
export const IIIF_BASE = `https://${IIIF_HOST}/IIIFv21`;
export const ROSETTA_THUMB =
  'https://rosetta.nli.org.il/delivery/DeliveryManagerServlet?dps_func=thumbnail&dps_pid=';

/** Bounded size for an in-page thumbnail; the full image is only opened on demand. */
export const THUMBNAIL_SIZE = '400,';
export const FULL_SIZE = 'max';

/** Only this shape is ever accepted as a service base, from any source. */
export const SERVICE_BASE_RE = /^https:\/\/iiif\.nli\.org\.il\/IIIFv21\/(FL\d+)$/;

export function manifestUrlForDocId(docId) {
  return `${IIIF_BASE}/DOCID/${encodeURIComponent(docId)}/manifest`;
}

export function buildImageUrls(serviceBase) {
  const base = String(serviceBase).replace(/\/+$/, '');
  return {
    imageUrl: `${base}/full/${FULL_SIZE}/0/default.jpg`,
    thumbnailUrl: `${base}/full/${THUMBNAIL_SIZE}/0/default.jpg`,
  };
}

/**
 * IIIF Image API URLs end in {region}/{size}/{rotation}/{quality}.{format}. Strip
 * those four segments off a resource's @id to recover the service base — reading
 * back what NLI returned rather than inventing anything.
 */
function serviceBaseFromResourceId(resourceId) {
  if (typeof resourceId !== 'string' || !resourceId) return null;
  const parts = resourceId.split(/[?#]/)[0].split('/');
  if (parts.length < 5) return null;
  if (!/\.[a-z]+$/i.test(parts[parts.length - 1])) return null;
  return parts.slice(0, -4).join('/') || null;
}

/** The service block is authoritative; the resource @id is the fallback. */
export function serviceBaseFromResource(resource) {
  if (!resource || typeof resource !== 'object') return null;
  const services = Array.isArray(resource.service) ? resource.service : [resource.service];
  for (const service of services) {
    const id = service && typeof service === 'object' ? service['@id'] || service.id : null;
    if (typeof id === 'string' && id) return id.replace(/\/+$/, '');
  }
  return serviceBaseFromResourceId(resource['@id'] || resource.id);
}

export function identifierFromServiceBase(serviceBase) {
  if (!serviceBase) return null;
  const last = String(serviceBase).split('/').filter(Boolean).pop() || '';
  return /^FL\d+$/i.test(last) ? last : null;
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

/** Every image resource in the manifest, in order — multi-canvas objects included. */
export function imagesFromManifest(manifest) {
  const found = [];
  for (const sequence of Array.isArray(manifest?.sequences) ? manifest.sequences : []) {
    for (const canvas of Array.isArray(sequence?.canvases) ? sequence.canvases : []) {
      for (const image of Array.isArray(canvas?.images) ? canvas.images : []) {
        const serviceBase = serviceBaseFromResource(image?.resource);
        if (!serviceBase) continue;
        found.push({
          serviceBase,
          identifier: identifierFromServiceBase(serviceBase),
          canvasLabel: firstValue(canvas?.label),
        });
      }
    }
  }
  return found;
}

/**
 * Pull identifiers out of any blob of text — a catalogue page or an API payload.
 * An FL wins; an IE only ever yields a Rosetta thumbnail, never a manufactured FL.
 */
export function identifiersFromText(text) {
  const body = String(text || '');
  const service = body.match(/https?:\/\/iiif\.nli\.org\.il\/IIIFv21\/(FL\d+)/i);
  const bareFl = body.match(/\bFL\d{5,}\b/);
  const ie = body.match(/\bIE\d{4,}\b/);
  const flId = service ? service[1] : bareFl ? bareFl[0] : null;
  return { serviceBase: flId ? `${IIIF_BASE}/${flId}` : null, flId, ieId: ie ? ie[0] : null };
}

/**
 * Confirm a URL really serves an image. A rights-restricted item answers 403, a bad
 * identifier 404, and a Cloudflare challenge answers 200 with HTML — none may be
 * stored. HEAD is unreliable on these hosts, so this GETs a single byte.
 */
export async function verifyImageUrl(url, { fetchImpl = fetch, timeoutMs = 20_000, userAgent } = {}) {
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'image/*',
        Range: 'bytes=0-0',
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.startsWith('image/')) return { ok: false, status: res.status, contentType: type || '(none)' };
    return { ok: true, status: res.status, contentType: type };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Ask the NLI Open Library API which file a DOCID holds.
 *
 * This is the only discovery route that works from a server, and it takes two hops.
 * NLI blocks /IIIFv21/DOCID/{docid}/manifest at Cloudflare for datacenter IPs — but
 * only that path. The API record carries a dc:relation pointing at the same manifest
 * addressed by record id instead:
 *
 *   "dc:relation": "https://iiif.nli.org.il/IIIFv21/997002726620405171/manifest"
 *
 * which is NOT blocked. Fetching that gives the FL identifier. The API payload itself
 * contains no FL — only a dc:thumbnail with a Rosetta IE id, which is returned as a
 * fallback and never turned into an FL.
 *
 * Manifests can take 30s+ to build, hence the longer timeout.
 */
export async function discoverViaNliApi(docId, { apiKey, fetchImpl = fetch, timeoutMs = 20_000, manifestTimeoutMs = 60_000 } = {}) {
  if (!apiKey || !docId) return null;

  const searchUrl = 'https://api.nli.org.il/openlibrary/search'
    + `?api_key=${encodeURIComponent(apiKey)}`
    + `&query=any,contains,${encodeURIComponent(docId)}`
    + '&output_format=json';

  let record;
  try {
    const res = await fetchImpl(searchUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    record = await res.text();
  } catch {
    return null;
  }

  // The Rosetta thumbnail is the consolation prize if the manifest hop fails.
  const ieId = (record.match(/\bIE\d{4,}\b/) || [])[0] || null;

  // dc:relation — the manifest addressed by record id, on the unblocked path.
  const manifestUrl = (record.match(/https:\/\/iiif\.nli\.org\.il\/IIIFv21\/\d+\/manifest/) || [])[0] || null;
  if (!manifestUrl) return ieId ? { serviceBase: null, flId: null, ieId, manifestUrl: null } : null;

  try {
    const res = await fetchImpl(manifestUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(manifestTimeoutMs),
    });
    if (res.ok) {
      const manifest = await res.json();
      const images = imagesFromManifest(manifest);
      if (images.length) {
        return {
          serviceBase: images[0].serviceBase,
          flId: images[0].identifier,
          ieId,
          manifestUrl,
          imageCount: images.length,
          rights: rightsFromManifest(manifest),
        };
      }
    }
  } catch { /* fall back to the IE below */ }

  return { serviceBase: null, flId: null, ieId, manifestUrl };
}
