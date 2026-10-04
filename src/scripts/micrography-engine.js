// Standalone micrography engine — no DOM beyond canvases, no framework.
// Bundled for doppelgifter.com (js/micrography.js) so "The Scribe" style can draw a
// portrait out of text in the buyer's browser. The full studio at
// theothermatthewmiller.com/micrography has more techniques; this is the engraving one,
// tuned for square product art.
import { blur2 } from 'd3-array';

const FONT = '"Noto Serif Hebrew", "Frank Ruhl Libre", Georgia, "Times New Roman", serif';
const MP_VERSION = '0.10.14';
const MP_BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

export const INKS = {
  sepia: { paper: '#ede0c4', ink: [74, 48, 20] },
  ink: { paper: '#f1e9d6', ink: [30, 24, 14] },
  gold: { paper: '#15203a', ink: [214, 177, 98], invert: true },
};

const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ————— Background removal (MediaPipe Selfie Segmenter, lazy-loaded) —————
let segPromise = null;
function segmenter() {
  if (!segPromise) {
    segPromise = import(/* @vite-ignore */ MP_BUNDLE).then(async ({ FilesetResolver, ImageSegmenter }) => {
      const fileset = await FilesetResolver.forVisionTasks(MP_WASM);
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MP_MODEL, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    }).catch((e) => { segPromise = null; throw e; });
  }
  return segPromise;
}

/** Returns a canvas of the image with everything but the person turned white. */
export async function removeBackground(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const src = canvas(w, h);
  src.getContext('2d').drawImage(img, 0, 0);
  const seg = await segmenter();
  const res = seg.segment(src);
  const m = res.confidenceMasks && res.confidenceMasks[0];
  if (!m) throw new Error('no mask');
  const conf = m.getAsFloat32Array();
  const mw = m.width, mh = m.height;
  res.confidenceMasks.forEach((x) => x.close());
  const mask = canvas(mw, mh);
  const mc = mask.getContext('2d');
  const id = mc.createImageData(mw, mh);
  let kept = 0;
  for (let i = 0; i < conf.length; i++) {
    let a = (conf[i] - 0.25) / 0.5; a = a < 0 ? 0 : a > 1 ? 1 : a;
    a = a * a * (3 - 2 * a);
    id.data[i * 4 + 3] = a * 255;
    kept += a;
  }
  if (kept / conf.length < 0.02) throw new Error('no person found');
  mc.putImageData(id, 0, 0);
  const cut = canvas(w, h);
  const cc = cut.getContext('2d');
  cc.drawImage(src, 0, 0);
  cc.globalCompositeOperation = 'destination-in';
  cc.filter = 'blur(1px)';
  cc.drawImage(mask, 0, 0, w, h);
  cc.filter = 'none';
  cc.globalCompositeOperation = 'destination-over';
  cc.fillStyle = '#ffffff';
  cc.fillRect(0, 0, w, h);
  return cut;
}

// ————— Tone field —————
function toneField(src, fw, fh, invert) {
  const c = canvas(fw, fh);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.fillRect(0, 0, fw, fh);
  x.drawImage(src, 0, 0, fw, fh);
  const px = x.getImageData(0, 0, fw, fh).data;
  const n = fw * fh;
  const lum = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const L = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
    lum[i] = L; hist[Math.min(255, L | 0)]++;
  }
  const pct = (q) => { let a = 0; for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= n * q) return v; } return 255; };
  const lo = pct(0.02), hi = Math.max(lo + 1, pct(0.985));
  const dark = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let L = (lum[i] - lo) / (hi - lo); L = L < 0 ? 0 : L > 1 ? 1 : L;
    let d = invert ? L : 1 - L;
    if (lum[i] > 250) d = invert ? 1 : 0;        // removed background stays bare paper
    d = Math.pow(d, 1.35);                        // open up the midtones so faces keep their features
    d = d * d * (3 - 2 * d);
    dark[i] = d;
  }
  return dark;
}

function bilinear(a, w, h, x, y) {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return 0;
  const x0 = x | 0, y0 = y | 0, x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
  const fx = x - x0, fy = y - y0;
  return (a[y0 * w + x0] * (1 - fx) + a[y0 * w + x1] * fx) * (1 - fy) + (a[y1 * w + x0] * (1 - fx) + a[y1 * w + x1] * fx) * fy;
}

// Parallel lines at angle theta, bent sideways by the blurred tone (engraving relief)
function engravedLines(W, H, theta, spacing, relief, amp) {
  const ux = Math.cos(theta), uy = Math.sin(theta), nx = -uy, ny = ux;
  const cx = W / 2, cy = H / 2, D = Math.hypot(W, H) / 2 + amp + spacing;
  const lines = [];
  for (let o = -D; o <= D; o += spacing) {
    let run = [];
    for (let t = -D; t <= D; t += 3) {
      const bx = cx + nx * o + ux * t, by = cy + ny * o + uy * t;
      const d = amp * (relief(bx, by) - 0.5);
      const p = [bx - nx * d, by - ny * d];
      if (p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H) run.push(p);
      else if (run.length) { if (run.length > 3) lines.push(run); run = []; }
      if (run.length >= 400) { lines.push(run); run = [p]; }
    }
    if (run.length > 3) lines.push(run);
  }
  return lines;
}

const widths = new Map();
const measure = canvas(1, 1).getContext('2d');
function glyphW(ch, weight) {
  const k = weight + ch;
  let w = widths.get(k);
  if (w === undefined) { measure.font = `${weight} 100px ${FONT}`; w = measure.measureText(ch).width / 100; widths.set(k, w); }
  return w;
}

function textAlong(ctx, pts, cursor, o) {
  const n = pts.length;
  const cum = new Float32Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const L = cum[n - 1];
  let seg = 0, px = 0, py = 0, ang = 0, lastFont = '';
  const at = (s) => {
    while (seg < n - 2 && cum[seg + 1] < s) seg++;
    const a = pts[seg], b = pts[seg + 1], len = (cum[seg + 1] - cum[seg]) || 1, f = (s - cum[seg]) / len;
    px = a[0] + (b[0] - a[0]) * f; py = a[1] + (b[1] - a[1]) * f;
    ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  };
  let s = 0;
  while (s < L) {
    at(s);
    const t = o.tone(px, py);
    if (t <= 0) { s += o.base * 0.45; continue; }
    const size = Math.round(o.base * (o.min + o.range * t) * 2) / 2;
    const ch = cursor.peek();
    if (ch === ' ') { cursor.next(); s += size * 0.32; continue; }
    const weight = t > 0.55 ? 700 : 400;
    const w = glyphW(ch, weight) * size;
    if (s + w > L) break;
    at(s + w / 2);
    const font = `${weight} ${size}px ${FONT}`;
    if (font !== lastFont) { ctx.font = font; lastFont = font; }
    const a = 0.35 + 0.65 * t;
    ctx.fillStyle = `rgba(${o.ink[0]},${o.ink[1]},${o.ink[2]},${a.toFixed(2)})`;
    const c = Math.cos(ang), sn = Math.sin(ang);
    ctx.setTransform(c, sn, -sn, c, px, py);
    ctx.fillText(ch, 0, 0);
    cursor.next();
    s += w + size * 0.05;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Draw a square engraving-style micrography portrait.
 * @param {CanvasImageSource} src  photo (ideally background-removed)
 * @param {object} opts { text, size=2400, ink='sepia', caption, focusY=0.3, onProgress }
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderPortrait(src, opts = {}) {
  const S = opts.size || 2400;
  const ink = INKS[opts.ink] || INKS.sepia;
  const text = (String(opts.text || '').replace(/\s+/g, ' ').trim() || 'Their face. On stuff.') + ' · ';
  const caption = String(opts.caption || '').trim().slice(0, 40);

  // Cover-crop the photo into a square, biased toward the face
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const side = Math.min(sw, sh);
  // tall portraits: keep the upper part, where the face usually is
  const sx = (sw - side) / 2, sy = (sh - side) * (opts.focusY ?? 0.3);
  const capH = caption ? Math.round(S * 0.12) : 0;
  const artH = S - capH;
  const sq = canvas(S, artH);
  const sqx = sq.getContext('2d');
  sqx.fillStyle = '#fff'; sqx.fillRect(0, 0, S, artH);
  const f = Math.max(S / side, artH / side);
  sqx.drawImage(src, sx, sy, side, side, (S - side * f) / 2, (artH - side * f) / 2, side * f, side * f);

  const fw = Math.round(S / 3), fh = Math.round(artH / 3), k = fw / S;
  const dark = toneField(sq, fw, fh, ink.invert);
  const blurred = Float32Array.from(dark);
  blur2({ data: blurred, width: fw, height: fh }, Math.max(2, 16 * k * 1.5));
  await yieldFrame();

  const out = canvas(S, S);
  const ctx = out.getContext('2d');
  ctx.fillStyle = ink.paper; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = ink.invert ? 'rgba(255,240,200,0.02)' : 'rgba(80,55,20,0.025)';
  for (let i = 0; i < S * S / 9000; i++) ctx.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 1 + Math.random() * 3);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  const spacing = Math.round(S / 150);
  const toneAt = (x, y) => bilinear(dark, fw, fh, x * k, y * k);
  const relief = (x, y) => bilinear(blurred, fw, fh, x * k, y * k);
  const cut = (c) => (x, y) => { const d = toneAt(x, y); return d < c ? 0 : (d - c) / (1 - c); };
  const layers = [
    { lines: engravedLines(S, artH, 0, spacing, relief, spacing * 1.6), tone: cut(0.05), min: 0.28, range: 0.85 },
    { lines: engravedLines(S, artH, -0.62, spacing * 1.2, relief, spacing), tone: cut(0.62), min: 0.35, range: 0.6 },
    { lines: engravedLines(S, artH, 0.62, spacing * 1.35, relief, spacing), tone: cut(0.86), min: 0.4, range: 0.5 },
  ];
  let i = 0;
  const cursor = { peek: () => text[i % text.length], next: () => { i++; } };
  const total = layers.reduce((n, l) => n + l.lines.length, 0) || 1;
  let done = 0, last = performance.now();
  for (const l of layers) {
    for (const pts of l.lines) {
      textAlong(ctx, pts, cursor, { base: spacing, min: l.min, range: l.range, tone: l.tone, ink: ink.ink });
      done++;
      if (performance.now() - last > 30) { opts.onProgress?.(done / total); await yieldFrame(); last = performance.now(); }
    }
  }

  if (caption) {
    const [r, g, b] = ink.ink;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`; ctx.lineWidth = Math.max(1, S / 1200);
    ctx.beginPath(); ctx.moveTo(S * 0.2, artH + capH * 0.12); ctx.lineTo(S * 0.8, artH + capH * 0.12); ctx.stroke();
    let fs = Math.round(capH * 0.45);
    ctx.font = `700 ${fs}px ${FONT}`;
    const cw = ctx.measureText(caption).width;
    if (cw > S * 0.85) { fs = Math.floor(fs * S * 0.85 / cw); ctx.font = `700 ${fs}px ${FONT}`; }
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.direction = /[֐-׿]/.test(caption) ? 'rtl' : 'ltr';
    ctx.fillText(caption, S / 2, artH + capH * 0.58);
  }
  opts.onProgress?.(1);
  return out;
}
