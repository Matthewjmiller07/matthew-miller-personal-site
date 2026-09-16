/**
 * Tests for the NLI image resolver.
 *
 * The invariants worth pinning down are the ones that would quietly corrupt the
 * evidence table: an FL identifier must only ever come from what NLI returned, a
 * URL that isn't a real image must never be stored, and a second run must not
 * undo or downgrade a good row.
 *
 *   npm run test:nli
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildImageUrls,
  identifierFromServiceBase,
  identifiersFromText,
  imagesFromManifest,
  isComplete,
  manifestUrlForDocId,
  mergePatch,
  resolveRow,
  rightsFromManifest,
  serviceBaseFromResource,
} from './resolve-nli-images.mjs';

const DOC_ID = 'NNL_EPHEMERA997000969550405171';
const SERVICE = 'https://iiif.nli.org.il/IIIFv21/FL58252370';
const okImage = async () => ({ ok: true, status: 206, contentType: 'image/jpeg' });

/** A IIIF Presentation 2 manifest shaped the way NLI serves one. */
function manifest({ canvases = 1, service = true, attribution, license } = {}) {
  return {
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    ...(attribution === undefined ? {} : { attribution }),
    ...(license === undefined ? {} : { license }),
    sequences: [{
      canvases: Array.from({ length: canvases }, (_, i) => ({
        label: `${i + 1}`,
        images: [{
          resource: {
            '@id': `https://iiif.nli.org.il/IIIFv21/FL5825237${i}/full/full/0/default.jpg`,
            ...(service ? { service: { '@id': `https://iiif.nli.org.il/IIIFv21/FL5825237${i}` } } : {}),
          },
        }],
      })),
    }],
  };
}

test('manifest URL is built from the DOCID', () => {
  assert.equal(manifestUrlForDocId(DOC_ID),
    'https://iiif.nli.org.il/IIIFv21/DOCID/NNL_EPHEMERA997000969550405171/manifest');
});

test('the image service block is authoritative for the service base', () => {
  assert.equal(serviceBaseFromResource({
    '@id': `${SERVICE}/full/full/0/default.jpg`, service: { '@id': SERVICE },
  }), SERVICE);
});

test('a resource @id with no service falls back to stripping the IIIF tail', () => {
  assert.equal(serviceBaseFromResource({ '@id': `${SERVICE}/full/full/0/default.jpg` }), SERVICE);
});

test('a non-IIIF resource yields no service base', () => {
  assert.equal(serviceBaseFromResource({ '@id': 'https://example.org/poster.jpg' }), null);
  assert.equal(serviceBaseFromResource(null), null);
});

test('only a real FL identifier is accepted', () => {
  assert.equal(identifierFromServiceBase(SERVICE), 'FL58252370');
  // An IE id, a DOCID or a system number must never be mistaken for one.
  assert.equal(identifierFromServiceBase('https://iiif.nli.org.il/IIIFv21/IE4991542'), null);
  assert.equal(identifierFromServiceBase(`https://iiif.nli.org.il/IIIFv21/${DOC_ID}`), null);
  assert.equal(identifierFromServiceBase('https://iiif.nli.org.il/IIIFv21/987007605898805171'), null);
});

test('image URLs are canonical IIIF requests, full size and bounded thumbnail', () => {
  assert.deepEqual(buildImageUrls(SERVICE), {
    imageUrl: 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/max/0/default.jpg',
    thumbnailUrl: 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/400,/0/default.jpg',
  });
  assert.equal(buildImageUrls(`${SERVICE}/`).imageUrl, buildImageUrls(SERVICE).imageUrl);
});

test('every canvas is returned, not just the first', () => {
  const images = imagesFromManifest(manifest({ canvases: 3 }));
  assert.equal(images.length, 3);
  assert.deepEqual(images.map((i) => i.identifier), ['FL58252370', 'FL58252371', 'FL58252372']);
});

test('a manifest with no sequences yields no images rather than throwing', () => {
  assert.deepEqual(imagesFromManifest({}), []);
  assert.deepEqual(imagesFromManifest(null), []);
});

test('attribution and license are read in each shape IIIF v2 allows', () => {
  assert.deepEqual(rightsFromManifest(manifest({ attribution: 'NLI', license: 'https://r/1' })),
    { attribution: 'NLI', licenseUrl: 'https://r/1' });
  assert.deepEqual(rightsFromManifest(manifest({ attribution: [{ '@value': 'NLI' }], license: ['https://r/2'] })),
    { attribution: 'NLI', licenseUrl: 'https://r/2' });
  assert.deepEqual(rightsFromManifest(manifest()), { attribution: null, licenseUrl: null });
});

test('catalogue HTML yields an FL service base, or an IE but never a made-up FL', () => {
  assert.equal(identifiersFromText('<img src="https://iiif.nli.org.il/IIIFv21/FL123456/full/max/0/default.jpg">').flId, 'FL123456');
  const ieOnly = identifiersFromText('<img src="...DeliveryManagerServlet?dps_func=thumbnail&dps_pid=IE4991542">');
  assert.equal(ieOnly.ieId, 'IE4991542');
  assert.equal(ieOnly.flId, null, 'an IE must never be turned into an FL');
  assert.equal(ieOnly.serviceBase, null);
});

test('a resolved row stores IIIF URLs built only from the service base', async () => {
  const result = await resolveRow({ id: 1, nli_doc_id: DOC_ID }, {
    fetchJson: async () => manifest({ attribution: 'The National Library of Israel', license: 'https://rights' }),
    verifyImageUrl: okImage,
  });
  assert.equal(result.skip, undefined);
  assert.equal(result.via, 'iiif');
  assert.deepEqual(result.patch, {
    nli_manifest_url: manifestUrlForDocId(DOC_ID),
    image_url: 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/max/0/default.jpg',
    thumbnail_url: 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/400,/0/default.jpg',
    image_identifier: 'FL58252370',
    image_attribution: 'The National Library of Israel',
    image_license_url: 'https://rights',
  });
  assert.ok(!result.patch.image_url.includes(DOC_ID), 'the DOCID is a lookup key, never part of an image URL');
});

test('an existing nli_manifest_url is reused rather than reconstructed', async () => {
  const stored = 'https://iiif.nli.org.il/IIIFv21/DOCID/CUSTOM/manifest';
  let asked = null;
  await resolveRow({ id: 1, nli_doc_id: DOC_ID, nli_manifest_url: stored }, {
    fetchJson: async (u) => { asked = u; return manifest(); },
    verifyImageUrl: okImage,
  });
  assert.equal(asked, stored);
});

test('a rights-restricted or missing image is never written', async () => {
  for (const status of [403, 404]) {
    const result = await resolveRow({ id: 1, nli_doc_id: DOC_ID }, {
      fetchJson: async () => manifest(),
      fetchHtml: async () => '',
      verifyImageUrl: async () => ({ ok: false, status }),
    });
    assert.equal(result.skip, 'unresolved');
    assert.equal(result.patch?.image_url, undefined);
  }
});

test('a challenge page served as 200 HTML is not mistaken for an image', async () => {
  const result = await resolveRow({ id: 1, nli_doc_id: DOC_ID }, {
    fetchJson: async () => manifest(),
    fetchHtml: async () => '',
    verifyImageUrl: async () => ({ ok: false, status: 200, contentType: 'text/html' }),
  });
  assert.equal(result.skip, 'unresolved');
});

test('a blocked manifest falls through to the catalogue page', async () => {
  const result = await resolveRow({ id: 1, nli_doc_id: DOC_ID, nli_url: 'https://www.nli.org.il/x' }, {
    fetchJson: async () => { const e = new Error('HTTP 403'); e.status = 403; throw e; },
    fetchHtml: async () => '<img src="https://iiif.nli.org.il/IIIFv21/FL999888/full/max/0/default.jpg">',
    verifyImageUrl: okImage,
  });
  assert.equal(result.via, 'page');
  assert.equal(result.patch.image_identifier, 'FL999888');
  assert.match(result.steps.manifest, /failed/);
});

test('an IE-only page yields a validated Rosetta thumbnail and no invented FL', async () => {
  const result = await resolveRow({ id: 1, nli_doc_id: DOC_ID, nli_url: 'https://www.nli.org.il/x' }, {
    fetchJson: async () => { throw new Error('blocked'); },
    fetchHtml: async () => '<img src="DeliveryManagerServlet?dps_func=thumbnail&dps_pid=IE4991542">',
    verifyImageUrl: async (u) => (u.includes('rosetta') ? { ok: true, status: 200, contentType: 'image/png' } : { ok: false, status: 404 }),
  });
  assert.equal(result.via, 'rosetta');
  assert.equal(result.thumbnailOnly, true);
  assert.equal(result.patch.image_identifier, 'IE4991542');
  assert.equal(result.patch.image_url, undefined, 'a thumbnail is not a full image');
});

test('a row with no DOCID is skipped without any network call', async () => {
  const result = await resolveRow({ id: 1, nli_doc_id: null },
    { fetchJson: async () => { throw new Error('must not be reached'); } });
  assert.equal(result.skip, 'no-docid');
});

// ── idempotency ─────────────────────────────────────────────────────────────

test('a complete row is recognised so a second run skips it', () => {
  assert.equal(isComplete({ image_url: `${SERVICE}/full/max/0/default.jpg`,
    thumbnail_url: `${SERVICE}/full/400,/0/default.jpg`, image_identifier: 'FL58252370' }), true);
  assert.equal(isComplete({ image_url: null, thumbnail_url: 'x', image_identifier: 'IE1' }), false);
  // A Rosetta-only row is not complete — it still deserves a real IIIF image.
  assert.equal(isComplete({ image_url: null,
    thumbnail_url: 'https://rosetta.nli.org.il/...', image_identifier: 'IE4991542' }), false);
});

test('a second run proposes no changes', () => {
  const row = { image_url: 'A', thumbnail_url: 'B', image_identifier: 'C', image_attribution: 'D' };
  const patch = { image_url: 'A', thumbnail_url: 'B', image_identifier: 'C', image_attribution: 'D' };
  assert.deepEqual(mergePatch(row, patch), {});
});

test('good existing metadata is never overwritten or nulled', () => {
  const row = { image_attribution: 'עיריית תל אביב', thumbnail_url: 'https://rosetta.nli.org.il/x', image_url: null };
  const patch = { image_attribution: null, thumbnail_url: 'https://iiif/new', image_url: 'https://iiif/full' };
  const merged = mergePatch(row, patch);
  assert.equal('image_attribution' in merged, false, 'null must not clobber a real attribution');
  assert.equal('thumbnail_url' in merged, false, 'an existing thumbnail is left alone without --force');
  assert.equal(merged.image_url, 'https://iiif/full', 'an empty field is filled');
});

test('--force does replace an existing value, but still never with null', () => {
  const row = { image_url: 'old', image_attribution: 'keep me' };
  const merged = mergePatch(row, { image_url: 'new', image_attribution: null }, { force: true });
  assert.equal(merged.image_url, 'new');
  assert.equal('image_attribution' in merged, false);
});
