#!/usr/bin/env node
// How often does each produce word occur in the Tanakh? For the first verse of every crate in
// src/data/produce-aisle.ts, find the produce word in that verse in the OSHB morphology (the same
// files the Mega Bible and the parasha sheets read), take its Strong's lemma, and count that lemma
// across all 39 books. A count of 1 is a hapax legomenon.
//
//   node scripts/produce-aisle/count-words.mjs   → src/data/produce-aisle-tanakh.json

import fs from 'fs';
import path from 'path';

const DATA_DIR = './public/parsha-explorer/data';
const OUT = './src/data/produce-aisle-tanakh.json';
const BOOKS = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','1Sam','2Sam','1Kgs','2Kgs','Isa','Jer','Ezek','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal','Ps','Prov','Job','Song','Ruth','Lam','Eccl','Esth','Dan','Ezra','Neh','1Chr','2Chr'];
const OSIS = { Genesis: 'Gen', Exodus: 'Exod', Leviticus: 'Lev', Numbers: 'Num', Deuteronomy: 'Deut', '2 Samuel': '2Sam', '2 Kings': '2Kgs', Isaiah: 'Isa', Jeremiah: 'Jer', Ezekiel: 'Ezek', Joel: 'Joel', Micah: 'Mic', Psalms: 'Ps', Proverbs: 'Prov', 'Song of Songs': 'Song' };
const NAMES = Object.fromEntries(Object.entries(OSIS).map(([k, v]) => [v, k]));
const ALL_NAMES = { Gen:'Genesis',Exod:'Exodus',Lev:'Leviticus',Num:'Numbers',Deut:'Deuteronomy',Josh:'Joshua',Judg:'Judges','1Sam':'1 Samuel','2Sam':'2 Samuel','1Kgs':'1 Kings','2Kgs':'2 Kings',Isa:'Isaiah',Jer:'Jeremiah',Ezek:'Ezekiel',Hos:'Hosea',Joel:'Joel',Amos:'Amos',Obad:'Obadiah',Jonah:'Jonah',Mic:'Micah',Nah:'Nahum',Hab:'Habakkuk',Zeph:'Zephaniah',Hag:'Haggai',Zech:'Zechariah',Mal:'Malachi',Ps:'Psalms',Prov:'Proverbs',Job:'Job',Song:'Song of Songs',Ruth:'Ruth',Lam:'Lamentations',Eccl:'Ecclesiastes',Esth:'Esther',Dan:'Daniel',Ezra:'Ezra',Neh:'Nehemiah','1Chr':'1 Chronicles','2Chr':'2 Chronicles' };
void NAMES;

// The produce word as it is spelled (unpointed, prefixes allowed) in each crate's first verse.
const WORD = {
  grapes: 'ענבים', fig: 'תאנה', pomegranate: 'רמני', olive: 'זית', dates: 'תמר',
  kishu: 'קשאים', avatiach: 'אבטחים', leek: 'חציר', onion: 'בצלים', garlic: 'שומים',
  gourd: 'פקעת', carrot: 'גזרים', tapuz: 'תפוחי', agvaniya: 'תעגב', potato: 'אדמה',
  apple: 'תפוח', lemon: 'הדר', lettuce: 'מררים', cabbage: 'כרבים', coriander: 'גד',
  almond: 'שקד', walnut: 'אגוז', fava: 'פול', lentils: 'עדשים',
};

const strip = (s) => s.replace(/\//g, '').replace(/[֑-ׇ]/g, '');
const key = (lemma) => lemma.replace(/\D/g, '');

const verseWords = new Map(); // "Num.11.5" -> [{form, key}]
const occ = new Map();        // lemma key -> [[book, ch, v], ...]
for (const b of BOOKS) {
  const xml = fs.readFileSync(path.join(DATA_DIR, `${b}.xml`), 'utf8');
  const verseRe = /<verse osisID="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/g;
  let vm;
  while ((vm = verseRe.exec(xml))) {
    const [, id, body] = vm;
    const [, ch, v] = id.split('.').map((x, i) => (i ? +x : x));
    const words = [];
    const wRe = /<w\b([^>]*)>([^<]*)<\/w>/g;
    let wm;
    while ((wm = wRe.exec(body))) {
      const l = /\blemma="([^"]*)"/.exec(wm[1]);
      if (!l) continue;
      const k = key(l[1]);
      if (!k) continue;
      words.push({ form: strip(wm[2]), key: k });
      if (!occ.has(k)) occ.set(k, []);
      occ.get(k).push([b, ch, v]);
    }
    verseWords.set(id, words);
  }
}

const src = fs.readFileSync('./src/data/produce-aisle.ts', 'utf8');
const out = {};
for (const [id, word] of Object.entries(WORD)) {
  const m = new RegExp(`id: '${id}'[\\s\\S]*?verses: \\[\\s*\\{ book: '([^']+)', ch: (\\d+), v: (\\d+)`).exec(src);
  if (!m) { console.warn('no verse for', id); continue; }
  const osis = `${OSIS[m[1]]}.${m[2]}.${m[3]}`;
  const w = (verseWords.get(osis) || []).find((x) => x.form.includes(word));
  if (!w) { console.warn(`${id}: ${word} not found in ${osis}`); continue; }
  const list = occ.get(w.key);
  const verses = [...new Set(list.map((r) => r.join('.')))];
  const first = verses.find((x) => x !== osis.replace(/\./g, '.')) ?? null;
  out[id] = {
    word, strong: `H${w.key}`, count: list.length, verses: verses.length,
    hapax: list.length === 1,
    // up to four other places it turns up, for the card
    elsewhere: verses.filter((x) => x !== osis).slice(0, 4).map((x) => { const [b, c, v] = x.split('.'); return { book: ALL_NAMES[b], ch: +c, v: +v }; }),
  };
  void first;
  console.log(`${id.padEnd(12)} ${word.padEnd(8)} H${w.key.padEnd(5)} ${String(list.length).padStart(4)}×  ${verses.length} verses${list.length === 1 ? '  HAPAX' : ''}`);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log('→', OUT);
