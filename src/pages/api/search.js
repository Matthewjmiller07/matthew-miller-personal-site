export const prerender = false;

import { InferenceClient } from '@huggingface/inference';
import index from '../../data/search-index.json';

const TOP_K = 15;
const MAX_PER_TITLE = 4; // keep one shiur from monopolizing the results

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Vectors are stored as int8 quantized, base64-packed (see build-search-index.mjs).
// Cosine is scale-invariant per vector, so we compare int8 docs to the float query directly.
function decodeVec(b64) {
  const buf = Buffer.from(b64, 'base64');
  return new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

const decoded = (index.chunks || [])
  .filter((c) => c.vec)
  .map((c) => ({ chunk: c, vec: decodeVec(c.vec) }));

export async function GET({ request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (!q) {
    return new Response(JSON.stringify({ error: 'q is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = import.meta.env.HF_TOKEN || process.env.HF_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Search is not configured (missing HF_TOKEN)' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (decoded.length === 0) {
    return new Response(JSON.stringify({ error: 'Search index has not been built yet' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const client = new InferenceClient(token);
    const out = await client.featureExtraction({
      model: index.model,
      inputs: index.queryPrefix + q,
    });
    // Single input may come back as number[] or [number[]] depending on provider
    const queryVec = Array.isArray(out[0]) ? out[0] : out;

    const scored = decoded
      .map(({ chunk, vec }) => ({ chunk, score: cosine(queryVec, vec) }))
      .sort((a, b) => b.score - a.score);

    const perTitle = new Map();
    const results = [];
    for (const { chunk, score } of scored) {
      const count = perTitle.get(chunk.title) || 0;
      if (count >= MAX_PER_TITLE) continue;
      perTitle.set(chunk.title, count + 1);
      results.push({ chunk, score });
      if (results.length >= TOP_K) break;
    }

    const payload = results.map(({ chunk, score }) => ({
        type: chunk.type,
        title: chunk.title,
        url: chunk.url,
        text: chunk.text.length > 320 ? chunk.text.slice(0, 320) + '…' : chunk.text,
        clock: chunk.clock,
        score: Math.round(score * 1000) / 1000,
      }));

    return new Response(JSON.stringify({ query: q, results: payload }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('Search error:', err);
    return new Response(JSON.stringify({ error: 'Search failed', detail: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
