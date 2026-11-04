// pdf-to-audio Worker: accepts MP3 uploads into R2, serves tokenized RSS feeds.
// Routes:
//   POST /upload            — Bearer <UPLOAD_TOKEN>, headers X-Feed-Token + X-Filename,
//                             body = MP3 bytes. Stores <token>/<filename>. Returns { feedUrl, audioUrl }.
//   GET  /feed/<token>.xml  — RSS 2.0 listing every MP3 under <token>/, with enclosures.
//   GET  /audio/<token>/<file> — the MP3 itself, with Range support (R2 native).
// "Private" = obscure token URL, not real auth. Say so on the page.

function rssEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  <description>Chapters converted to audio in the browser with Kokoro TTS. Private feed: anyone with this URL can listen.</description>
  <language>en</language>
${items}
</channel>
</rss>
`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;

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

    return new Response('pdf-to-audio worker. POST /upload, GET /feed/<token>.xml, GET /audio/<token>/<file>.', {
      status: 404,
    });
  },
};
