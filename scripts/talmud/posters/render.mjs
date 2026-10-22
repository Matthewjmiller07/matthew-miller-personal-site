#!/usr/bin/env node
// Render 18×24 in (5400×7200) sugya-map posters: one per masechet, one per seder, and one for Shas.
// Usage: node scripts/talmud/posters/render.mjs --out <dir> [--maps public/data/sugya-maps]
//        [--palettes illuminated,classic,ink] [--only bekhorot,seder-moed,shas] [--pw <dir with playwright-core>]
// Drives the installed Chrome through playwright-core; each file lands at <out>/<name>/<name>-<palette>-18x24.png.

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PALETTES, MOVE_ORDER, MOVE_LABELS } from '../../../src/lib/sugya.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const OUT = opt('out');
if (!OUT) { console.error('--out is required'); process.exit(1); }
const MAPS = opt('maps', path.join(ROOT, 'public/data/sugya-maps'));
const PALS = opt('palettes', 'illuminated,classic,ink').split(',');
const ONLY = opt('only') ? new Set(opt('only').split(',')) : null;
const { chromium } = await import(path.join(opt('pw', ROOT), 'node_modules/playwright-core/index.mjs'));

const STRUCTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/talmud-structure.json'), 'utf8'));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const rows = STRUCTURE.map((t) => {
  const f = path.join(MAPS, `${slug(t.title)}.json`);
  return { title: t.title, he: t.heTitle, seder: t.seder, lastDaf: t.lastDaf, dafim: fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).dafim : {} };
});
const SEDER_HE = { 'Seder Zeraim': 'סדר זרעים', 'Seder Moed': 'סדר מועד', 'Seder Nashim': 'סדר נשים', 'Seder Nezikin': 'סדר נזיקין', 'Seder Kodashim': 'סדר קדשים', 'Seder Tahorot': 'סדר טהרות' };

const jobs = [
  ...rows.map((r) => ({ name: slug(r.title), kind: 'masechet', title: `Tractate ${r.title}`, he: `מסכת ${r.he}`, sub: 'The flow of the argument, daf by daf', rows: [r] })),
  ...Object.keys(SEDER_HE).map((s) => ({ name: slug(s), kind: 'rows', title: s, he: SEDER_HE[s], sub: 'The flow of the argument, masechet by masechet', rows: rows.filter((r) => r.seder === s) })),
  { name: 'shas', kind: 'rows', title: 'Talmud Bavli', he: 'תלמוד בבלי', sub: 'The flow of the argument, all of Shas', rows },
].filter((j) => !ONLY || ONLY.has(j.name));

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto(`file://${HERE}/poster.html`);
await p.evaluate(() => window.fontsReady());
for (const job of jobs) {
  const dir = path.join(OUT, job.name);
  fs.mkdirSync(dir, { recursive: true });
  for (const pal of PALS) {
    const colors = Object.fromEntries(MOVE_ORDER.map((k, i) => [k, PALETTES[pal].colors[i]]));
    const stats = await p.evaluate((spec) => window.draw(spec), { ...job, colors, labels: MOVE_LABELS, order: MOVE_ORDER });
    const b64 = (await p.evaluate(() => window.png())).replace(/^data:image\/png;base64,/, '');
    const file = path.join(dir, `${job.name}-${pal}-18x24.png`);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    if (pal === PALS[0]) await sharp(file).resize(1080).jpeg({ quality: 85 }).toFile(path.join(dir, `${job.name}-preview.jpg`));
    console.log(job.name, pal, `${stats.dafim} dafim`);
  }
}
await b.close();
