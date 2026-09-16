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
 * Ask the NLI Open Library API which file a DOCID holds. This is the only discovery
 * route that works from a server: NLI puts the IIIF manifest and catalogue hosts
 * behind a Cloudflare managed challenge that refuses datacenter IPs, while the API
 * answers anywhere once a (free) key is supplied. Returns null without a key.
 */
export async function discoverViaNliApi(docId, { apiKey, fetchImpl = fetch, timeoutMs = 20_000 } = {}) {
  if (!apiKey || !docId) return null;
  const url = 'https://api.nli.org.il/openlibrary/search'
    + `?api_key=${encodeURIComponent(apiKey)}`
    + `&query=any,contains,${encodeURIComponent(docId)}`
    + '&output_format=json';
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    // The payload shape varies by record type, so scan it as text for an identifier
    // rather than guessing at a field path.
    const found = identifiersFromText(await res.text());
    return found.serviceBase ? found : null;
  } catch {
    return null;
  }
}
