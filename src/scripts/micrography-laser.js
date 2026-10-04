// Laser-cutter export for the micrography studio.
//
// The canvas renderer records every letter it places (character, position, size,
// weight, rotation). This module replays that log as an SVG in real-world inches with
// each letter converted to outlines — so CorelDRAW (or Illustrator, Inkscape,
// LightBurn) opens it without the font installed, and an Epilog can vector-score or
// raster-engrave it. A red hairline rectangle can be added as the cut line, per the
// Epilog convention (vector cut = hairline stroke).
//
// Glyph outlines come from the same font the canvas draws with (Noto Serif Hebrew,
// vendored under /fonts/laser), so the SVG matches the plate letter for letter.
import opentype from 'opentype.js';

const FONT_FILES = {
  hebrew400: '/fonts/laser/noto-serif-hebrew-hebrew-400-normal.woff',
  hebrew700: '/fonts/laser/noto-serif-hebrew-hebrew-700-normal.woff',
  latin400: '/fonts/laser/noto-serif-hebrew-latin-400-normal.woff',
  latin700: '/fonts/laser/noto-serif-hebrew-latin-700-normal.woff',
};

let fontsPromise = null;
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(Object.entries(FONT_FILES).map(async ([key, url]) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Couldn't load the laser font (${res.status})`);
      return [key, opentype.parse(await res.arrayBuffer())];
    })).then(Object.fromEntries).catch((e) => { fontsPromise = null; throw e; });
  }
  return fontsPromise;
}

const HEBREW = /[֐-׿יִ-ﭏ]/;

// Pick the subset that actually contains the character
function glyphFor(fonts, ch, bold) {
  const w = bold ? '700' : '400';
  const order = HEBREW.test(ch) ? ['hebrew', 'latin'] : ['latin', 'hebrew'];
  for (const script of order) {
    const font = fonts[script + w];
    const glyph = font.charToGlyph(ch);
    if (glyph && glyph.index !== 0) return { font, glyph };
  }
  return null;
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {object} log  { art: [], plate: [], m, f, outW, outH } from the renderer.
 *   Each entry: [text, x, y, size, weight, angleRad, mode]
 *   mode 0 = canvas textAlign left / baseline top (grid techniques)
 *   mode 1 = centered on (x,y), baseline middle, rotated (path techniques, frame)
 *   mode 2 = whole caption string, centered, baseline middle
 * @param {object} opts { widthIn, cutLine, mirror, expand, onProgress }
 * @returns {Promise<Blob>} image/svg+xml
 */
export async function buildLaserSVG(log, opts) {
  const fonts = await loadFonts();
  const { outW, outH } = log;
  const widthIn = Math.max(0.5, Number(opts.widthIn) || 8);
  const heightIn = widthIn * outH / outW;

  const defs = new Map();   // key -> { id, d, adv, upm, asc, desc }
  const defFor = (ch, bold) => {
    const key = (bold ? 'b' : 'r') + ch;
    let def = defs.get(key);
    if (def === undefined) {
      const hit = glyphFor(fonts, ch, bold);
      if (!hit) { defs.set(key, null); return null; }
      const { font, glyph } = hit;
      const upm = font.unitsPerEm;
      def = {
        id: 'g' + defs.size,
        d: glyph.getPath(0, 0, upm).toPathData(1),
        adv: glyph.advanceWidth,
        upm,
        // canvas 'top' / 'middle' sit on the em box, which these metrics span
        topToBase: font.ascender / (font.ascender - font.descender),
      };
      defs.set(key, def);
    }
    return def;
  };

  // One transform per letter: place the em box the way the canvas did
  const placements = [];
  const place = (entry, outer) => {
    const [text, x, y, size, weight, ang, mode] = entry;
    const bold = weight >= 600;
    if (mode === 2) {
      // Caption: lay out the whole string. Hebrew is stored in logical order, so
      // reverse it to draw left to right (no shaping needed for unpointed text).
      const visual = HEBREW.test(text) ? [...text].reverse() : [...text];
      let total = 0;
      const parts = visual.map((ch) => {
        const d = ch === ' ' ? null : defFor(ch, bold);
        const adv = d ? d.adv / d.upm : 0.28;
        total += adv;
        return { d, adv };
      });
      let cx = x - (total * size) / 2;
      for (const { d, adv } of parts) {
        if (d) {
          const s = size / d.upm;
          placements.push({ d, outer, t: `translate(${r2(cx)} ${r2(y + size * (d.topToBase - 0.5))}) scale(${+s.toFixed(5)})` });
        }
        cx += adv * size;
      }
      return;
    }
    const d = defFor(text, bold);
    if (!d) return;
    const s = size / d.upm;
    let t;
    if (mode === 0) {
      t = `translate(${r2(x)} ${r2(y + size * d.topToBase)}) scale(${+s.toFixed(5)})`;
    } else {
      const deg = r2((ang * 180) / Math.PI);
      t = `translate(${r2(x)} ${r2(y)})${deg ? ` rotate(${deg})` : ''} translate(${r2((-d.adv * s) / 2)} ${r2(size * (d.topToBase - 0.5))}) scale(${+s.toFixed(5)})`;
    }
    placements.push({ d, outer, t });
  };

  const total = log.art.length + log.plate.length;
  let n = 0;
  const tick = async () => {
    if (++n % 5000 === 0) {
      opts.onProgress?.(n / total);
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  for (const e of log.art) { place(e, 'art'); await tick(); }
  for (const e of log.plate) { place(e, 'plate'); await tick(); }

  const used = [...defs.values()].filter(Boolean);
  const body = (outer) => placements
    .filter((p) => p.outer === outer)
    .map((p) => opts.expand
      ? `<path transform="${p.t}" d="${p.d.d}"/>`
      : `<use href="#${p.d.id}" transform="${p.t}"/>`)
    .join('\n');

  const pxPerIn = outW / widthIn;
  const hairline = r2(0.001 * pxPerIn) || 0.01;
  const mirror = opts.mirror ? ` transform="translate(${outW} 0) scale(-1 1)"` : '';
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${+widthIn.toFixed(3)}in" height="${+heightIn.toFixed(3)}in" viewBox="0 0 ${outW} ${outH}">`,
    `<title>Micrography — ${placements.length.toLocaleString('en-US')} letters, ${widthIn.toFixed(2)}×${heightIn.toFixed(2)} in</title>`,
    `<desc>Letters are outlined (no font needed). Black = engrave. ${opts.cutLine ? 'Red hairline = vector cut.' : ''} Made at matthewjamesmiller.com/micrography</desc>`,
    opts.expand ? '' : `<defs>\n${used.map((d) => `<path id="${d.id}" d="${d.d}"/>`).join('\n')}\n</defs>`,
    `<g id="engrave" fill="#000000" stroke="none"${mirror}>`,
    `<g id="artwork" transform="translate(${r2(log.m)} ${r2(log.m)}) scale(${+log.f.toFixed(6)})">`,
    body('art'),
    '</g>',
    `<g id="frame-and-caption">`,
    body('plate'),
    '</g>',
    '</g>',
    opts.cutLine
      ? `<rect id="cut" x="0" y="0" width="${outW}" height="${outH}" fill="none" stroke="#FF0000" stroke-width="${hairline}"/>`
      : '',
    '</svg>',
  ].join('\n');
  opts.onProgress?.(1);
  return new Blob([svg], { type: 'image/svg+xml' });
}

// ————— Raster engrave: black letters on white, with the print DPI embedded —————

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Insert a pHYs chunk after IHDR so CorelDRAW / the Epilog driver import the PNG
// at its true physical size instead of 72 or 96 dpi.
async function withDpi(blob, dpi) {
  const src = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const ihdrEnd = 8 + 25; // signature + IHDR (len 4 + type 4 + data 13 + crc 4)
  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, ihdrEnd), 0);
  out.set(chunk, ihdrEnd);
  out.set(src.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return new Blob([out], { type: 'image/png' });
}

/**
 * Grayscale engrave map from the finished plate: paper → white, ink → black.
 * Inverted presets (light ink on dark paper) are flipped so letters burn.
 * @param {HTMLCanvasElement} plate
 * @param {object} opts { widthIn, paper: '#rrggbb', invert, mirror }
 */
export async function buildLaserPNG(plate, opts) {
  const w = plate.width, h = plate.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (opts.mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(plate, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const hex = /^#[0-9a-f]{6}$/i.test(opts.paper || '') ? opts.paper : '#ffffff';
  const pr = parseInt(hex.slice(1, 3), 16), pg = parseInt(hex.slice(3, 5), 16), pb = parseInt(hex.slice(5, 7), 16);
  const paperL = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255;
    // transparent plates: composite onto paper first
    const r = px[i] * a + pr * (1 - a), g = px[i + 1] * a + pg * (1 - a), b = px[i + 2] * a + pb * (1 - a);
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let v = opts.invert
      ? 255 - (L - paperL) / Math.max(1, 255 - paperL) * 255   // light ink on dark paper
      : (L / Math.max(1, paperL)) * 255;                        // dark ink on light paper
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(img, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return withDpi(blob, w / Math.max(0.5, Number(opts.widthIn) || 8));
}
