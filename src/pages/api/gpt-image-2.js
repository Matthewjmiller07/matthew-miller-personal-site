export const prerender = false;

const DEFAULT_INPUT_IMAGE_URL = 'https://theothermatthewmiller.com/images/matthew-selfie.jpg';

function getToken() {
  return process.env.REPLICATE_API_TOKEN || import.meta.env?.REPLICATE_API_TOKEN || '';
}

export async function POST({ request }) {
  const token = getToken();
  if (!token) return new Response(JSON.stringify({ error: 'Missing REPLICATE_API_TOKEN' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  let body = {};
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { prompt, inputImageUrl, noReference } = body;
  if (!prompt) return new Response(JSON.stringify({ error: 'prompt is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const input = {
    prompt,
    quality: 'low',
    aspect_ratio: '1:1',
    output_format: 'webp',
    output_compression: 85,
  };

  // GPT Image 2 uses this image as Matthew's identity reference by default. A caller can
  // override it, or pass noReference:true to generate without any identity photo at all
  // (e.g. for unrelated illustration use cases that shouldn't include Matthew's face).
  if (!noReference) {
    input.input_images = [inputImageUrl || DEFAULT_INPUT_IMAGE_URL];
  }

  try {
    const resp = await fetch('https://api.replicate.com/v1/models/openai/gpt-image-2/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    const data = await resp.json();
    if (!resp.ok) return new Response(JSON.stringify({ error: data.detail || 'Replicate error' }), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
    if (data.status === 'failed') {
      return new Response(JSON.stringify({ error: data.error || 'GPT Image 2 prediction failed' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
