// Render a trailer page to MP4, frame by frame: node render.mjs <sugya|bechdel> [playwright-core dir]
// Writes <name>-silent.mp4 and <name>-scenes.json (scene timings for audio.py).
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
const [name, pwDir] = process.argv.slice(2);
const { chromium } = await import(path.join(pwDir || '', 'node_modules/playwright-core/index.mjs'));
const HERE = path.dirname(new URL(import.meta.url).pathname);
const FPS = 30;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(`file://${HERE}/${name}.html?render`);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const T = await p.evaluate(() => window.TOTAL);
fs.writeFileSync(path.join(HERE, `${name}-scenes.json`), JSON.stringify({ T, S: await p.evaluate(() => window.SCENES) }));
const N = Math.ceil(T * FPS);
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', path.join(HERE, `${name}-silent.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  await p.evaluate((t) => renderAt(t), i / FPS);
  const buf = await p.screenshot({ type: 'jpeg', quality: 90 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 300 === 0) console.log(name, i, '/', N, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close();
console.log(name, 'done', T.toFixed(1) + 's');
