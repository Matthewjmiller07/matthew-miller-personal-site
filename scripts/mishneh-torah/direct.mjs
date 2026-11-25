#!/usr/bin/env node
// One painting for each of the fourteen books of the Mishneh Torah, directed from Jev's answers in
// analyze.mjs (no new model calls). Code builds the FLUX.2 [klein] 4B prompt. Writes src/data/mishneh-torah/paintings.json; the paintings themselves are made from those prompts
// (seeded by book number) and saved as public/yad/book-<n>.jpg.
//
// Usage: node scripts/mishneh-torah/direct.mjs [--cache DIR]

import fs from 'fs';
import { sceneText, OPTIONS } from '../../src/lib/painted-torah.js';

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const CACHE = arg('--cache') || './.cache/mishneh-torah';
const D = JSON.parse(fs.readFileSync('./public/data/mishneh-torah/halakhot.json', 'utf8'));
const S = JSON.parse(fs.readFileSync('./src/data/mishneh-torah/summary.json', 'utf8'));
const strip = (s) => String(s || '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i class="footnote">[\s\S]*?<\/i>/g, '')
  .replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\[[^\]]*\]/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const en = D.hilchot.map((h) => { try { return JSON.parse(fs.readFileSync(`${CACHE}/txt/Mishneh Torah, ${h.title}|English.json`, 'utf8')).text; } catch { return []; } });
const he = D.hilchot.map((h) => { try { return JSON.parse(fs.readFileSync(`${CACHE}/txt/Mishneh Torah, ${h.title}|Hebrew.json`, 'utf8')).text; } catch { return []; } });

export const SETTINGS = {
  study: ['Study hall', 'a candlelit study hall lined with books and scrolls'],
  home: ['Home', 'the inside of a stone house in a medieval Mediterranean town'],
  field: ['Field', 'open fields and terraced hills under a wide sky'],
  vineyard: ['Vineyard & orchard', 'a vineyard and orchard of olive and fig trees'],
  market: ['Market', 'a busy market street with stalls, scales and goods'],
  court: ['Court', 'a hall of judgement with elders seated in a half circle'],
  temple: ['Temple', 'the great courtyard of an ancient temple of white stone and gold, an altar with smoke'],
  gate: ['City gate', 'the gate of an old walled city'],
  water: ['Water', 'a spring, a ritual pool or a river'],
  night: ['Night sky', 'a vast night sky over the hills'],
};
const LIGHT = { dawn: 'at dawn, first light low on the horizon', day: 'in bright daylight', dusk: 'at dusk, long warm shadows', night: 'at night, by lamp or moonlight' };

// No new model calls: every choice comes from answers Jev already gave in analyze.mjs.
// The moment: of the halakhot Jev chose as each chapter's gem, the one in this book Jev scored most concrete
// (short, physical, not about the mind, nothing violent). The art direction: the book's own Jev profile.
const C = JSON.parse(fs.readFileSync('./public/data/mishneh-torah/chapters.json', 'utf8'));
const ROW = Object.fromEntries(D.rows.filter((r) => r.length > 3).map((r) => [`${r[0]}:${r[1]}:${r[2]}`, r]));
const VIOLENT = /\b(kill|killed|slay|stone[ds]?|stoning|execut\w*|blood|corpse|dead|death|die[sd]?|lashes|burn(ed|ing)?|strangl\w*|sword|naked|nude|leprosy|zav|menstrua\w*|semen|intercourse|idol\w*|ejaculat\w*|member|genital\w*|testicle\w*|sacs?|fetus|womb|pregnan\w*|divorce\w*|scorpion|snake|bitten|excrement|dying|gentiles?|calculations?|murderers?|slaughter\w*)\b/i;
const BY_REALM = {   // the book's dominant realm sets the scene and palette
  mind: ['study', 'night'], body: ['home', 'earth'], food: ['home', 'ember'], creatures: ['temple', 'ochre'],
  land: ['field', 'verdant'], things: ['home', 'pearl'], money: ['market', 'earth'], places: ['temple', 'ochre'],
  time: ['home', 'ember'], words: ['study', 'night'], people: ['gate', 'ochre'],
};
// Paintings repainted on a new seed: 8 lettered the frieze on its first seed.
const SEEDS = { 8: 12927 };
const out = [];
for (const b of S.books) {
  const realm = D.realm[b.realm.indexOf(Math.max(...b.realm))];
  const gems = Object.entries(C)
    .filter(([k]) => b.hilchot.includes(+k.split(':')[0]))
    .map(([k, g]) => { const [i, c] = k.split(':').map(Number); const r = ROW[`${i}:${c}:${g.gem}`]; return { i, c, n: g.gem, r, gc: g.gc, t: strip(en[i][c - 1]?.[g.gem - 1]) }; })
    .filter((x) => x.r && x.t && x.t.split(' ').length <= 90 && !VIOLENT.test(x.t) && (realm === 'mind' || D.realm[x.r[4]] !== 'mind'))
    .sort((x, y) => (x.r[6] > 1.5) - (y.r[6] > 1.5) || y.r[8] - x.r[8] || x.r[6] - y.r[6]);
  const x = gems[0];
  if (!x) { console.error(`${b.en}: no candidate`); continue; }
  const [setting, palette] = BY_REALM[realm];
  const a = {
    setting: b.en === 'Service' || b.en === 'Offerings' ? 'temple' : D.realm[x.r[4]] === 'land' ? 'vineyard' : D.realm[x.r[4]] === 'money' ? 'market' : setting,
    time: b.warmth >= 0.75 ? 'dawn' : b.stakes >= 2 ? 'dusk' : b.today < 0.1 ? 'day' : 'day',
    palette,
    style: b.abstraction >= 2.2 ? 'luminist' : b.today < 0.1 ? 'manuscript' : b.warmth >= 0.75 ? 'chiaroscuro' : b.stakes >= 2.1 ? 'chiaroscuro' : realm === 'land' ? 'watercolor' : realm === 'money' ? 'fresco' : realm === 'things' ? 'mosaic' : 'watercolor',
  };
  const prompt = [
    `${OPTIONS.style[a.style][1]}, a full-bleed painting depicting ${sceneText(x.t)};`,
    `${SETTINGS[a.setting][1]}, ${LIGHT[a.time]};`,
    `palette of ${OPTIONS.palette[a.palette][1]};`,
    'medieval Mediterranean Jewish life, every person in simple modest robes and head coverings, faces calm and dignified.',
  ].join(' ');
  const ref = `${D.hilchot[x.i].title} ${x.c}:${x.n}`;
  out.push({ num: b.num, book: b.book, en: b.en, he: b.he, ref, text: x.t, heText: strip(he[x.i][x.c - 1]?.[x.n - 1]), realm, a, prompt, seed: SEEDS[b.num] || 5000 + b.num, img: `/yad/book-${b.num}.jpg` });
  console.log(`${b.en}: ${ref} · ${a.style}/${a.setting}/${a.time}/${a.palette}\n  ${prompt}`);
}
fs.writeFileSync('./src/data/mishneh-torah/paintings.json', JSON.stringify(out, null, 1) + '\n');
