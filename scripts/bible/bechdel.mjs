#!/usr/bin/env node
// Run the Bechdel test on every chapter of Tanakh with Jev and write public/data/bechdel/tanakh.json:
// { model, tested, books: { Genesis: { "30": [named, talk, notMan, notManStrict], ... }, ... } }.
// Resumable: chapters already in the file are skipped.
//
// Usage: node scripts/bible/bechdel.mjs [Book ...]     (default: all of Tanakh)
// Needs TYPESAFE_API_KEY (read from the environment or .env).

import fs from 'fs';
import { BECHDEL_QUESTIONS } from '../../src/lib/bechdel.js';

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const CONCURRENCY = 16;
const PRICE_PER_TOKEN = 0.042 / 1e6;   // Jev: $0.042 per million input tokens; output is free
const OUT = './public/data/bechdel/tanakh.json';

// Same books and chapter counts as /mega-bible.
const src = fs.readFileSync('./src/pages/mega-bible.astro', 'utf8');
const BOOK_CHAPTERS = Object.fromEntries(
  [...src.match(/const BOOK_CHAPTERS[^{]*\{([\s\S]*?)\};/)[1].matchAll(/'([^']+)':(\d+)/g)].map((m) => [m[1], +m[2]]),
);

if (!process.env.TYPESAFE_API_KEY && fs.existsSync('.env')) {
  const m = fs.readFileSync('.env', 'utf8').match(/^TYPESAFE_API_KEY=(.*)$/m);
  if (m) process.env.TYPESAFE_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
}
if (!process.env.TYPESAFE_API_KEY) { console.error('TYPESAFE_API_KEY is not set'); process.exit(1); }

const books = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(BOOK_CHAPTERS);
for (const b of books) if (!BOOK_CHAPTERS[b]) { console.error(`Unknown book "${b}"`); process.exit(1); }

fs.mkdirSync('./public/data/bechdel', { recursive: true });
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { model: MODEL, books: {} };
const strip = (s) => s.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i class="footnote">[\s\S]*?<\/i>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const round = (x) => Math.round(x * 100) / 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, init, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res.json();
      const body = (await res.text()).slice(0, 200);
      if (i >= tries - 1 || (res.status < 500 && res.status !== 429)) throw Object.assign(new Error(`${res.status} ${body}`), { status: res.status });
    } catch (err) {
      if (i >= tries - 1 || (err.status && err.status < 500 && err.status !== 429)) throw err;
    }
    await sleep(1000 * 2 ** i);
  }
}

let tokens = 0;
async function test(book, ch) {
  const d = await fetchJson(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(`${book} ${ch}`)}?version=english&return_format=text_only`);
  const text = (d.versions?.[0]?.text || []).map(strip).join(' ');
  const body = { model: MODEL, state: { passage: { ref: `${book} ${ch}`, text } }, questions: BECHDEL_QUESTIONS };
  const headers = { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'Content-Type': 'application/json' };
  let r;
  try {
    r = await fetchJson(TYPESAFE_URL, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (err) {
    // Very long chapters (Numbers 7, Psalms 119) may need the long-context opt-in.
    r = await fetchJson(TYPESAFE_URL, { method: 'POST', headers: { ...headers, 'TypeSafe-Danger-Zone-Long-Context': 'true' }, body: JSON.stringify(body) });
  }
  tokens += r.usage?.input_tokens || 0;
  if (r.model) out.model = r.model;
  const a = r.answers;
  return [round(a.named.noul), round(a.talk.noul), round(a.notMan.noul), round(a.notManStrict.noul)];
}

for (const book of books) {
  out.books[book] = out.books[book] || {};
  const todo = [];
  for (let ch = 1; ch <= BOOK_CHAPTERS[book]; ch++) if (!out.books[book][ch]) todo.push(ch);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, async () => {
    while (next < todo.length) {
      const ch = todo[next++];
      try { out.books[book][ch] = await test(book, ch); } catch (err) { console.error(`${book} ${ch}: ${err.message}`); }
    }
  }));
  out.tested = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  const passes = Object.values(out.books[book]).filter(([n, t, m]) => n >= 0.5 && t >= 0.5 && m >= 0.5).length;
  console.log(`${book}: ${Object.keys(out.books[book]).length} chapters, ${passes} pass · ${(tokens / 1e6).toFixed(2)}M tokens · $${(tokens * PRICE_PER_TOKEN).toFixed(4)} so far`);
}
console.log(`Done · ${(tokens / 1e6).toFixed(2)}M tokens · $${(tokens * PRICE_PER_TOKEN).toFixed(4)}`);
