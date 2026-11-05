// Ross Reads It: speech, per-person and daily limits, podcast feeds.
//
// The browser holds a random secret "library" id, which owns feeds. There are no accounts.
// Spending is bounded by atomic counters in D1: Kokoro on Replicate costs about 1 cent per
// 25,000 characters, so the shared cap below is about 5 cents a day.
const CHARS_FREE = 4_500; // per person per day, about 5 minutes of audio
const CHARS_WITH_EMAIL = 27_500; // about 30 minutes
const CHARS_ALL = 125_000; // everyone together per day
// Hebrew uses a different voice at about 1.5 cents per minute of audio, some 40x the English one.
const HE_CHARS_PERSON = 600; // about a minute per person per day
const HE_CHARS_ALL = 2_000; // about 5 cents for everyone together
const HE_CHARS_OWNER = 10_000; // about 18 minutes, or 25 cents
const UPLOAD_PER_PERSON = 100 * 1024 * 1024;
const UPLOAD_ALL = 300 * 1024 * 1024;
const FETCHES_PER_PERSON = 60;
const MAX_TTS_CHARS = 4_000;
const MAX_FEEDS = 20;
const MAX_FETCH_BYTES = 30 * 1024 * 1024;

const SITE = 'https://theothermatthewmiller.com';
const COVER = `${SITE}/ross/cover.png`;
const KOKORO_VERSION = 'f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13';
const KOKORO_VOICE = 'am_michael';
const GEMINI_MODEL = 'google/gemini-3.8-flash-tts';
const GEMINI_VOICE = 'Charon';
const GEMINI_STYLE = 'Read this aloud clearly and steadily, like an audiobook narrator.';

// The Origin header can be faked outside a browser, so the caps are what really bound the bill.
const ALLOWED_ORIGIN = /^(https:\/\/theothermatthewmiller\.com|https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app|http:\/\/localhost:\d+)$/;
const LIBRARY = /^[a-f0-9]{32}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Library, X-Feed-Token, X-Title, X-Duration-Seconds',
  'Access-Control-Expose-Headers': 'X-Content-Kind',
  'Access-Control-Max-Age': '86400',
};

const today = () => new Date().toISOString().slice(0, 10);
const json = (data, status = 200) => Response.json(data, { status });
const fail = (error, status) => json({ error }, status);
const randomHex = (bytes) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');

async function ipSubject(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.IP_SALT}:${ip}`));
  return Array.from(new Uint8Array(hash).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

// --- Usage counters ---

async function used(env, subject) {
  const row = await env.DB.prepare('SELECT amount FROM usage WHERE day = ? AND subject = ?').bind(today(), subject).first();
  return row ? row.amount : 0;
}

async function add(env, subject, amount, limit) {
  const row = await env.DB.prepare(
    `INSERT INTO usage (day, subject, amount) SELECT ?1, ?2, ?3 WHERE ?3 <= ?4
     ON CONFLICT (day, subject) DO UPDATE SET amount = amount + excluded.amount
     WHERE amount + excluded.amount <= ?4 RETURNING amount`,
  ).bind(today(), subject, amount, limit).first();
  return row !== null;
}

// All counters must have room, or none are charged.
async function reserve(env, counters, amount) {
  const charged = [];
  for (const [subject, limit] of counters) {
    if (!(await add(env, subject, amount, limit))) {
      await refund(env, charged, amount);
      return subject;
    }
    charged.push([subject, limit]);
  }
  return null;
}

async function refund(env, counters, amount) {
  for (const [subject] of counters) {
    await env.DB.prepare('UPDATE usage SET amount = MAX(0, amount - ?) WHERE day = ? AND subject = ?')
      .bind(amount, today(), subject).run();
  }
}

// --- Library ---

async function getUser(request, env) {
  const library = request.headers.get('X-Library') || '';
  if (!LIBRARY.test(library)) return null;
  await env.DB.prepare('INSERT OR IGNORE INTO users (library) VALUES (?)').bind(library).run();
  return env.DB.prepare('SELECT * FROM users WHERE library = ?').bind(library).first();
}

const personalLimit = (user) => user.daily_limit ?? (user.email ? CHARS_WITH_EMAIL : CHARS_FREE);

function isHebrew(text) {
  const letters = text.match(/\p{L}/gu) || [];
  const hebrew = text.match(/\p{Script=Hebrew}/gu) || [];
  return letters.length > 0 && hebrew.length / letters.length > 0.2;
}

async function speechCounters(user, request, env, hebrew = false) {
  const kind = hebrew ? 'he' : 'tts';
  const limit = hebrew ? (user.daily_limit ? HE_CHARS_OWNER : HE_CHARS_PERSON) : personalLimit(user);
  const mine = [`${kind}:${user.library}`, limit];
  if (user.daily_limit) return [mine];
  return [[`${kind}:all`, hebrew ? HE_CHARS_ALL : CHARS_ALL], [`${kind}:${await ipSubject(request, env)}`, limit], mine];
}

async function remainingChars(user, request, env, hebrew = false) {
  const counters = await speechCounters(user, request, env, hebrew);
  const left = await Promise.all(counters.map(async ([s, l]) => l - (await used(env, s))));
  return Math.max(0, Math.min(...left));
}

async function createFeed(env, library, title) {
  const token = randomHex(12);
  await env.DB.prepare('INSERT INTO feeds (token, library, title) VALUES (?, ?, ?)').bind(token, library, title).run();
  return token;
}

// Feeds made before the database existed live only as files in R2. Bring one in the first time it is asked for.
async function adoptOldFeed(env, token) {
  const existing = await env.DB.prepare('SELECT * FROM feeds WHERE token = ?').bind(token).first();
  if (existing) return existing;
  const listed = await env.AUDIO.list({ prefix: `${token}/`, include: ['customMetadata'] });
  const objects = listed.objects.filter((o) => /\.mp3$/i.test(o.key));
  if (!objects.length) return null;
  await env.DB.prepare('INSERT OR IGNORE INTO feeds (token, title) VALUES (?, ?)').bind(token, 'My reading').run();
  await env.DB.batch(objects.map((o) => env.DB.prepare(
    'INSERT OR IGNORE INTO episodes (feed_token, r2_key, title, bytes, duration, created) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(
    token, o.key, o.key.slice(token.length + 1).replace(/\.mp3$/i, '').replace(/[-_]/g, ' '),
    o.size, Number(o.customMetadata?.duration) || null, o.uploaded.toISOString().slice(0, 19).replace('T', ' '),
  )));
  return env.DB.prepare('SELECT * FROM feeds WHERE token = ?').bind(token).first();
}

async function libraryView(user, request, env, origin) {
  let { results: feeds } = await env.DB.prepare('SELECT token, title FROM feeds WHERE library = ? ORDER BY created').bind(user.library).all();
  if (!feeds.length) {
    const title = 'My reading';
    feeds = [{ token: await createFeed(env, user.library, title), title }];
  }
  const tokens = feeds.map((f) => f.token);
  const { results: episodes } = await env.DB.prepare(
    `SELECT id, feed_token, title, duration, created FROM episodes WHERE feed_token IN (${tokens.map(() => '?').join(',')}) ORDER BY created DESC, id DESC`,
  ).bind(...tokens).all();
  return {
    hasEmail: Boolean(user.email),
    charsLeft: await remainingChars(user, request, env),
    hebrewCharsLeft: await remainingChars(user, request, env, true),
    sharedLeft: user.daily_limit ? user.daily_limit : Math.max(0, CHARS_ALL - (await used(env, 'tts:all'))),
    freeChars: CHARS_FREE,
    emailChars: CHARS_WITH_EMAIL,
    feeds: feeds.map((f) => ({
      ...f,
      feedUrl: `${origin}/feed/${f.token}.xml`,
      episodes: episodes.filter((e) => e.feed_token === f.token).map(({ feed_token, ...e }) => e),
    })),
  };
}

// --- Speech ---

async function synthesize(text, hebrew, env) {
  const headers = { Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' };
  const [endpoint, body] = hebrew
    ? [`models/${GEMINI_MODEL}/predictions`, { input: { text, voice: GEMINI_VOICE, style: GEMINI_STYLE, output_format: 'wav' } }]
    : ['predictions', { version: KOKORO_VERSION, input: { text, voice: KOKORO_VOICE, speed: 1 } }];
  const created = await fetch(`https://api.replicate.com/v1/${endpoint}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'wait=30' },
    body: JSON.stringify(body),
  });
  if (!created.ok) throw new Error(`Replicate returned ${created.status}`);
  let prediction = await created.json();
  // A cold start can outlast the wait above.
  for (let i = 0; i < 30 && ['starting', 'processing'].includes(prediction.status); i++) {
    await new Promise((r) => setTimeout(r, 2000));
    prediction = await (await fetch(prediction.urls.get, { headers })).json();
  }
  const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (prediction.status !== 'succeeded' || !output) {
    throw new Error(prediction.error || `Prediction ${prediction.status}`);
  }
  return output;
}

// --- Fetching a link ---

async function fetchLink(target) {
  let url;
  try {
    url = new URL(target);
  } catch {
    return fail("That doesn't look like a web address.", 400);
  }
  const isPrivate = /^(localhost|.*\.local|.*\.internal|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(url.hostname);
  if (!/^https?:$/.test(url.protocol) || isPrivate) return fail("That doesn't look like a public web address.", 400);
  let page;
  try {
    page = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RossReadsIt/1.0)', Accept: 'text/html,application/pdf,text/plain;q=0.9,*/*;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return fail("Ross couldn't reach that page.", 502);
  }
  if (!page.ok) return fail(`That page answered with an error (${page.status}). It may need a login.`, 502);
  const type = (page.headers.get('Content-Type') || '').toLowerCase();
  const kind = type.includes('pdf') ? 'pdf' : type.includes('html') || type.includes('xml') ? 'html' : type.startsWith('text/') ? 'text' : null;
  if (!kind) return fail("Ross can read web pages and PDFs, and that link is neither.", 415);
  if (Number(page.headers.get('Content-Length') || 0) > MAX_FETCH_BYTES) return fail('That file is too big.', 413);
  const body = await page.arrayBuffer();
  if (body.byteLength > MAX_FETCH_BYTES) return fail('That file is too big.', 413);
  // Never served as HTML, so nothing fetched can run on this origin.
  return new Response(body, {
    headers: { 'Content-Type': kind === 'pdf' ? 'application/octet-stream' : 'text/plain; charset=utf-8', 'X-Content-Kind': kind, 'X-Content-Type-Options': 'nosniff' },
  });
}

// --- Feed XML ---

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function feedXml(origin, feed, episodes) {
  const items = episodes.map((e) => {
    const file = e.r2_key.slice(feed.token.length + 1);
    const audioUrl = `${origin}/audio/${feed.token}/${encodeURIComponent(file)}`;
    // Episodes from before the rename keep their old guid, so podcast apps don't list them twice.
    const guid = /^[0-9a-f]{16}\.mp3$/.test(file) ? audioUrl : `https://pdf-to-audio.parasha.workers.dev/audio/${feed.token}/${encodeURIComponent(file)}`;
    return `  <item>
    <title>${esc(e.title)}</title>
    <guid isPermaLink="false">${esc(guid)}</guid>
    <pubDate>${new Date(`${e.created.replace(' ', 'T')}Z`).toUTCString()}</pubDate>
    <enclosure url="${esc(audioUrl)}" length="${e.bytes}" type="audio/mpeg" />
    <itunes:author>Ross</itunes:author>
    ${e.duration ? `<itunes:duration>${e.duration}</itunes:duration>` : ''}
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
<channel>
  <title>${esc(feed.title)}</title>
  <link>${SITE}/ross</link>
  <description>Your reading, read out loud by Ross. This feed is private: anyone with its link can listen, so keep it to yourself.</description>
  <language>en</language>
  <itunes:author>Ross Reads It</itunes:author>
  <itunes:image href="${COVER}" />
  <itunes:explicit>false</itunes:explicit>
  <itunes:block>Yes</itunes:block>
${items}
</channel>
</rss>
`;
}

// --- Routes ---

async function route(request, env) {
  const url = new URL(request.url);
  const { pathname: path, origin } = url;
  const method = request.method;

  const feedMatch = path.match(/^\/feed\/([a-zA-Z0-9_-]{8,64})\.xml$/);
  if (feedMatch && method === 'GET') {
    const feed = await adoptOldFeed(env, feedMatch[1]);
    if (!feed) return new Response('Not found', { status: 404 });
    const { results } = await env.DB.prepare('SELECT * FROM episodes WHERE feed_token = ? ORDER BY created, id').bind(feed.token).all();
    return new Response(feedXml(origin, feed, results), {
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex' },
    });
  }

  const audioMatch = path.match(/^\/audio\/([a-zA-Z0-9_-]{8,64})\/(.+)$/);
  if (audioMatch && (method === 'GET' || method === 'HEAD')) {
    const key = `${audioMatch[1]}/${decodeURIComponent(audioMatch[2])}`;
    const object = await env.AUDIO.get(key, { range: request.headers });
    if (object === null) return new Response('Not found', { status: 404 });
    const headers = new Headers({ etag: object.httpEtag, 'Accept-Ranges': 'bytes', 'X-Robots-Tag': 'noindex' });
    object.writeHttpMetadata(headers);
    if (object.range) {
      const { offset = 0, length = object.size - offset } = object.range;
      headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
      headers.set('Content-Length', String(length));
    }
    return new Response(object.body, { headers, status: object.range ? 206 : 200 });
  }

  // Everything below is for the site's own page.
  if (!ALLOWED_ORIGIN.test(request.headers.get('Origin') || '')) return fail('Forbidden', 403);
  const user = await getUser(request, env);
  if (!user) return fail('Missing library', 400);

  if (path === '/me' && method === 'GET') return json(await libraryView(user, request, env, origin));

  if (path === '/tts' && method === 'POST') {
    const { text } = await request.json().catch(() => ({}));
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_TTS_CHARS) return fail('Bad text', 400);
    const hebrew = isHebrew(text);
    const counters = await speechCounters(user, request, env, hebrew);
    const over = await reserve(env, counters, text.length);
    if (over) return json({ error: 'limit', everyone: over.endsWith(':all') }, 402);
    try {
      return json({ url: await synthesize(text, hebrew, env) });
    } catch (err) {
      await refund(env, counters, text.length);
      return fail(String(err.message || err), 502);
    }
  }

  if (path === '/email' && method === 'POST') {
    const { email } = await request.json().catch(() => ({}));
    if (typeof email !== 'string' || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail('That email address looks mistyped.', 400);
    }
    await env.DB.prepare('UPDATE users SET email = ? WHERE library = ?').bind(email.trim().toLowerCase(), user.library).run();
    return json(await libraryView({ ...user, email }, request, env, origin));
  }

  if (path === '/extract' && method === 'GET') {
    const over = await reserve(env, [[`fetch:${await ipSubject(request, env)}`, FETCHES_PER_PERSON]], 1);
    if (over) return fail('That is enough links for today. Try again tomorrow.', 429);
    return fetchLink(url.searchParams.get('url') || '');
  }

  if (path === '/claim' && method === 'POST') {
    const { token } = await request.json().catch(() => ({}));
    if (typeof token === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(token)) {
      await adoptOldFeed(env, token);
      await env.DB.prepare('UPDATE feeds SET library = ? WHERE token = ? AND library IS NULL').bind(user.library, token).run();
    }
    return json(await libraryView(user, request, env, origin));
  }

  if (path === '/feeds' && method === 'POST') {
    const { title } = await request.json().catch(() => ({}));
    const name = String(title || '').trim().slice(0, 80);
    if (!name) return fail('Give the feed a name.', 400);
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM feeds WHERE library = ?').bind(user.library).first();
    if (n >= MAX_FEEDS) return fail(`${MAX_FEEDS} feeds is the most you can have.`, 400);
    await createFeed(env, user.library, name);
    return json(await libraryView(user, request, env, origin));
  }

  const feedRoute = path.match(/^\/feeds\/([a-zA-Z0-9_-]{8,64})$/);
  if (feedRoute) {
    const feed = await env.DB.prepare('SELECT * FROM feeds WHERE token = ? AND library = ?').bind(feedRoute[1], user.library).first();
    if (!feed) return fail('Feed not found', 404);
    if (method === 'PATCH') {
      const { title } = await request.json().catch(() => ({}));
      const name = String(title || '').trim().slice(0, 80);
      if (!name) return fail('Give the feed a name.', 400);
      await env.DB.prepare('UPDATE feeds SET title = ? WHERE token = ?').bind(name, feed.token).run();
      return json(await libraryView(user, request, env, origin));
    }
    if (method === 'DELETE') {
      const { results } = await env.DB.prepare('SELECT r2_key FROM episodes WHERE feed_token = ?').bind(feed.token).all();
      if (results.length) await env.AUDIO.delete(results.map((e) => e.r2_key));
      await env.DB.batch([
        env.DB.prepare('DELETE FROM episodes WHERE feed_token = ?').bind(feed.token),
        env.DB.prepare('DELETE FROM feeds WHERE token = ?').bind(feed.token),
      ]);
      return json(await libraryView(user, request, env, origin));
    }
  }

  const episodeRoute = path.match(/^\/episodes\/(\d+)$/);
  if (episodeRoute && method === 'DELETE') {
    const episode = await env.DB.prepare(
      'SELECT e.id, e.r2_key FROM episodes e JOIN feeds f ON f.token = e.feed_token WHERE e.id = ? AND f.library = ?',
    ).bind(Number(episodeRoute[1]), user.library).first();
    if (!episode) return fail('Episode not found', 404);
    await env.AUDIO.delete(episode.r2_key);
    await env.DB.prepare('DELETE FROM episodes WHERE id = ?').bind(episode.id).run();
    return json(await libraryView(user, request, env, origin));
  }

  if (path === '/upload' && method === 'POST') {
    const token = request.headers.get('X-Feed-Token') || '';
    const feed = await env.DB.prepare('SELECT * FROM feeds WHERE token = ? AND library = ?').bind(token, user.library).first();
    if (!feed) return fail('Feed not found', 404);
    const body = await request.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > 90 * 1024 * 1024) return fail('That audio is too big to add.', 413);
    if (!user.daily_limit) {
      const over = await reserve(env, [['up:all', UPLOAD_ALL], [`up:${await ipSubject(request, env)}`, UPLOAD_PER_PERSON]], body.byteLength);
      if (over) return json({ error: 'limit' }, 402);
    }
    const title = decodeURIComponent(request.headers.get('X-Title') || 'Untitled').trim().slice(0, 200) || 'Untitled';
    const key = `${token}/${randomHex(8)}.mp3`;
    const duration = Math.round(Number(request.headers.get('X-Duration-Seconds'))) || null;
    await env.AUDIO.put(key, body, { httpMetadata: { contentType: 'audio/mpeg' } });
    await env.DB.prepare('INSERT INTO episodes (feed_token, r2_key, title, bytes, duration) VALUES (?, ?, ?, ?, ?)')
      .bind(token, key, title, body.byteLength, duration).run();
    return json(await libraryView(user, request, env, origin));
  }

  return fail('Not found', 404);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const res = await route(request, env);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
    return out;
  },
  async scheduled(_event, env) {
    const cutoff = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    await env.DB.prepare('DELETE FROM usage WHERE day < ?').bind(cutoff).run();
  },
};
