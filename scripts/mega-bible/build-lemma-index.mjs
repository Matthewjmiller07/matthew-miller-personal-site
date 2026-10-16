#!/usr/bin/env node
// Build the Tanakh-wide lemma concordance used by /mega-bible.
//
// Clicking a word in the reader can list every verse in the Tanakh that uses
// the same Strong's lemma. Fetching all 39 OSHB book files (~30 MB) in the
// browser for that would be far too slow, so this script scans them once and
// writes a compact index:
//
//   public/data/lemma-index/verses.json  { books: [osisCode...], v: [[bookIdx, ch, v], ...] }
//   public/data/lemma-index/<shard>.json { "<strong>": { f: [form...], o: [verseIdx, formIdx, ...] } }
//
// A lemma lives in shard (strong % SHARDS), so the reader fetches one small
// file per lemma it looks up. Keys and forms are normalized exactly like the
// reader's own spans: the key is coreLemmaKey() (digits of the OSHB lemma
// attribute, i.e. the root's Strong's number), and the form is the word with
// OSHB "/" markers and niqqud/cantillation removed (span.dataset.word).
//
// Every <w> inside a verse counts, including Qere readings in notes — the same
// set getByTag(verseNode, 'w') renders — so passage and Tanakh counts agree.
//
// Usage: node scripts/mega-bible/build-lemma-index.mjs

import fs from 'fs';
import path from 'path';

const DATA_DIR = './public/parsha-explorer/data';
const OUT_DIR = './public/data/lemma-index';
const SHARDS = 64;

// Canonical Tanakh order (matches BOOK_XML / BOOK_CHAPTERS in mega-bible.astro).
const BOOKS = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', '1Sam', '2Sam', '1Kgs', '2Kgs',
  'Isa', 'Jer', 'Ezek', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab',
  'Zeph', 'Hag', 'Zech', 'Mal', 'Ps', 'Prov', 'Job', 'Song', 'Ruth', 'Lam', 'Eccl',
  'Esth', 'Dan', 'Ezra', 'Neh', '1Chr', '2Chr',
];

const MARKS = /[֑-ׇ]/g;
const surfaceForm = (s) => s.replace(/\//g, '').replace(MARKS, '');
const coreLemmaKey = (lemma) => lemma.replace(/\D/g, '');

const verses = [];
const lemmas = new Map(); // key -> { forms: Map<form, idx>, f: [], o: [] }

BOOKS.forEach((code, bookIdx) => {
  const xml = fs.readFileSync(path.join(DATA_DIR, `${code}.xml`), 'utf8');
  const verseRe = /<verse osisID="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/g;
  let vm;
  while ((vm = verseRe.exec(xml))) {
    const [, osisID, body] = vm;
    const parts = osisID.split('.');
    const ch = parseInt(parts[1], 10);
    const v = parseInt(parts[2], 10);
    const verseIdx = verses.length;
    verses.push([bookIdx, ch, v]);

    const wRe = /<w\b([^>]*)>([^<]*)<\/w>/g;
    let wm;
    while ((wm = wRe.exec(body))) {
      const lemmaAttr = /\blemma="([^"]*)"/.exec(wm[1]);
      if (!lemmaAttr) continue;
      const key = coreLemmaKey(lemmaAttr[1]);
      if (!key) continue;
      const form = surfaceForm(wm[2]);
      let entry = lemmas.get(key);
      if (!entry) { entry = { forms: new Map(), f: [], o: [] }; lemmas.set(key, entry); }
      let fi = entry.forms.get(form);
      if (fi === undefined) { fi = entry.f.length; entry.forms.set(form, fi); entry.f.push(form); }
      entry.o.push(verseIdx, fi);
    }
  }
});

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'verses.json'), JSON.stringify({ books: BOOKS, shards: SHARDS, v: verses }));

const shards = Array.from({ length: SHARDS }, () => ({}));
for (const [key, entry] of lemmas) {
  shards[parseInt(key, 10) % SHARDS][key] = { f: entry.f, o: entry.o };
}
shards.forEach((s, i) => fs.writeFileSync(path.join(OUT_DIR, `${i}.json`), JSON.stringify(s)));

const occ = [...lemmas.values()].reduce((n, e) => n + e.o.length / 2, 0);
console.log(`${verses.length} verses, ${lemmas.size} lemmas, ${occ} word occurrences → ${OUT_DIR}`);
