#!/usr/bin/env node
// Aggregate Jev's reading of the Mishneh Torah (public/data/mishneh-torah/*.json, from analyze.mjs) into
// src/data/mishneh-torah/summary.json: per-book and per-hilchot profiles, superlatives with their text,
// and the headline numbers the page /yad is built on.
//
// Usage: node scripts/mishneh-torah/insights.mjs [--cache DIR]   (same cache as analyze.mjs, for the texts)

import fs from 'fs';
import { BOOKS_EN } from '../../src/lib/mishneh-torah-jev.js';

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const CACHE = arg('--cache') || './.cache/mishneh-torah';
const D = JSON.parse(fs.readFileSync('./public/data/mishneh-torah/halakhot.json', 'utf8'));
const C = JSON.parse(fs.readFileSync('./public/data/mishneh-torah/chapters.json', 'utf8'));
const strip = (s) => String(s || '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i class="footnote">[\s\S]*?<\/i>/g, '')
  .replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const texts = D.hilchot.map((h) => {
  const read = (l) => { try { return JSON.parse(fs.readFileSync(`${CACHE}/txt/Mishneh Torah, ${h.title}|${l}.json`, 'utf8')).text; } catch { return []; } };
  return { en: read('English'), he: read('Hebrew') };
});
const text = (i, c, n) => ({ en: strip(texts[i].en[c - 1]?.[n - 1]), he: strip(texts[i].he[c - 1]?.[n - 1]) });
const r = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const rows = D.rows.filter((x) => x.length > 3).map(([i, c, n, voice, realm, actor, abstraction, stakes, warmth, today, number, why, conf]) =>
  ({ i, c, n, voice, realm, actor, abstraction, stakes, warmth, today, number, why, conf, words: (texts[i].he[c - 1]?.[n - 1] || '').split(/\s+/).length }));

const profile = (rs) => {
  const share = (k, n) => Array.from({ length: n }, (_, j) => r(rs.filter((x) => x[k] === j).length / rs.length, 3));
  return {
    n: rs.length,
    voice: share('voice', D.voice.length), realm: share('realm', D.realm.length), actor: share('actor', D.actor.length),
    abstraction: r(mean(rs.map((x) => x.abstraction))), stakes: r(mean(rs.map((x) => x.stakes))), warmth: r(mean(rs.map((x) => x.warmth))),
    today: r(rs.filter((x) => x.today >= 0.5).length / rs.length, 3),
    number: r(rs.filter((x) => x.number >= 0.5).length / rs.length, 3),
    why: r(rs.filter((x) => x.why >= 0.5).length / rs.length, 3),
    words: rs.reduce((s, x) => s + x.words, 0),
  };
};

const bookNames = [...new Set(D.hilchot.map((h) => h.book))];
const books = bookNames.map((b, bi) => {
  const idx = D.hilchot.map((h, i) => (h.book === b ? i : -1)).filter((i) => i >= 0);
  return { book: b, he: D.hilchot[idx[0]].bookHe, en: BOOKS_EN[b] || b, num: bi + 1, hilchot: idx, ...profile(rows.filter((x) => idx.includes(x.i))) };
});
const hilchot = D.hilchot.map((h, i) => ({ ...h, i, ...profile(rows.filter((x) => x.i === i)) }));

// Chapter series: one point per chapter, in order, for the seismograph.
const series = [];
D.hilchot.forEach((h, i) => { for (let c = 1; c <= h.chapters; c++) {
  const rs = rows.filter((x) => x.i === i && x.c === c);
  if (!rs.length) continue;
  const g = C[`${i}:${c}`];
  series.push({ i, c, n: rs.length, stakes: r(mean(rs.map((x) => x.stakes))), warmth: r(mean(rs.map((x) => x.warmth))), abstraction: r(mean(rs.map((x) => x.abstraction))), today: r(mean(rs.map((x) => (x.today >= 0.5 ? 1 : 0)))), mood: g?.mood || '' });
}});

// Superlatives: the halakha that is most X, with its text.
const ref = (x) => `${D.hilchot[x.i].title} ${x.c}:${x.n}`;
const pick = (key, sorter, filter = () => true, k = 3) => rows.filter(filter).sort(sorter).slice(0, k).map((x) => ({ ref: ref(x), i: x.i, c: x.c, n: x.n, [key]: x[key], ...text(x.i, x.c, x.n) }));
const short = (x) => x.words <= 80;
const superlatives = {
  warmest: pick('warmth', (a, b) => b.warmth - a.warmth || b.conf - a.conf, (x) => short(x) && x.stakes >= 1.5),
  gravest: pick('stakes', (a, b) => b.stakes - a.stakes, short),
  abstract: pick('abstraction', (a, b) => b.abstraction - a.abstraction, (x) => short(x) && x.voice !== D.voice.indexOf('belief')),
  coldest: pick('warmth', (a, b) => a.warmth - b.warmth || b.stakes - a.stakes, (x) => short(x) && x.stakes >= 3),
  why: pick('why', (a, b) => b.why - a.why || b.warmth - a.warmth, (x) => short(x) && x.realm !== D.realm.indexOf('mind') && x.stakes >= 1.5),
};

// Crossovers that tell a story.
const cross = (k1, v1, k2, v2) => rows.filter((x) => x[k1] === v1 && x[k2] === v2).length;
const totalWords = rows.reduce((s, x) => s + x.words, 0);
const todayRows = rows.filter((x) => x.today >= 0.5);
const totals = {
  ...profile(rows),
  hilchotCount: D.hilchot.length, chapterCount: series.length, books: books.length,
  todayWords: todayRows.reduce((s, x) => s + x.words, 0), totalWords,
  reasonsByVoice: D.voice.map((_, v) => r(rows.filter((x) => x.voice === v && x.why >= 0.5).length / Math.max(1, rows.filter((x) => x.voice === v).length), 3)),
  warmthByActor: D.actor.map((_, a) => r(mean(rows.filter((x) => x.actor === a).map((x) => x.warmth)))),
  stakesByRealm: D.realm.map((_, a) => r(mean(rows.filter((x) => x.realm === a).map((x) => x.stakes)))),
  warmthByRealm: D.realm.map((_, a) => r(mean(rows.filter((x) => x.realm === a).map((x) => x.warmth)))),
  moneyWarm: r(mean(rows.filter((x) => x.realm === D.realm.indexOf('money')).map((x) => x.warmth))),
  // correlation of stakes and warmth over all halakhot
  corr: (() => {
    const mx = mean(rows.map((x) => x.stakes)), my = mean(rows.map((x) => x.warmth));
    const sxy = rows.reduce((s, x) => s + (x.stakes - mx) * (x.warmth - my), 0);
    const sx = Math.sqrt(rows.reduce((s, x) => s + (x.stakes - mx) ** 2, 0)), sy = Math.sqrt(rows.reduce((s, x) => s + (x.warmth - my) ** 2, 0));
    return r(sxy / sx / sy, 3);
  })(),
  everyoneCases: cross('actor', D.actor.indexOf('everyone'), 'voice', D.voice.indexOf('case')),
};

// The moods of chapters, counted.
const moods = {};
Object.values(C).forEach((c) => { moods[c.mood] = (moods[c.mood] || 0) + 1; });

// Inside and outside the Land (scripts/mishneh-torah/israel.mjs): [israel, diaspora] Nouls per halakha.
// "Clearly" means Jev's two answers differ by 0.4 or more; smaller gaps are near coin-flips.
const IS = fs.existsSync('./public/data/mishneh-torah/israel.json') ? JSON.parse(fs.readFileSync('./public/data/mishneh-torah/israel.json', 'utf8')).h : null;
let israel = null;
if (IS) {
  // Where the two answers are close (gap under 0.4), they are one judgement asked twice: both take their mean.
  const iv = (x) => { const a = IS[`${x.i}:${x.c}:${x.n}`]; if (!a) return a; if (Math.abs(a[0] - a[1]) >= 0.4) return a; const m = (a[0] + a[1]) / 2; return [m, m, a]; };
  const prof = (rs) => {
    const v = rs.map(iv).filter(Boolean);
    return { n: v.length, israel: r(v.filter((a) => a[0] >= 0.5).length / v.length, 3), diaspora: r(v.filter((a) => a[1] >= 0.5).length / v.length, 3),
      only: v.filter((a) => a[0] >= 0.5 && a[1] < 0.5).length, clear: v.filter((a) => a[0] - a[1] >= 0.4).length, reverseClear: v.filter((a) => a[1] - a[0] >= 0.4).length,
      reverseRaw: v.filter((a) => a[2] && a[2][1] >= 0.5 && a[2][0] < 0.5).length };
  };
  const sections = D.hilchot.map((h, i) => ({ title: h.title, ...prof(rows.filter((x) => x.i === i)) })).sort((a, b) => (b.israel - b.diaspora) - (a.israel - a.diaspora));
  const only = rows.filter((x) => { const a = iv(x); return a && a[0] - a[1] >= 0.4; });
  israel = {
    ...prof(rows),
    books: books.map((b) => ({ en: b.en, ...prof(rows.filter((x) => b.hilchot.includes(x.i))) })),
    sections: sections.slice(0, 8),
    seedsShare: r(only.filter((x) => books.find((b) => b.en === 'Seeds').hilchot.includes(x.i)).length / only.length, 3),
    examples: ['Tithes', 'Sabbatical Year and the Jubilee', 'Gifts to the Poor'].map((t) => {
      const i = D.hilchot.findIndex((h) => h.title === t);
      const x = only.filter((y) => y.i === i && y.words <= 70).sort((a, b) => (iv(b)[0] - iv(b)[1]) - (iv(a)[0] - iv(a)[1]))[0];
      return x && { ref: ref(x), c: x.c, n: x.n, ...text(x.i, x.c, x.n) };
    }).filter(Boolean),
  };
}

fs.mkdirSync('./src/data/mishneh-torah', { recursive: true });
fs.writeFileSync('./src/data/mishneh-torah/summary.json', JSON.stringify({
  model: D.model, built: D.built, tokens: D.tokens, voice: D.voice, realm: D.realm, actor: D.actor,
  totals, books, hilchot, series, superlatives, moods, israel,
}) + '\n');
console.log(JSON.stringify({ totals, moods, books: books.map((b) => [b.en, b.n, b.today, b.warmth, b.stakes, b.why]) }, null, 1));
