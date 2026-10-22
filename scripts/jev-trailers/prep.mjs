#!/usr/bin/env node
// Pack the data the Jev trailers animate into data.js (window.DATA): the sugya maps (one letter per
// segment, upper case where a new sugya begins), the Bechdel results, and the opening of Berakhot 2a.
// Usage: node scripts/jev-trailers/prep.mjs [path/to/sugya-maps]   (default: public/data/sugya-maps)

import fs from 'fs';
import path from 'path';
import { MOVE_ORDER, MOVE_LABELS, PALETTES } from '../../src/lib/sugya.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../..');
const MAPS = process.argv[2] || path.join(ROOT, 'public/data/sugya-maps');
const STRUCTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/talmud-structure.json'), 'utf8'));
const CODE = { mishnah: 'm', question: 'q', answer: 'a', verse: 'v', baraita: 'b', dispute: 'd', ruling: 'r', story: 's', explanation: 'e' };

const pack = (segs) => segs.map(([mv, , ns], i) => (i && ns >= 0.5 ? CODE[mv].toUpperCase() : CODE[mv])).join('');

const shas = STRUCTURE.map((t) => {
  const f = path.join(MAPS, `${t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);
  const m = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { dafim: {} };
  const dafim = {};
  for (const [d, e] of Object.entries(m.dafim)) dafim[d] = pack(e.s);
  return { title: t.title, he: t.heTitle, seder: t.seder, lastDaf: t.lastDaf, dafim };
});

const bechdelFile = path.join(ROOT, 'public/data/bechdel/tanakh.json');
const bechdel = JSON.parse(fs.readFileSync(bechdelFile, 'utf8'));
const src = fs.readFileSync(path.join(ROOT, 'src/pages/mega-bible.astro'), 'utf8');
const BOOKS = [...src.match(/const BOOK_CHAPTERS[^{]*\{([\s\S]*?)\};/)[1].matchAll(/'([^']+)':(\d+)/g)].map((m) => [m[1], +m[2]]);
const level = ([n, t, m]) => (n >= 0.5 ? (t >= 0.5 ? (m >= 0.5 ? 3 : 2) : 1) : 0);
const bechdelRows = BOOKS.map(([book, n]) => ({
  book,
  levels: Array.from({ length: n }, (_, i) => { const r = bechdel.books[book]?.[i + 1]; return r ? level(r) : 0; }).join(''),
  strict: Array.from({ length: n }, (_, i) => { const r = bechdel.books[book]?.[i + 1]; return r && level(r) === 3 && r[3] >= 0.5 ? 1 : 0; }).join(''),
}));

// The first segments of Berakhot 2a, in Hebrew, for the opening shot.
const d = await (await fetch('https://www.sefaria.org/api/texts/Berakhot.2a?lang=bi&context=0')).json();
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const berakhotHe = (d.he || []).slice(0, 6).map(strip);

const counts = {};
let segs = 0, sugyot = 0, dafim = 0;
for (const t of shas) for (const s of Object.values(t.dafim)) {
  dafim++;
  for (const ch of s) { segs++; counts[ch.toLowerCase()] = (counts[ch.toLowerCase()] || 0) + 1; if (ch !== ch.toLowerCase()) sugyot++; }
  sugyot++;   // each daf's first segment opens a sugya on the page
}

const DATA = {
  moves: MOVE_ORDER.map((k) => ({ code: CODE[k], label: MOVE_LABELS[k] })),
  palette: Object.fromEntries(MOVE_ORDER.map((k, i) => [CODE[k], PALETTES.vivid.colors[i]])),
  shas, stats: { dafim, segs, sugyot, counts },
  bechdel: bechdelRows,
  berakhotHe,
};
fs.writeFileSync(path.join(HERE, 'data.js'), `window.DATA=${JSON.stringify(DATA)};\n`);
console.log(`data.js: ${dafim} dafim, ${segs} segments mapped; ${bechdelRows.length} books`);
