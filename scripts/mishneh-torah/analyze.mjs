#!/usr/bin/env node
// The Mishneh Torah, read by Jev: every halakha of all fourteen books, plus one chapter-level pass.
// Texts come from Sefaria's public export bucket (Touger's English, Sefaria's merged Hebrew).
// Writes public/data/mishneh-torah/halakhot.json (one compact row per halakha) and
// public/data/mishneh-torah/chapters.json (each chapter's gem and mood). Resumable: progress is
// kept in a cache file, and finished halakhot are skipped.
//
// Usage: node scripts/mishneh-torah/analyze.mjs [--cache DIR] [--limit N] [--chapters-only]
// Needs TYPESAFE_API_KEY (environment or .env), or a proxy that injects it.

import fs from 'fs';
import path from 'path';
import { HALAKHA_QUESTIONS, chapterQuestions, VOICE, REALM, ACTOR } from '../../src/lib/mishneh-torah-jev.js';

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const BUCKET = 'https://storage.googleapis.com/sefaria-export';
const TOC = 'https://storage.googleapis.com/sefaria-export/table_of_contents.json';
const PRICE = 0.042 / 1e6;
const OUT = './public/data/mishneh-torah';
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const CACHE = arg('--cache') || './.cache/mishneh-torah';
const limit = +(arg('--limit') || 0);
const CONC = +(arg('--concurrency') || 24);

if (!process.env.TYPESAFE_API_KEY && fs.existsSync('.env')) {
  const m = fs.readFileSync('.env', 'utf8').match(/^TYPESAFE_API_KEY=(.*)$/m);
  if (m) process.env.TYPESAFE_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
}
const KEY = process.env.TYPESAFE_API_KEY || 'proxy-injected';

fs.mkdirSync(`${CACHE}/txt`, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r2 = (x) => Math.round(x * 100) / 100;
const strip = (s) => String(s || '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i class="footnote">[\s\S]*?<\/i>/g, '')
  .replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

async function fetchJson(url, init, tries = 6) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res.json();
      const body = (await res.text()).slice(0, 300);
      if (i >= tries - 1 || (res.status < 500 && res.status !== 429)) throw Object.assign(new Error(`${res.status} ${body}`), { status: res.status });
    } catch (err) {
      if (i >= tries - 1 || (err.status && err.status < 500 && err.status !== 429)) throw err;
    }
    await sleep(1000 * 2 ** i);
  }
}
async function cached(file, url) {
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const d = await fetchJson(url);
  fs.writeFileSync(file, JSON.stringify(d));
  return d;
}

// 1. The structure: fourteen books and their hilchot, in Rambam's order.
const toc = await cached(`${CACHE}/toc.json`, TOC);
const find = (n) => { for (const x of n) { if (x.category === 'Mishneh Torah') return x; if (x.contents) { const r = find(x.contents); if (r) return r; } } };
const mt = find(toc);
const hilchot = [];
for (const book of mt.contents) {
  if (!book.contents || ['Introduction', 'Commentary'].includes(book.category)) continue;
  for (const c of book.contents) if (c.title) hilchot.push({ book: book.category, bookHe: book.heCategory, title: c.title, he: c.heTitle });
}

const enc = (s) => encodeURIComponent(s);
async function texts(h) {
  const dir = `Halakhah/Mishneh Torah/${h.book}/${h.title}`;
  const en = await cached(`${CACHE}/txt/${h.title}|English.json`,
    `${BUCKET}/json/${dir.split('/').map(enc).join('/')}/English/${enc('Mishneh Torah, trans. by Eliyahu Touger. Jerusalem, Moznaim Pub. c1986-c2007')}.json`).catch(() => null);
  const he = await cached(`${CACHE}/txt/${h.title}|Hebrew.json`, `${BUCKET}/json/${dir.split('/').map(enc).join('/')}/Hebrew/merged.json`);
  return { en: (en?.text || []).map((c) => c.map(strip)), he: (he.text || []).map((c) => c.map(strip)) };
}

// 2. Every halakha, as [hilchot index, chapter, halakha].
const all = [];
for (const [i, h] of hilchot.entries()) {
  const t = await texts(h);
  h.en = t.en; h.heText = t.he;
  h.chapters = t.he.length;
  t.he.forEach((c, ci) => c.forEach((_, hi) => all.push([i, ci + 1, hi + 1])));
}
console.log(`${hilchot.length} hilchot, ${hilchot.reduce((s, h) => s + h.chapters, 0)} chapters, ${all.length} halakhot`);

const PROGRESS = `${CACHE}/progress.json`;
const prog = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : { h: {}, c: {}, tokens: 0 };
const saveProg = () => fs.writeFileSync(PROGRESS, JSON.stringify(prog));
const headers = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
async function jev(state, questions) {
  const body = JSON.stringify({ model: 'jev-latest', state, questions });
  let r;
  try { r = await fetchJson(TYPESAFE_URL, { method: 'POST', headers, body }); }
  catch { r = await fetchJson(TYPESAFE_URL, { method: 'POST', headers: { ...headers, 'TypeSafe-Danger-Zone-Long-Context': 'true' }, body }); }
  prog.tokens += r.usage?.input_tokens || 0;
  prog.model = r.model || prog.model;
  return r.answers;
}
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

const VK = Object.keys(VOICE), RK = Object.keys(REALM), AK = Object.keys(ACTOR);
const textOf = (h, c, n) => h.en[c - 1]?.[n - 1] || h.heText[c - 1]?.[n - 1] || '';

// 3. Halakha pass.
if (!process.argv.includes('--chapters-only')) {
  let todo = all.filter(([i, c, n]) => !prog.h[`${i}:${c}:${n}`]);
  if (limit) todo = todo.slice(0, limit);
  let done = 0;
  const t0 = Date.now();
  await pool(todo, CONC, async ([i, c, n]) => {
    const h = hilchot[i];
    const text = textOf(h, c, n);
    if (!text) return;
    try {
      const a = await jev({ halakha: { ref: `${h.title.replace('Mishneh Torah, ', '')} ${c}:${n}`, text: text.slice(0, 6000) } }, HALAKHA_QUESTIONS);
      prog.h[`${i}:${c}:${n}`] = [
        VK.indexOf(a.voice.choice), RK.indexOf(a.realm.choice), AK.indexOf(a.actor.choice),
        r2(a.abstraction.score), r2(a.stakes.score), r2(a.warmth.score),
        r2(a.today.noul), r2(a.number.noul), r2(a.why.noul), r2(a.voice.confidence),
      ];
    } catch (err) { console.error(`${h.title} ${c}:${n}: ${err.message}`); }
    if (++done % 250 === 0) {
      saveProg();
      console.log(`${done}/${todo.length} · ${((Date.now() - t0) / 1000).toFixed(0)}s · ${(prog.tokens / 1e6).toFixed(2)}M tokens · $${(prog.tokens * PRICE).toFixed(3)}`);
    }
  });
  saveProg();
}

// 4. Chapter pass: the gem and the mood.
const chaps = hilchot.flatMap((h, i) => h.heText.map((_, ci) => [i, ci + 1])).filter(([i, c]) => !prog.c[`${i}:${c}`]);
await pool(limit ? chaps.slice(0, Math.ceil(limit / 15)) : chaps, Math.ceil(CONC / 2), async ([i, c]) => {
  const h = hilchot[i];
  const list = (h.en[c - 1] || h.heText[c - 1]).map((t, k) => [k + 1, t]).filter(([, t]) => t);
  if (!list.length) return;
  try {
    const a = await jev({ chapter: { ref: `${h.title.replace('Mishneh Torah, ', '')} ${c}`, halakhot: list.map(([n, t]) => `${n}. ${t}`).join('\n') } }, chapterQuestions(list));
    prog.c[`${i}:${c}`] = { gem: +a.gem.choice.slice(1), gc: r2(a.gem.confidence), mood: a.mood.choice };
  } catch (err) { console.error(`${h.title} ${c}: ${err.message}`); }
});
saveProg();

// 5. Write the public data.
const rows = all.map(([i, c, n]) => [i, c, n, ...(prog.h[`${i}:${c}:${n}`] || [])]);
fs.writeFileSync(`${OUT}/halakhot.json`, JSON.stringify({
  model: prog.model, built: new Date().toISOString().slice(0, 10), tokens: prog.tokens,
  fields: ['hilchot', 'chapter', 'halakha', 'voice', 'realm', 'actor', 'abstraction', 'stakes', 'warmth', 'today', 'number', 'why', 'voiceConfidence'],
  voice: VK, realm: RK, actor: AK,
  hilchot: hilchot.map((h) => ({ book: h.book, bookHe: h.bookHe, title: h.title.replace('Mishneh Torah, ', ''), he: h.he, chapters: h.chapters })),
  rows,
}) + '\n');
const chapters = {};
hilchot.forEach((h, i) => h.heText.forEach((_, ci) => {
  const p = prog.c[`${i}:${ci + 1}`];
  if (!p) return;
  chapters[`${i}:${ci + 1}`] = { ...p, en: textOf(h, ci + 1, p.gem), he: h.heText[ci]?.[p.gem - 1] || '' };
}));
fs.writeFileSync(`${OUT}/chapters.json`, JSON.stringify(chapters) + '\n');
console.log(`Done · ${Object.keys(prog.h).length} halakhot · ${Object.keys(prog.c).length} chapters · ${(prog.tokens / 1e6).toFixed(2)}M tokens · $${(prog.tokens * PRICE).toFixed(3)}`);
