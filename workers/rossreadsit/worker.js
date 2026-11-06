// Ross Reads It: speech, free reading, paid years, podcast feeds.
//
// The browser holds a random secret "library" id, which owns feeds. There are no accounts.
// Everyone gets about 5 minutes free, once. After that a year costs $10, paid once through Stripe Checkout.
// Free reading is bounded by atomic counters in D1: Kokoro on Replicate costs about 1 cent per 25,000
// characters, so the shared cap below is about 5 cents a day.
const FREE_CHARS = 4_500; // per library, ever: about 5 minutes of audio
const FREE_CHARS_PER_IP = 27_500; // per day, so a cleared browser can't read for free without end
const CHARS_ALL = 125_000; // all free English per day, everyone together
const HE_CHARS_ALL = 125_000; // all free Hebrew per day, everyone together
// Paid reading has no limit a reader should ever meet. These only stop a leaked link or a script from
// running up the bill: each is about $2 a day (Kokoro about 40 cents per 1M, Google $4 per 1M past its
// 4M free a month) and about 90 and 11 hours of audio a day.
const PAID_CHARS_PER_DAY = 5_000_000;
const PAID_HE_CHARS_PER_DAY = 500_000;
const YEAR_PRICE_CENTS = 1_000;
const YEAR_DAYS = 365;
const FOREVER = 'forever'; // a usage row that the nightly clean-up leaves alone
const UPLOAD_PER_PERSON = 100 * 1024 * 1024;
const UPLOAD_ALL = 300 * 1024 * 1024;
const FETCHES_PER_PERSON = 60;
const MAX_TTS_CHARS = 4_000;
const MAX_FEEDS = 20;
const MAX_FETCH_BYTES = 30 * 1024 * 1024;
const MAX_COVER_BYTES = 2 * 1024 * 1024;
const FEED_TITLE_CHARS = 70;
const EPISODE_TITLE_CHARS = 100;

const SITE = 'https://theothermatthewmiller.com';
const COVER = `${SITE}/ross/cover.png`;
const KOKORO_VERSION = 'f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13';
const KOKORO_VOICE = 'am_michael';
const HEBREW_VOICE = 'he-IL-Wavenet-B';
const GOOGLE_MAX_BYTES = 5_000; // the most Google accepts in one request

// The Origin header can be faked outside a browser, so the caps are what really bound the bill.
const ALLOWED_ORIGIN = /^(https:\/\/theothermatthewmiller\.com|https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app|http:\/\/localhost:\d+)$/;
const LIBRARY = /^[a-f0-9]{32}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Library, X-Feed-Token, X-Title, X-Duration-Seconds, X-Cover-Title',
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

async function used(env, subject, day = today()) {
  const row = await env.DB.prepare('SELECT amount FROM usage WHERE day = ? AND subject = ?').bind(day, subject).first();
  return row ? row.amount : 0;
}

async function add(env, subject, amount, limit, day) {
  const row = await env.DB.prepare(
    `INSERT INTO usage (day, subject, amount) SELECT ?1, ?2, ?3 WHERE ?3 <= ?4
     ON CONFLICT (day, subject) DO UPDATE SET amount = amount + excluded.amount
     WHERE amount + excluded.amount <= ?4 RETURNING amount`,
  ).bind(day, subject, amount, limit).first();
  return row !== null;
}

// All counters must have room, or none are charged.
async function reserve(env, counters, amount) {
  const charged = [];
  for (const [subject, limit, day = today()] of counters) {
    if (!(await add(env, subject, amount, limit, day))) {
      await refund(env, charged, amount);
      return subject;
    }
    charged.push([subject, limit, day]);
  }
  return null;
}

async function refund(env, counters, amount) {
  for (const [subject, , day = today()] of counters) {
    await env.DB.prepare('UPDATE usage SET amount = MAX(0, amount - ?) WHERE day = ? AND subject = ?')
      .bind(amount, day, subject).run();
  }
}

// --- Library ---

async function getUser(request, env) {
  const library = request.headers.get('X-Library') || '';
  if (!LIBRARY.test(library)) return null;
  await env.DB.prepare('INSERT OR IGNORE INTO users (library) VALUES (?)').bind(library).run();
  return env.DB.prepare('SELECT * FROM users WHERE library = ?').bind(library).first();
}

// A row with daily_limit set is the owner, who never expires.
const isPaid = (user) => user.daily_limit != null || (user.paid_until != null && user.paid_until > new Date().toISOString());

function isHebrew(text) {
  const letters = text.match(/\p{L}/gu) || [];
  const hebrew = text.match(/\p{Script=Hebrew}/gu) || [];
  return letters.length > 0 && hebrew.length / letters.length > 0.2;
}

async function speechCounters(user, request, env, hebrew = false) {
  const kind = hebrew ? 'he' : 'tts';
  if (isPaid(user)) return [[`${kind}:${user.library}`, hebrew ? PAID_HE_CHARS_PER_DAY : PAID_CHARS_PER_DAY]];
  return [
    [`${kind}:all`, hebrew ? HE_CHARS_ALL : CHARS_ALL],
    [`${kind}:${await ipSubject(request, env)}`, FREE_CHARS_PER_IP],
    [`free:${user.library}`, FREE_CHARS, FOREVER],
  ];
}

async function remainingChars(user, request, env, hebrew = false) {
  const counters = await speechCounters(user, request, env, hebrew);
  const left = await Promise.all(counters.map(async ([s, l, d]) => l - (await used(env, s, d))));
  return Math.max(0, Math.min(...left));
}

// --- Paying ---

async function stripe(env, path, form) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: form ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20', // free orders need 2023-08-16 or later
    },
    body: form ? new URLSearchParams(form) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Stripe answered ${res.status}`);
  return data;
}

// The library stays out of Stripe, so the session id waits on the user's row. Asking Stripe here, rather than
// trusting the return from Checkout, means someone who pays and closes the tab still gets their year on their
// next visit. Returns the user as they now stand, and the session if it can still be paid.
async function settleCheckout(user, env) {
  if (!user.checkout_session) return { user };
  let session;
  try {
    session = await stripe(env, `/checkout/sessions/${encodeURIComponent(user.checkout_session)}`);
  } catch {
    return { user }; // Stripe is unreachable: the session stays on the row and is asked about next time.
  }
  if (session.status === 'open') return { user, openUrl: session.url };
  let paidUntil = user.paid_until;
  // A promo code for 100% off finishes as no_payment_required.
  if (session.status === 'complete' && session.payment_status !== 'unpaid') {
    const now = new Date().toISOString();
    const from = new Date(paidUntil && paidUntil > now ? paidUntil : now);
    paidUntil = new Date(from.getTime() + YEAR_DAYS * 86_400_000).toISOString();
  }
  // Matching the session id means two requests at once can't add two years.
  const row = await env.DB.prepare('UPDATE users SET paid_until = ?, checkout_session = NULL WHERE library = ? AND checkout_session = ? RETURNING *')
    .bind(paidUntil, user.library, user.checkout_session).first();
  return { user: row ?? (await env.DB.prepare('SELECT * FROM users WHERE library = ?').bind(user.library).first()) };
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

// A feed's art is served from the same route as its audio, and its name changes with each redraw
// because podcast apps hold on to artwork by URL.
function coverUrl(origin, key) {
  return key ? `${origin}/audio/${key.split('/').map(encodeURIComponent).join('/')}` : COVER;
}

async function libraryView(user, request, env, origin) {
  let { results: feeds } = await env.DB.prepare('SELECT token, title, cover_key, cover_title FROM feeds WHERE library = ? ORDER BY created').bind(user.library).all();
  if (!feeds.length) {
    const title = 'My reading';
    feeds = [{ token: await createFeed(env, user.library, title), title, cover_key: null, cover_title: null }];
  }
  const tokens = feeds.map((f) => f.token);
  const { results: episodes } = await env.DB.prepare(
    `SELECT id, feed_token, title, duration, created FROM episodes WHERE feed_token IN (${tokens.map(() => '?').join(',')}) ORDER BY created DESC, id DESC`,
  ).bind(...tokens).all();
  return {
    paid: isPaid(user),
    paidUntil: user.paid_until,
    charsLeft: await remainingChars(user, request, env),
    hebrewCharsLeft: await remainingChars(user, request, env, true),
    freeLeft: Math.max(0, FREE_CHARS - (await used(env, `free:${user.library}`, FOREVER))),
    feeds: feeds.map(({ cover_key, cover_title, ...f }) => ({
      ...f,
      coverUrl: coverUrl(origin, cover_key),
      coverTitle: cover_title,
      feedUrl: `${origin}/feed/${f.token}.xml`,
      episodes: episodes.filter((e) => e.feed_token === f.token).map(({ feed_token, ...e }) => e),
    })),
  };
}

// --- Speech ---

// Returns the WAV itself, at the same sample rate as Kokoro.
async function synthesizeHebrew(text, env) {
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'X-Goog-Api-Key': env.GOOGLE_TTS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'he-IL', name: HEBREW_VOICE },
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24_000 },
    }),
  });
  if (!res.ok) throw new Error(`Google returned ${res.status}`);
  const { audioContent } = await res.json();
  return Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
}

async function synthesize(text, env) {
  const headers = { Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' };
  const created = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { ...headers, Prefer: 'wait=30' },
    body: JSON.stringify({ version: KOKORO_VERSION, input: { text, voice: KOKORO_VOICE, speed: 1 } }),
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
  <itunes:image href="${esc(coverUrl(origin, feed.cover_key))}" />
  <image><url>${esc(coverUrl(origin, feed.cover_key))}</url><title>${esc(feed.title)}</title><link>${SITE}/ross</link></image>
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

  if (path === '/me' && method === 'GET') {
    const settled = await settleCheckout(user, env);
    return json(await libraryView(settled.user, request, env, origin));
  }

  if (path === '/checkout' && method === 'POST') {
    const { user: current, openUrl } = await settleCheckout(user, env);
    if (isPaid(current)) return fail('You already have Ross for the year.', 400);
    if (openUrl) return json({ url: openUrl }); // Never two open at once: paying both would charge twice.
    const page = `${request.headers.get('Origin')}/ross`;
    try {
      const session = await stripe(env, '/checkout/sessions', {
        mode: 'payment',
        allow_promotion_codes: 'true',
        success_url: `${page}?paid=1`,
        cancel_url: page,
        expires_at: String(Math.floor(Date.now() / 1000) + 3600),
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': String(YEAR_PRICE_CENTS),
        'line_items[0][price_data][product_data][name]': 'Ross Reads It for a year',
        'line_items[0][price_data][product_data][description]': 'Paid once, with no renewal.',
      });
      await env.DB.prepare('UPDATE users SET checkout_session = ? WHERE library = ?').bind(session.id, user.library).run();
      return json({ url: session.url });
    } catch (err) {
      console.error('checkout', err);
      return fail("Payment isn't working right now. Try again in a little while.", 502);
    }
  }

  if (path === '/tts' && method === 'POST') {
    const { text } = await request.json().catch(() => ({}));
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_TTS_CHARS) return fail('Bad text', 400);
    const hebrew = isHebrew(text);
    if (hebrew && new TextEncoder().encode(text).length > GOOGLE_MAX_BYTES) return fail('Bad text', 400);
    const counters = await speechCounters(user, request, env, hebrew);
    const over = await reserve(env, counters, text.length);
    if (over) return json({ error: 'limit', everyone: over.endsWith(':all') }, 402);
    try {
      if (hebrew) return new Response(await synthesizeHebrew(text, env), { headers: { 'Content-Type': 'audio/wav' } });
      return json({ url: await synthesize(text, env) });
    } catch (err) {
      await refund(env, counters, text.length);
      return fail(String(err.message || err), 502);
    }
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
    const name = String(title || '').trim().slice(0, FEED_TITLE_CHARS);
    if (!name) return fail('Give the feed a name.', 400);
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM feeds WHERE library = ?').bind(user.library).first();
    if (!isPaid(user) && n >= MAX_FEEDS) return fail(`${MAX_FEEDS} feeds is the most you can have.`, 400);
    await createFeed(env, user.library, name);
    return json(await libraryView(user, request, env, origin));
  }

  const coverRoute = path.match(/^\/feeds\/([a-zA-Z0-9_-]{8,64})\/cover$/);
  if (coverRoute && method === 'PUT') {
    const feed = await env.DB.prepare('SELECT * FROM feeds WHERE token = ? AND library = ?').bind(coverRoute[1], user.library).first();
    if (!feed) return fail('Feed not found', 404);
    const body = await request.arrayBuffer();
    const signature = new Uint8Array(body.slice(0, 8)).join();
    if (signature !== '137,80,78,71,13,10,26,10' || body.byteLength > MAX_COVER_BYTES) return fail('That is not a usable cover.', 400);
    if (!isPaid(user)) {
      const over = await reserve(env, [['up:all', UPLOAD_ALL], [`up:${await ipSubject(request, env)}`, UPLOAD_PER_PERSON]], body.byteLength);
      if (over) return json({ error: 'limit' }, 402);
    }
    let shown;
    try {
      shown = decodeURIComponent(request.headers.get('X-Cover-Title') || '').slice(0, 150);
    } catch {
      return fail('Bad title', 400);
    }
    const key = `${feed.token}/cover-${randomHex(8)}.png`;
    await env.AUDIO.put(key, body, { httpMetadata: { contentType: 'image/png' } });
    await env.DB.prepare('UPDATE feeds SET cover_key = ?, cover_title = ? WHERE token = ?').bind(key, shown, feed.token).run();
    if (feed.cover_key) await env.AUDIO.delete(feed.cover_key);
    return json({ coverUrl: coverUrl(origin, key), coverTitle: shown });
  }

  const feedRoute = path.match(/^\/feeds\/([a-zA-Z0-9_-]{8,64})$/);
  if (feedRoute) {
    const feed = await env.DB.prepare('SELECT * FROM feeds WHERE token = ? AND library = ?').bind(feedRoute[1], user.library).first();
    if (!feed) return fail('Feed not found', 404);
    if (method === 'PATCH') {
      const { title } = await request.json().catch(() => ({}));
      const name = String(title || '').trim().slice(0, FEED_TITLE_CHARS);
      if (!name) return fail('Give the feed a name.', 400);
      await env.DB.prepare('UPDATE feeds SET title = ? WHERE token = ?').bind(name, feed.token).run();
      return json(await libraryView(user, request, env, origin));
    }
    if (method === 'DELETE') {
      const { results } = await env.DB.prepare('SELECT r2_key FROM episodes WHERE feed_token = ?').bind(feed.token).all();
      const keys = [...results.map((e) => e.r2_key), ...(feed.cover_key ? [feed.cover_key] : [])];
      if (keys.length) await env.AUDIO.delete(keys);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM episodes WHERE feed_token = ?').bind(feed.token),
        env.DB.prepare('DELETE FROM feeds WHERE token = ?').bind(feed.token),
      ]);
      return json(await libraryView(user, request, env, origin));
    }
  }

  const episodeRoute = path.match(/^\/episodes\/(\d+)$/);
  if (episodeRoute && (method === 'DELETE' || method === 'PATCH')) {
    const episode = await env.DB.prepare(
      'SELECT e.id, e.r2_key FROM episodes e JOIN feeds f ON f.token = e.feed_token WHERE e.id = ? AND f.library = ?',
    ).bind(Number(episodeRoute[1]), user.library).first();
    if (!episode) return fail('Episode not found', 404);
    if (method === 'PATCH') {
      const { title } = await request.json().catch(() => ({}));
      const name = String(title || '').trim().slice(0, EPISODE_TITLE_CHARS);
      if (!name) return fail('Give the episode a title.', 400);
      await env.DB.prepare('UPDATE episodes SET title = ? WHERE id = ?').bind(name, episode.id).run();
      return json(await libraryView(user, request, env, origin));
    }
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
    if (!isPaid(user)) {
      const over = await reserve(env, [['up:all', UPLOAD_ALL], [`up:${await ipSubject(request, env)}`, UPLOAD_PER_PERSON]], body.byteLength);
      if (over) return json({ error: 'limit' }, 402);
    }
    const title = decodeURIComponent(request.headers.get('X-Title') || 'Untitled').trim().slice(0, EPISODE_TITLE_CHARS) || 'Untitled';
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
