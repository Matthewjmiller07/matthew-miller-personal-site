// The Slop Kitchen (/slop), step 3: food photography with FLUX.2 [klein] 4B on Replicate.
// POST { prompt } starts a prediction (waiting a few seconds for it); GET ?id= polls it.
export const prerender = false;

const MODEL_URL = 'https://api.replicate.com/v1/models/black-forest-labs/flux-2-klein-4b/predictions';
const MAX_PROMPT_CHARS = 1200;
const STYLE = 'Professional food photography, shot for a glossy cookbook, shallow depth of field, soft natural window light, styled props, appetizing color grading, ultra detailed, photorealistic.';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const token = () => process.env.REPLICATE_API_TOKEN || import.meta.env?.REPLICATE_API_TOKEN || '';

const slim = (p) => ({
  id: p.id,
  status: p.status,
  image: Array.isArray(p.output) ? p.output[0] : p.output || null,
  error: p.error || null,
});

export async function POST({ request }) {
  if (!token()) return json({ error: 'Missing REPLICATE_API_TOKEN' }, 500);
  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, MAX_PROMPT_CHARS) : '';
  if (!prompt) return json({ error: 'prompt is required' }, 400);

  const res = await fetch(MODEL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', Prefer: 'wait=15' },
    body: JSON.stringify({
      input: { prompt: `${prompt} ${STYLE}`, aspect_ratio: '4:5', output_format: 'jpg', output_quality: 90 },
    }),
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data.detail || 'Replicate error' }, res.status);
  return json(slim(data));
}

export async function GET({ url }) {
  if (!token()) return json({ error: 'Missing REPLICATE_API_TOKEN' }, 500);
  const id = url.searchParams.get('id') || '';
  if (!/^[a-z0-9]+$/i.test(id)) return json({ error: 'Bad id' }, 400);
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data.detail || 'Replicate error' }, res.status);
  return json(slim(data));
}
