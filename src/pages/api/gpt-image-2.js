import fs from 'fs';
import path from 'path';

export const prerender = false;

function getToken() {
  return process.env.REPLICATE_API_TOKEN || import.meta.env?.REPLICATE_API_TOKEN || '';
}

function getSelfieDataUrl() {
  try {
    const imgPath = path.join(process.cwd(), 'public', 'images', 'matthew-selfie.jpg');
    const buf = fs.readFileSync(imgPath);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch { return null; }
}

export async function POST({ request }) {
  const token = getToken();
  if (!token) return new Response(JSON.stringify({ error: 'Missing REPLICATE_API_TOKEN' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  let body = {};
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { prompt, inputImageUrl } = body;
  if (!prompt) return new Response(JSON.stringify({ error: 'prompt is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  let inputImages = [];
  if (inputImageUrl) {
    inputImages = [inputImageUrl];
  } else {
    const selfie = getSelfieDataUrl();
    if (selfie) inputImages = [selfie];
  }

  const input = {
    prompt,
    quality: 'low',
    aspect_ratio: '1:1',
    output_format: 'webp',
    output_compression: 85,
    ...(inputImages.length > 0 ? { input_images: inputImages } : {}),
  };

  try {
    const resp = await fetch('https://api.replicate.com/v1/models/openai/gpt-image-2/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({ input }),
    });

    const data = await resp.json();
    if (!resp.ok) return new Response(JSON.stringify({ error: data.detail || 'Replicate error' }), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
