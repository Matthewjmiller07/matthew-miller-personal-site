import fs from 'fs';
import path from 'path';
import { getPrintifyHeaders, jsonResponse, postersDir, getShopId, fetchJson } from './_utils.js';

async function ensureUploadFromImageName(imageName) {
  const filePath = path.join(postersDir(), imageName);
  if (!fs.existsSync(filePath)) throw new Error(`Image not found: ${imageName}`);
  const base64 = fs.readFileSync(filePath).toString('base64');
  const payload = { file_name: imageName, contents: base64 };
  const upload = await fetchJson('https://api.printify.com/v1/uploads/images.json', {
    method: 'POST',
    headers: getPrintifyHeaders(),
    body: JSON.stringify(payload),
  });
  return upload; // includes id
}

async function getAllVariantIds(blueprintId, printProviderId) {
  const { variants } = await fetchJson(
    `https://api.printify.com/v1/catalog/blueprints/${encodeURIComponent(blueprintId)}/print_providers/${encodeURIComponent(printProviderId)}/variants.json`,
    { headers: getPrintifyHeaders() }
  );
  // Some catalog endpoints return array directly
  const list = Array.isArray(variants) ? variants : (Array.isArray(variants?.data) ? variants.data : variants || []);
  return list.filter(v => v && (v.is_enabled !== false)).map(v => v.id);
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const {
      imageName,
      uploadId,
      blueprint_id,
      print_provider_id,
      variant_ids,
      title,
      description,
      tags,
      publish = false,
    } = body || {};

    if (!uploadId && !imageName) return jsonResponse({ error: 'Provide uploadId or imageName' }, 400);
    if (!blueprint_id || !print_provider_id) return jsonResponse({ error: 'blueprint_id and print_provider_id are required' }, 400);

    const shopId = await getShopId();

    // Ensure upload ID
    const upload = uploadId ? { id: uploadId } : await ensureUploadFromImageName(imageName);

    // Ensure variants
    const variantIds = Array.isArray(variant_ids) && variant_ids.length > 0
      ? variant_ids
      : await getAllVariantIds(blueprint_id, print_provider_id);

    if (!variantIds || variantIds.length === 0) {
      return jsonResponse({ error: 'No variants available for the selected blueprint and provider' }, 400);
    }

    const productPayload = {
      title: title || (imageName ? imageName.replace(/\.[^.]+$/, '') : `Poster ${new Date().toISOString()}`),
      description: description || 'Poster generated via matthewjamesmiller.com',
      tags: Array.isArray(tags) ? tags : ['poster', 'art', 'Sukkah Posters'],
      blueprint_id,
      print_provider_id,
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            {
              position: 'front',
              images: [
                {
                  id: upload.id,
                  x: 0.5,
                  y: 0.5,
                  scale: 1,
                  angle: 0,
                }
              ]
            }
          ]
        }
      ],
    };

    const created = await fetchJson(`https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/products.json`, {
      method: 'POST',
      headers: getPrintifyHeaders(),
      body: JSON.stringify(productPayload)
    });

    let publishResult = null;
    if (publish && created?.id) {
      publishResult = await fetchJson(`https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(created.id)}/publish.json`, {
        method: 'POST',
        headers: getPrintifyHeaders(),
        body: JSON.stringify({
          title: true,
          description: true,
          images: true,
          variants: true,
          tags: true,
          keyFeatures: true,
          shippingTemplate: true
        })
      });
    }

    return jsonResponse({ success: true, product: created, published: publishResult });
  } catch (err) {
    return jsonResponse({ error: err.message, details: err.body }, 500);
  }
}
