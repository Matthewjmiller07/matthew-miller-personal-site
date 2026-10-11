// Render trailer.html frame by frame. Usage: node render.mjs <horizontal|vertical> <worker> <nworkers>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
const here = new URL('.', import.meta.url).pathname;
const root = here + '../../../';
const [orient = 'horizontal', W = 0, NW = 1] = process.argv.slice(2);
const w = +W, nw = +NW, V = orient === 'vertical';
const people = JSON.parse(fs.readFileSync(root + 'src/data/genealogies/people.json'));
const names = JSON.parse(fs.readFileSync(root + 'public/data/genealogies/names.json'));
const tot = (s) => Object.values(names.names[s]?.totals || {}).reduce((a, b) => a + b, 0);
const last = (s, pre = '') => Object.entries(names.names[s].series).filter(([k]) => k.startsWith(pre)).reduce((t, [, a]) => t + a.at(-1), 0);
const spell = [...new Set(people.filter((p) => !p.homograph).flatMap((p) => p.names))];
const nim = names.names['נמרוד'].peak, yis = names.names['יסכה'].peak;
const ND = {
  names: names.names,
  total: spell.reduce((t, s) => t + tot(s), 0),
  yuval: tot('יובל'),
  adam2024: [['Jewish', '#3987e5'], ['Muslim', '#d95926'], ['Christian-Arab', '#199e70'], ['Druze', '#c98500']]
    .map(([g, c]) => [g.replace('-', ' '), last('אדם', g + '|'), c]).filter((x) => x[1] > 0),
  nimrod: `Peak: ${nim.n} boys in ${nim.year}. In 2024: ${last('נמרוד')}.`,
  yiska: yis.year === 2024 ? `${last('יסכה')} baby girls in 2024, the most ever.` : `${last('יסכה')} baby girls in 2024.`,
  methuselah: tot('מתושלח'),
};
const FPS = 30, WD = V ? 1080 : 1920, HT = V ? 1920 : 1080;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: WD, height: HT } });
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.addInitScript((nd) => { window.ND = nd; }, ND);
await p.goto(`file://${here}trailer.html?render${V ? '&v=vertical' : ''}`);
await p.evaluate(() => document.fonts.ready);
const T = await p.evaluate(() => window.TOTAL);
if (w === 0) fs.writeFileSync(here + 'out/scenes.json', JSON.stringify({ T, S: await p.evaluate(() => window.SCENES) }));
const N = Math.ceil(T * FPS), a = Math.floor((N * w) / nw), z = Math.floor((N * (w + 1)) / nw);
if (process.env.STILLS) {
  for (const t of process.env.STILLS.split(',').map(Number)) { await p.evaluate((t) => renderAt(t), t); await p.screenshot({ path: `${here}out/still-${orient}-${t}.jpg`, type: 'jpeg', quality: 85 }); }
  await b.close(); process.exit(0);
}
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', `${here}out/${orient}-part${w}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = a; i < z; i++) {
  await p.evaluate((t) => renderAt(t), i / FPS);
  const buf = await p.screenshot({ type: 'jpeg', quality: 90 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if ((i - a) % 300 === 0) console.log(orient, w, i - a, '/', z - a, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close(); console.log(orient, w, 'done');
