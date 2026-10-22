#!/usr/bin/env node
// Map masechtot with Jev: for every segment of every daf, what move it makes in the argument and
// whether it opens a new sugya. Writes public/data/sugya-maps/<slug>.json (plus index.json), which
// /mega-talmud shows on each daf and draws as the flow of the argument.
//
// Segments are enumerated exactly as the /mega-talmud reader does (Sefaria v1 texts, per amud,
// min(he, en) segments), so a map lines up with what's on screen. Resumable: dafim already in an
// output file are skipped. Several masechtot run at once; the run stops starting new dafim once
// its spend reaches --budget dollars.
//
// Usage: node scripts/talmud/sugya-map.mjs Bekhorot [Chullin …] [--from 2] [--to 61]
//        node scripts/talmud/sugya-map.mjs --all [--budget 4.75] [--parallel 4]
// Needs TYPESAFE_API_KEY (read from the environment or .env).

import fs from 'fs';
import { MOVE_QUESTION, NEW_SUGYA_QUESTION } from '../../src/lib/sugya.js';

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const CONCURRENCY = 8;                 // segments in flight per masechet
const MAX_TEXT_CHARS = 1500;
const MAX_PREV_CHARS = 700;
const PRICE_PER_TOKEN = 0.042 / 1e6;   // Jev: $0.042 per million input tokens; output is free
const OUT_DIR = './public/data/sugya-maps';
const STRUCTURE = JSON.parse(fs.readFileSync('./src/data/talmud-structure.json', 'utf8'));

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? parseFloat(args[i + 1]) : null; };
const optNames = new Set(['--from', '--to', '--budget', '--parallel']);
const titles = args.includes('--all') ? STRUCTURE.map((t) => t.title)
  : args.filter((a, i) => !a.startsWith('--') && !optNames.has(args[i - 1]));
for (const t of titles) if (!STRUCTURE.some((s) => s.title === t)) {
  console.error(`Unknown tractate "${t}". One of: ${STRUCTURE.map((s) => s.title).join(', ')}`); process.exit(1);
}
if (!titles.length) { console.error('Name a tractate, or pass --all'); process.exit(1); }
const BUDGET = opt('budget') ?? 5;
const PARALLEL = opt('parallel') ?? 1;

if (!process.env.TYPESAFE_API_KEY && fs.existsSync('.env')) {
  const m = fs.readFileSync('.env', 'utf8').match(/^TYPESAFE_API_KEY=(.*)$/m);
  if (m) process.env.TYPESAFE_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
}
if (!process.env.TYPESAFE_API_KEY) { console.error('TYPESAFE_API_KEY is not set'); process.exit(1); }

const strip = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim() : '');
const round = (x) => Math.round(x * 100) / 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dollars = (tok) => `$${(tok * PRICE_PER_TOKEN).toFixed(4)}`;

async function fetchJson(url, init, tries = 5) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res.json();
      if (i >= tries - 1 || (res.status < 500 && res.status !== 429)) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    } catch (err) {
      if (i >= tries - 1) throw err;
    }
    await sleep(1000 * 2 ** i);
  }
}

async function segmentsOf(title, daf) {
  const d = await fetchJson(`https://www.sefaria.org/api/texts/${title.replace(/ /g, '_')}.${daf}?lang=bi&context=0`);
  // A daf that is only amud a (the last daf of some masechtot) comes back flat, not per amud.
  const flat = typeof (d.he || [])[0] === 'string';
  const he = flat ? [d.he] : d.he || [], en = flat ? [d.text || []] : d.text || [];
  const segs = [];
  let amudA = 0;
  he.forEach((hePart, pi) => {
    const enPart = en[pi] || [];
    const count = Math.min((hePart || []).length, enPart.length);
    for (let i = 0; i < count; i++) segs.push({ he: strip(hePart[i]), en: strip(enPart[i]) });
    if (pi === 0) amudA = count;
  });
  return { segs, amudA };
}

let tokens = 0;          // this run, all masechtot
let model = MODEL;
let overBudget = false;

async function judge(ref, segs, i) {
  const state = {
    daf: ref,
    previous: (i ? segs[i - 1].en : '').slice(0, MAX_PREV_CHARS) || '(start of the daf)',
    segment: { hebrew: segs[i].he.slice(0, MAX_TEXT_CHARS), english: segs[i].en.slice(0, MAX_TEXT_CHARS) },
  };
  const r = await fetchJson(TYPESAFE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, state, questions: { move: MOVE_QUESTION, newSugya: NEW_SUGYA_QUESTION } }),
  });
  tokens += r.usage?.input_tokens || 0;
  if (r.model) model = r.model;
  return [r.answers.move.choice, round(r.answers.move.confidence), round(r.answers.newSugya.noul)];
}

async function pool(n, items, fn) {
  const res = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const k = next++; res[k] = await fn(items[k], k); }
  }));
  return res;
}

async function mapTractate(title) {
  const tractate = STRUCTURE.find((t) => t.title === title);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const outPath = `${OUT_DIR}/${slug}.json`;
  const out = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : { tractate: title, heTitle: tractate.heTitle, seder: tractate.seder, model: MODEL, dafim: {} };
  const from = opt('from') ?? 2;
  const to = Math.min(opt('to') ?? tractate.lastDaf, tractate.lastDaf);
  let mapped = 0;
  for (let daf = from; daf <= to; daf++) {
    if (out.dafim[daf]) continue;
    if (tokens * PRICE_PER_TOKEN >= BUDGET) { overBudget = true; break; }
    const ref = `${title} ${daf}`;
    try {
      const { segs, amudA } = await segmentsOf(title, daf);
      if (!segs.length) { console.log(`${ref}: no text`); continue; }
      const s = await pool(CONCURRENCY, segs, (_, i) => judge(ref, segs, i));
      out.dafim[daf] = { a: amudA, s };
      out.model = model;
      out.mapped = new Date().toISOString().slice(0, 10);
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(out) + '\n');
      mapped++;
    } catch (err) {
      console.error(`${ref}: ${err.message}`);   // left unmapped; a rerun picks it up
    }
  }
  const total = Object.keys(out.dafim).length;
  console.log(`${title}: +${mapped} dafim (${total}/${tractate.lastDaf - 1}) · run so far ${(tokens / 1e6).toFixed(1)}M tokens · ${dollars(tokens)}`);
}

const queue = [...titles];
await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
  while (queue.length && !overBudget) await mapTractate(queue.shift());
}));

// Index of mapped masechtot, for the reader and the flow view.
fs.mkdirSync(OUT_DIR, { recursive: true });
const index = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => {
  const m = JSON.parse(fs.readFileSync(`${OUT_DIR}/${f}`, 'utf8'));
  return { tractate: m.tractate, heTitle: m.heTitle, slug: f.replace(/\.json$/, ''), dafim: Object.keys(m.dafim).length };
});
fs.writeFileSync(`${OUT_DIR}/index.json`, JSON.stringify(index) + '\n');
console.log(`${overBudget ? 'Stopped at the budget' : 'Done'} · this run ${(tokens / 1e6).toFixed(2)}M tokens · ${dollars(tokens)}`);
