#!/usr/bin/env node
// Build the "Talk to Noa" Chrome extension from extensions/noa and the same chat code and data
// as /kolnoa/noa, into public/kolnoa/noa-chrome.zip (linked from that page).
//
//   node scripts/kolnoa/build_noa_extension.mjs
//
// Noa's art and recorded lines ship inside the extension; only answers go to the site's API.
// Rerun after changing src/lib/kolnoa-noa.js, its audio, or the chat code. Needs python3 + Pillow
// for the icons and `zip`.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSES, clientData } from '../../src/lib/kolnoa-noa.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'extensions/noa');
const WORK = join(tmpdir(), 'noa-extension');
const OUT = join(WORK, 'noa');
const ZIP = join(ROOT, 'public/kolnoa/noa-chrome.zip');
const API = 'https://theothermatthewmiller.com/api/kolnoa-noa';

rmSync(WORK, { recursive: true, force: true });
mkdirSync(join(OUT, 'images/kolnoa'), { recursive: true });
for (const f of ['manifest.json', 'popup.html', 'popup.css']) cpSync(join(SRC, f), join(OUT, f));

const audio = JSON.parse(readFileSync(join(ROOT, 'src/data/kolnoa-audio/noa.json'), 'utf8')).files;
for (const p of POSES) cpSync(join(ROOT, `public/images/kolnoa/noa-${p}.webp`), join(OUT, `images/kolnoa/noa-${p}.webp`));
for (const src of Object.values(audio)) {
  mkdirSync(dirname(join(OUT, src)), { recursive: true });
  cpSync(join(ROOT, 'public', src), join(OUT, src));
}

// The popup is the page's chat module with the data baked in (MV3 allows no inline scripts).
await build({
  stdin: {
    contents: `import { mountNoa } from './src/lib/kolnoa-noa-chat.ts';\nmountNoa(${JSON.stringify(clientData(audio))}, { api: ${JSON.stringify(API)} });`,
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'chrome110',
  outfile: join(OUT, 'popup.js'),
  logLevel: 'warning',
});

// Icons: Noa's face from the waving pose, on a pink circle.
mkdirSync(join(OUT, 'icons'));
execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
import sys
im = Image.open(sys.argv[1]).convert('RGBA')
w, h = im.size
s = int(w * 0.80)
face = im.crop(((w - s) // 2, 0, (w + s) // 2, s))
for n in (16, 32, 48, 128):
    big = 512
    bg = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(bg).ellipse((0, 0, big - 1, big - 1), fill=(242, 167, 195, 255))
    f = face.resize((big, big), Image.LANCZOS)
    mask = Image.new('L', (big, big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
    bg.paste(f, (0, 0), Image.composite(f.split()[3], Image.new('L', (big, big), 0), mask))
    bg.resize((n, n), Image.LANCZOS).save(f'{sys.argv[2]}/{n}.png')
`, join(ROOT, 'public/images/kolnoa/noa-wave.webp'), join(OUT, 'icons')]);

mkdirSync(dirname(ZIP), { recursive: true });
if (existsSync(ZIP)) rmSync(ZIP);
execFileSync('zip', ['-qrX', ZIP, 'noa'], { cwd: WORK });
console.error(`wrote ${ZIP.replace(ROOT + '/', '')} (${Math.round(readFileSync(ZIP).length / 1024)} KB); unpacked at ${OUT}`);
