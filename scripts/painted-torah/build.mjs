#!/usr/bin/env node
// The Painted Torah: for every chapter of the Torah, Jev picks the most paintable verse and art-directs it,
// then FLUX.2 [klein] 4B paints it. Writes src/data/painted-torah/torah.json and
// public/painted-torah/<book>-<ch>.jpg (+ -t.jpg thumbnails). Resumable: finished chapters are skipped.
//
// Usage: node scripts/painted-torah/build.mjs [--books Genesis,Exodus] [--limit N] [--jev-only] [--repaint "Genesis 3"]
// Needs TYPESAFE_API_KEY and REPLICATE_API_TOKEN (environment or .env). Uses Python + Pillow to resize.

import fs from 'fs';
import { execFileSync } from 'child_process';
import { questions, buildPrompt, BOOKS, parshaOf, parshaSlug } from '../../src/lib/painted-torah.js';

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const JEV_PRICE = 0.042 / 1e6;
const FLUX = 'black-forest-labs/flux-2-klein-4b';
const OUT = './src/data/painted-torah/torah.json';
const INDEX = './src/data/painted-torah/index.json';   // slim per-painting index for /parasha and the Mega Bible
const SEASON = './src/data/phds-on-the-parsha/season-5787.json';
const IMG = './public/painted-torah';
const CACHE = './.cache/painted-torah';

for (const k of ['TYPESAFE_API_KEY', 'REPLICATE_API_TOKEN']) {
  if (!process.env[k] && fs.existsSync('.env')) {
    const m = fs.readFileSync('.env', 'utf8').match(new RegExp(`^${k}=(.*)$`, 'm'));
    if (m) process.env[k] = m[1].trim().replace(/^["']|["']$/g, '');
  }
}

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const onlyBooks = arg('--books')?.split(',');
const limit = +(arg('--limit') || 0);
const jevOnly = process.argv.includes('--jev-only');
const repaint = arg('--repaint');
const alt = arg('--alt')?.split(',').map((x) => x.trim());   // paint Jev's runner-up verse instead (the first keeps turning into lettering)
const reseed = arg('--reseed')?.split(',').map((x) => x.trim());   // chapters to repaint on a fresh seed

fs.mkdirSync('./src/data/painted-torah', { recursive: true });
fs.mkdirSync(IMG, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { chapters: {} };
const weeks = JSON.parse(fs.readFileSync(SEASON, 'utf8')).weeks;
const save = () => {
  fs.writeFileSync(OUT, JSON.stringify(data) + '\n');
  const index = BOOKS.flatMap(([b, n]) => Array.from({ length: n }, (_, i) => data.chapters[`${b} ${i + 1}`]))
    .filter((c) => c && c.img)
    .map((c) => {
      const v = c.pv?.v || c.v;
      const w = parshaOf(weeks, c.book, c.ch, v);
      return { book: c.book, ch: c.ch, v, img: c.img, style: c.a.style, parsha: w?.parsha || '', slug: w ? parshaSlug(w.parsha) : '' };
    });
  fs.writeFileSync(INDEX, JSON.stringify(index) + '\n');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r2 = (x) => Math.round(x * 100) / 100;
const slug = (ref) => ref.toLowerCase().replace(/\s+/g, '-');
const strip = (s) => String(s || '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i class="footnote">[\s\S]*?<\/i>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

async function fetchJson(url, init, tries = 5) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res.json();
      const body = (await res.text()).slice(0, 300);
      if (i >= tries - 1 || (res.status < 500 && res.status !== 429)) throw Object.assign(new Error(`${res.status} ${body}`), { status: res.status });
    } catch (err) {
      if (i >= tries - 1 || (err.status && err.status < 500 && err.status !== 429)) throw err;
    }
    await sleep(1500 * 2 ** i);
  }
}

async function verses(ref) {
  const f = `${CACHE}/${slug(ref)}.json`;
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const get = (v) => fetchJson(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=${v}&return_format=text_only`);
  const [en, he] = await Promise.all([get('english'), get('hebrew')]);
  const out = { en: (en.versions?.[0]?.text || []).map(strip), he: (he.versions?.[0]?.text || []).map(strip), enVersion: en.versions?.[0]?.versionTitle || '' };
  fs.writeFileSync(f, JSON.stringify(out));
  return out;
}

const top = (probs, n = 3) => Object.fromEntries(Object.entries(probs).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, r2(v)]));

let tokens = 0;
async function direct(book, ch) {
  const ref = `${book} ${ch}`;
  const { en, he, enVersion } = await verses(ref);
  const list = en.map((t, i) => [i + 1, t]).filter(([, t]) => t);
  const body = { model: 'jev-latest', state: { chapter: { ref, verses: list.map(([n, t]) => `${n}. ${t}`).join('\n') } }, questions: questions(list) };
  const headers = { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'Content-Type': 'application/json' };
  let r;
  try { r = await fetchJson(TYPESAFE_URL, { method: 'POST', headers, body: JSON.stringify(body) }); }
  catch { r = await fetchJson(TYPESAFE_URL, { method: 'POST', headers: { ...headers, 'TypeSafe-Danger-Zone-Long-Context': 'true' }, body: JSON.stringify(body) }); }
  tokens += r.usage?.input_tokens || 0;
  data.model = r.model || data.model;
  const A = r.answers;
  const v = +A.moment.choice.slice(1);
  const a = { moment: v };
  const p = { moment: top(A.moment.probabilities), mc: r2(A.moment.confidence) };
  for (const k of ['setting', 'time', 'atmosphere', 'shot', 'palette', 'style']) { a[k] = A[k].choice; p[k] = top(A[k].probabilities); }
  for (const k of ['tension', 'scale']) { a[k] = r2(A[k].score); p[k] = Object.fromEntries(Object.entries(A[k].probabilities).map(([l, x]) => [l, r2(x)])); }
  a.divine = r2(A.divine.noul);
  const prompt = buildPrompt({ verse: en[v - 1], a });
  return { book, ch, v, en: en[v - 1], he: he[v - 1] || '', n: list.length, enVersion, a, p, prompt, tokens: r.usage?.input_tokens || 0 };
}

async function paint(ref, c, seed) {
  c.prompt = buildPrompt({ verse: (c.pv || c).en, a: c.a });   // rebuilt so prompt changes apply
  const headers = { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait=60' };
  // FLUX.2 [klein] sometimes letters the verse into the picture. Tesseract reads each painting, and one
  // with two or more confident English words is repainted on a new seed (up to three tries).
  let secs = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const s = seed + attempt * 7919;
    secs += await paintOnce(ref, c, s, headers);
    c.seed = s;
    c.words = lettering(`${IMG}/${slug(ref)}.jpg`);
    c.tries = attempt + 1;
    if (c.words < 2) break;
    console.log(`  ${ref}: ${c.words} words of lettering, repainting`);
  }
  return secs;
}

function lettering(file) {
  try {
    const tsv = execFileSync('tesseract', [file, '-', '--psm', '11', '-l', 'eng', 'tsv'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return tsv.split('\n').slice(1).map((l) => l.split('\t')).filter((f) => +f[10] >= 60 && /^[A-Za-z]{3,}$/.test(f[11] || '')).length;
  } catch { return 0; }
}

async function paintOnce(ref, c, seed, headers) {
  const input = { prompt: c.prompt, aspect_ratio: '3:2', output_format: 'jpg', output_quality: 92, output_megapixels: '1', seed, go_fast: false };
  let pred = await fetchJson(`https://api.replicate.com/v1/models/${FLUX}/predictions`, { method: 'POST', headers, body: JSON.stringify({ input }) });
  while (!['succeeded', 'failed', 'canceled'].includes(pred.status)) { await sleep(1500); pred = await fetchJson(pred.urls.get, { headers }); }
  if (pred.status !== 'succeeded') throw new Error(`${ref}: ${pred.status} ${pred.error || ''}`);
  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const base = `${IMG}/${slug(ref)}`;
  fs.writeFileSync(`${base}.jpg`, buf);
  execFileSync('python3', ['-c', `from PIL import Image
im = Image.open('${base}.jpg').convert('RGB')
im.thumbnail((1080, 1080)); im.save('${base}.jpg', quality=76, optimize=True, progressive=True)
im.thumbnail((480, 480)); im.save('${base}-t.jpg', quality=70, optimize=True, progressive=True)`]);
  return pred.metrics?.predict_time || 0;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const x = items[i++]; await fn(x); } }));
}

let todo = [];
BOOKS.forEach(([book, n], bi) => { if (!onlyBooks || onlyBooks.includes(book)) for (let ch = 1; ch <= n; ch++) todo.push([book, ch, bi]); });
if (limit) todo = todo.slice(0, limit);

// 1. Jev art direction
const needJev = todo.filter(([b, c]) => !data.chapters[`${b} ${c}`]);
await pool(needJev, 8, async ([b, c]) => {
  try { data.chapters[`${b} ${c}`] = await direct(b, c); } catch (err) { console.error(`${b} ${c}: ${err.message}`); }
});
data.built = new Date().toISOString().slice(0, 10);
data.jevTokens = Object.values(data.chapters).reduce((s, c) => s + (c.tokens || 0), 0);
save();
console.log(`Jev: ${needJev.length} chapters directed · ${tokens} tokens · $${(tokens * JEV_PRICE).toFixed(4)} this run`);
if (jevOnly) process.exit(0);

// 2. FLUX paintings
if (repaint) fs.rmSync(`${IMG}/${slug(repaint)}.jpg`, { force: true });
for (const r of alt || []) {
  const c = data.chapters[r];
  if (!c) { console.error(`--alt: unknown chapter ${r}`); continue; }
  const second = Object.keys(c.p.moment).map((k) => +k.slice(1)).find((n) => n !== c.v);
  const { en, he } = await verses(r);
  c.pv = { v: second, en: en[second - 1], he: he[second - 1] || '' };
  fs.rmSync(`${IMG}/${slug(r)}.jpg`, { force: true });
}
for (const r of reseed || []) {
  if (!data.chapters[r]) { console.error(`--reseed: unknown chapter ${r}`); continue; }
  data.chapters[r].reseed = (data.chapters[r].reseed || 0) + 1;
  fs.rmSync(`${IMG}/${slug(r)}.jpg`, { force: true });
}
const needImg = todo.filter(([b, c]) => data.chapters[`${b} ${c}`] && !fs.existsSync(`${IMG}/${slug(`${b} ${c}`)}.jpg`));
let done = 0;
await pool(needImg, 4, async ([b, c, bi]) => {
  const ref = `${b} ${c}`;
  try {
    const t = await paint(ref, data.chapters[ref], 1000 * (bi + 1) + c + 104729 * (data.chapters[ref].reseed || 0));
    data.chapters[ref].img = `/painted-torah/${slug(ref)}.jpg`;
    data.chapters[ref].secs = r2(t);
    console.log(`painted ${ref} (${++done}/${needImg.length})`);
    if (done % 10 === 0) save();
  } catch (err) { console.error(`${ref}: ${err.message}`); }
});
data.images = Object.values(data.chapters).filter((c) => c.img).length;
save();
console.log(`Done: ${data.images} paintings, ${Object.keys(data.chapters).length} chapters directed`);
