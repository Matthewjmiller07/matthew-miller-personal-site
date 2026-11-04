// pdf-to-audio Worker: speech synthesis, MP3 uploads into R2, tokenized RSS feeds.
// Routes:
//   POST /tts               — Bearer <UPLOAD_TOKEN>, JSON { text }. Runs Kokoro on a Replicate
//                             GPU (about 1 cent per 30 minutes of audio). Returns { url }, a
//                             short-lived WAV the browser fetches directly.
//   POST /upload            — Bearer <UPLOAD_TOKEN>, headers X-Feed-Token + X-Filename,
//                             body = MP3 bytes. Stores <token>/<filename>. Returns { feedUrl, audioUrl }.
//   GET  /feed/<token>.xml  — RSS 2.0 listing every MP3 under <token>/, with enclosures.
//   GET  /audio/<token>/<file> — the MP3 itself, with Range support (R2 native).
// "Private" = obscure token URL, not real auth. Say so on the page.

function rssEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Bearer-token API with no cookies, so any origin may call it (including Deploy Previews).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Feed-Token, X-Filename, X-Duration-Seconds',
  'Access-Control-Max-Age': '86400',
};

const KOKORO_VERSION = 'f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13';
const KOKORO_VOICE = 'af_bella';
const MAX_TTS_CHARS = 4000;

async function synthesize(text, env) {
  const headers = {
    Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
  const created = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { ...headers, Prefer: 'wait=30' },
    body: JSON.stringify({ version: KOKORO_VERSION, input: { text, voice: KOKORO_VOICE, speed: 1 } }),
  });
  if (!created.ok) {
    return Response.json({ error: `Replicate returned ${created.status}` }, {
      status: created.status === 429 ? 429 : 502,
    });
  }
  let prediction = await created.json();
  // A cold start can outlast the wait above. Keep polling; the browser retries past this.
  for (let i = 0; i < 30 && ['starting', 'processing'].includes(prediction.status); i++) {
    await new Promise((r) => setTimeout(r, 2000));
    prediction = await (await fetch(prediction.urls.get, { headers })).json();
  }
  if (prediction.status !== 'succeeded' || !prediction.output) {
    return Response.json({ error: prediction.error || `Prediction ${prediction.status}` }, { status: 502 });
  }
  return Response.json({ url: prediction.output });
}

function feedXml(origin, token, objects) {
  const items = objects.map((o) => {
    const file = o.key.slice(token.length + 1);
    const title = decodeURIComponent(file.replace(/\.mp3$/i, '').replace(/_/g, ' '));
    const audioUrl = `${origin}/audio/${token}/${encodeURIComponent(file)}`;
    const pubDate = (o.uploaded || new Date()).toUTCString();
    const dur = o.customMetadata && o.customMetadata.duration
      ? `<itunes:duration>${o.customMetadata.duration}</itunes:duration>` : '';
    return `  <item>
    <title>${rssEscape(title)}</title>
    <guid isPermaLink="false">${rssEscape(audioUrl)}</guid>
    <pubDate>${pubDate}</pubDate>
    <enclosure url="${rssEscape(audioUrl)}" length="${o.size}" type="audio/mpeg" />
    ${dur}
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
<channel>
  <title>PDF to Audio — private feed</title>
  <link>${rssEscape(origin)}/pdf-to-audio</link>
  <description>Chapters converted to audio with Kokoro TTS. Private feed: anyone with this URL can listen.</description>
  <language>en</language>
${items}
</channel>
</rss>
`;
}

async function route(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;

    // --- Speech ---
    if (url.pathname === '/tts' && request.method === 'POST') {
      const auth = request.headers.get('Authorization') || '';
      if (!env.UPLOAD_TOKEN || auth !== `Bearer ${env.UPLOAD_TOKEN}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      const { text } = await request.json().catch(() => ({}));
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_TTS_CHARS) {
        return new Response('Bad text', { status: 400 });
      }
      return synthesize(text, env);
    }

    // --- Upload ---
    if (url.pathname === '/upload' && request.method === 'POST') {
      const auth = request.headers.get('Authorization') || '';
      if (!env.UPLOAD_TOKEN || auth !== `Bearer ${env.UPLOAD_TOKEN}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      const token = request.headers.get('X-Feed-Token') || '';
      const filename = request.headers.get('X-Filename') || '';
      if (!/^[a-zA-Z0-9_-]{8,64}$/.test(token)) {
        return new Response('Bad X-Feed-Token', { status: 400 });
      }
      if (!/^[a-zA-Z0-9._-]+\.mp3$/i.test(filename) || filename.includes('..')) {
        return new Response('Bad X-Filename', { status: 400 });
      }
      const duration = request.headers.get('X-Duration-Seconds') || '';
      const body = await request.arrayBuffer();
      if (body.byteLength === 0 || body.byteLength > 200 * 1024 * 1024) {
        return new Response('Bad MP3 size', { status: 400 });
      }
      const key = `${token}/${filename}`;
      await env.AUDIO.put(key, body, {
        httpMetadata: { contentType: 'audio/mpeg' },
        customMetadata: duration ? { duration } : undefined,
      });
      return Response.json({
        feedUrl: `${origin}/feed/${token}.xml`,
        audioUrl: `${origin}/audio/${token}/${encodeURIComponent(filename)}`,
        bytes: body.byteLength,
      });
    }

    // --- Feed ---
    const feedMatch = url.pathname.match(/^\/feed\/([a-zA-Z0-9_-]{8,64})\.xml$/);
    if (feedMatch && request.method === 'GET') {
      const token = feedMatch[1];
      const listed = await env.AUDIO.list({ prefix: `${token}/` });
      const objects = (listed.objects || []).filter((o) => /\.mp3$/i.test(o.key));
      objects.sort((a, b) => (a.uploaded < b.uploaded ? -1 : 1));
      return new Response(feedXml(origin, token, objects), {
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }

    // --- Audio with Range support ---
    const audioMatch = url.pathname.match(/^\/audio\/([a-zA-Z0-9_-]{8,64})\/(.+)$/);
    if (audioMatch && request.method === 'GET') {
      const key = `${audioMatch[1]}/${decodeURIComponent(audioMatch[2])}`;
      const object = await env.AUDIO.get(key, { range: request.headers });
      if (object === null) return new Response('Not found', { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Accept-Ranges', 'bytes');
      return new Response(object.body, { headers, status: object.range ? 206 : 200 });
    }

    return new Response('pdf-to-audio worker. POST /tts, POST /upload, GET /feed/<token>.xml, GET /audio/<token>/<file>.', {
      status: 404,
    });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const res = await route(request, env);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
    return out;
  },
};
