/**
 * Tests for the NLI IIIF resolver.
 *
 * The invariants worth pinning down are the ones that would quietly corrupt the
 * evidence table: an FL identifier must only ever come from what NLI returned, and a
 * URL that answers 403 or 404 must never be stored as if it were a working image.
 *
 *   npm run test:nli
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildImageUrls,
  identifierFromServiceBase,
  imagesFromManifest,
  manifestUrlForDocId,
  resolveRow,
  rightsFromManifest,
  serviceBaseFromResource,
} from './resolve-nli-images.mjs';

const DOC_ID = 'NNL_EPHEMERA997000969550405171';
const SERVICE = 'https://iiif.nli.org.il/IIIFv21/FL58252370';

/** A IIIF Presentation 2 manifest shaped the way NLI serves one. */
function manifest({ canvases = 1, service = true, attribution, license } = {}) {
  return {
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    '@id': manifestUrlForDocId(DOC_ID),
    ...(attribution === undefined ? {} : { attribution }),
    ...(license === undefined ? {} : { license }),
    sequences: [
      {
        canvases: Array.from({ length: canvases }, (_, i) => ({
          '@id': `${SERVICE}/canvas/${i}`,
          label: `${i + 1}`,
          images: [
            {
              resource: {
                '@id': `https://iiif.nli.org.il/IIIFv21/FL5825237${i}/full/full/0/default.jpg`,
                ...(service ? { service: { '@id': `https://iiif.nli.org.il/IIIFv21/FL5825237${i}` } } : {}),
              },
            },
          ],
        })),
      },
    ],
  };
}

test('manifest URL is built from the DOCID', () => {
  assert.equal(
    manifestUrlForDocId(DOC_ID),
    'https://iiif.nli.org.il/IIIFv21/DOCID/NNL_EPHEMERA997000969550405171/manifest'
  );
});

test('the image service block is authoritative for the service base', () => {
  const resource = {
    '@id': 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/full/0/default.jpg',
    service: { '@id': SERVICE },
  };
  assert.equal(serviceBaseFromResource(resource), SERVICE);
});

test('a resource @id with no service falls back to stripping the IIIF tail', () => {
  const resource = { '@id': `${SERVICE}/full/full/0/default.jpg` };
  assert.equal(serviceBaseFromResource(resource), SERVICE);
});

test('a non-IIIF resource @id yields no service base', () => {
  assert.equal(serviceBaseFromResource({ '@id': 'https://example.org/poster.jpg' }), null);
  assert.equal(serviceBaseFromResource(null), null);
});

test('only a real FL identifier is accepted', () => {
  assert.equal(identifierFromServiceBase(SERVICE), 'FL58252370');
  // An IE id, a DOCID or a system number must never be mistaken for one.
  assert.equal(identifierFromServiceBase('https://iiif.nli.org.il/IIIFv21/IE4991542'), null);
  assert.equal(identifierFromServiceBase(`https://iiif.nli.org.il/IIIFv21/${DOC_ID}`), null);
  assert.equal(identifierFromServiceBase(null), null);
});

test('image URLs are canonical IIIF requests, full size and bounded thumbnail', () => {
  assert.deepEqual(buildImageUrls(SERVICE), {
    imageUrl: 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/max/0/default.jpg',
    thumbnailUrl: 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/400,/0/default.jpg',
  });
  // A trailing slash on the service base must not double up.
  assert.equal(buildImageUrls(`${SERVICE}/`).imageUrl, buildImageUrls(SERVICE).imageUrl);
});

test('every canvas image is returned, not just the first', () => {
  const images = imagesFromManifest(manifest({ canvases: 3 }));
  assert.equal(images.length, 3);
  assert.deepEqual(images.map((i) => i.identifier), ['FL58252370', 'FL58252371', 'FL58252372']);
  assert.deepEqual(images.map((i) => i.canvasLabel), ['1', '2', '3']);
});

test('a manifest with no sequences yields no images rather than throwing', () => {
  assert.deepEqual(imagesFromManifest({}), []);
  assert.deepEqual(imagesFromManifest(null), []);
});

test('attribution and license are read in each shape IIIF v2 allows', () => {
  assert.deepEqual(rightsFromManifest(manifest({ attribution: 'NLI', license: 'https://rights/1' })), {
    attribution: 'NLI',
    licenseUrl: 'https://rights/1',
  });
  assert.deepEqual(
    rightsFromManifest(manifest({ attribution: [{ '@value': 'NLI' }], license: ['https://rights/2'] })),
    { attribution: 'NLI', licenseUrl: 'https://rights/2' }
  );
  assert.deepEqual(rightsFromManifest(manifest()), { attribution: null, licenseUrl: null });
});

test('a resolved row stores IIIF URLs built only from the service base', async () => {
  const result = await resolveRow(
    { id: 1, nli_doc_id: DOC_ID },
    {
      fetchManifest: async () => manifest({ attribution: 'The National Library of Israel', license: 'https://rights' }),
      verifyImageUrl: async () => ({ ok: true, status: 206 }),
    }
  );

  assert.equal(result.skip, undefined);
  assert.deepEqual(result.patch, {
    nli_manifest_url: manifestUrlForDocId(DOC_ID),
    image_url: 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/max/0/default.jpg',
    thumbnail_url: 'https://iiif.nli.org.il/IIIFv21/FL58252370/full/400,/0/default.jpg',
    image_identifier: 'FL58252370',
    image_attribution: 'The National Library of Israel',
    image_license_url: 'https://rights',
  });
  // The DOCID is a manifest lookup key, never part of an image URL.
  assert.ok(!result.patch.image_url.includes(DOC_ID));
});

test('a rights-restricted image is reported and never written', async () => {
  const result = await resolveRow(
    { id: 1, nli_doc_id: DOC_ID },
    { fetchManifest: async () => manifest(), verifyImageUrl: async () => ({ ok: false, status: 403 }) }
  );
  assert.equal(result.skip, 'rights-restricted');
  assert.equal(result.patch, undefined);
});

test('a 404 image is reported and never written', async () => {
  const result = await resolveRow(
    { id: 1, nli_doc_id: DOC_ID },
    { fetchManifest: async () => manifest(), verifyImageUrl: async () => ({ ok: false, status: 404 }) }
  );
  assert.equal(result.skip, 'image-unavailable');
  assert.equal(result.patch, undefined);
});

test('an unavailable manifest is reported, not guessed around', async () => {
  const result = await resolveRow(
    { id: 1, nli_doc_id: DOC_ID },
    {
      fetchManifest: async () => { const e = new Error('HTTP 404'); e.status = 404; throw e; },
      verifyImageUrl: async () => { throw new Error('must not be reached'); },
    }
  );
  assert.equal(result.skip, 'manifest-unavailable');
  assert.equal(result.detail, 'HTTP 404');
});

test('a manifest with no image resource and a shapeless one are told apart', async () => {
  const empty = await resolveRow(
    { id: 1, nli_doc_id: DOC_ID },
    { fetchManifest: async () => ({ sequences: [{ canvases: [] }] }), verifyImageUrl: async () => ({ ok: true }) }
  );
  assert.equal(empty.skip, 'no-image-resource');

  const shapeless = await resolveRow(
    { id: 1, nli_doc_id: DOC_ID },
    { fetchManifest: async () => ({ items: [] }), verifyImageUrl: async () => ({ ok: true }) }
  );
  assert.equal(shapeless.skip, 'unexpected-manifest');
});

test('a row with no DOCID is skipped without any network call', async () => {
  const result = await resolveRow(
    { id: 1, nli_doc_id: null },
    { fetchManifest: async () => { throw new Error('must not be reached'); } }
  );
  assert.equal(result.skip, 'no-docid');
});

test('a service base that is not an FL id still resolves but flags the identifier', async () => {
  const odd = {
    sequences: [{ canvases: [{ images: [{ resource: { service: { '@id': 'https://iiif.nli.org.il/IIIFv21/XX99' } } }] }] }],
  };
  const result = await resolveRow(
    { id: 1, nli_doc_id: DOC_ID },
    { fetchManifest: async () => odd, verifyImageUrl: async () => ({ ok: true, status: 200 }) }
  );
  assert.equal(result.identifierMissing, true);
  assert.equal(result.patch.image_identifier, null);
});
