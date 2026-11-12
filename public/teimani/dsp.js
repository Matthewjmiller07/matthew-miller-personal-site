// Signal analysis for the Teimani pronunciation game. Pure functions over Float32 samples,
// so the same code runs in the browser and in the Node tests (scripts/teimani/test-dsp.mjs).
//
// What it can honestly measure from a laptop or phone mic:
//   - whether a sound is held (air keeps flowing) or popped
//   - whether the voice is on (vocal folds buzzing) or off
//   - how hissy the sound is, and where the hiss sits
//   - the first two vowel resonances (F1, F2), which place a vowel on the mouth map
//   - a tongue-tip trill (the loudness flutters about 20-30 times a second)

const HOP_MS = 10;
const WIN_MS = 30;

// ---------- small FFT (radix-2, in place) ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

// ---------- resample to ~11 kHz for pitch and formant work ----------
export function downsample(x, sr, target = 11025) {
  const factor = Math.max(1, Math.round(sr / target));
  if (factor === 1) return { y: x, sr };
  const taps = 8 * factor + 1, mid = (taps - 1) / 2, fc = 0.45 / factor;
  const h = new Float32Array(taps);
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const k = i - mid;
    const sinc = k === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * k) / (Math.PI * k);
    h[i] = sinc * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (taps - 1)));
    sum += h[i];
  }
  for (let i = 0; i < taps; i++) h[i] /= sum;
  const n = Math.floor(x.length / factor);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    const c = i * factor;
    for (let t = 0; t < taps; t++) {
      const idx = c + t - mid;
      if (idx >= 0 && idx < x.length) acc += x[idx] * h[t];
    }
    y[i] = acc;
  }
  return { y, sr: sr / factor };
}

// ---------- voicing: is there a steady buzz between 70 and 400 Hz? ----------
function voicing(frame, sr) {
  const n = frame.length;
  let e0 = 0;
  for (let i = 0; i < n; i++) e0 += frame[i] * frame[i];
  if (e0 < 1e-9) return { v: 0, f0: 0 };
  const lo = Math.floor(sr / 400), hi = Math.min(n - 2, Math.floor(sr / 70));
  let best = 0, bestLag = 0;
  for (let lag = lo; lag <= hi; lag++) {
    let s = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < n - lag; i++) { s += frame[i] * frame[i + lag]; e1 += frame[i] * frame[i]; e2 += frame[i + lag] * frame[i + lag]; }
    const r = s / Math.sqrt(e1 * e2 + 1e-12);
    if (r > best) { best = r; bestLag = lag; }
  }
  return { v: best, f0: bestLag ? sr / bestLag : 0 };
}

// ---------- LPC formants ----------
function lpc(frame, order) {
  const n = frame.length, r = new Float64Array(order + 1);
  for (let k = 0; k <= order; k++) { let s = 0; for (let i = 0; i < n - k; i++) s += frame[i] * frame[i + k]; r[k] = s; }
  r[0] *= 1.0001; // a touch of white noise keeps the recursion stable
  const a = new Float64Array(order + 1); a[0] = 1;
  let err = r[0];
  if (err <= 0) return null;
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / err;
    const prev = a.slice();
    for (let j = 1; j < i; j++) a[j] = prev[j] + k * prev[i - j];
    a[i] = k;
    err *= 1 - k * k;
    if (err <= 0) return null;
  }
  return a;
}

// Roots of z^p + a1 z^(p-1) + ... + ap, by Durand-Kerner.
function polyRoots(a) {
  const p = a.length - 1;
  const zr = new Float64Array(p), zi = new Float64Array(p);
  for (let i = 0; i < p; i++) { const ang = 2 * Math.PI * i / p + 0.4; zr[i] = 0.9 * Math.cos(ang); zi[i] = 0.9 * Math.sin(ang); }
  for (let it = 0; it < 60; it++) {
    let moved = 0;
    for (let i = 0; i < p; i++) {
      let pr = 1, pi = 0; // Horner
      for (let k = 1; k <= p; k++) { const t = pr * zr[i] - pi * zi[i] + a[k]; pi = pr * zi[i] + pi * zr[i]; pr = t; }
      let dr = 1, di = 0;
      for (let j = 0; j < p; j++) if (j !== i) {
        const xr = zr[i] - zr[j], xi = zi[i] - zi[j];
        const t = dr * xr - di * xi; di = dr * xi + di * xr; dr = t;
      }
      const den = dr * dr + di * di + 1e-30;
      const qr = (pr * dr + pi * di) / den, qi = (pi * dr - pr * di) / den;
      zr[i] -= qr; zi[i] -= qi;
      moved += Math.abs(qr) + Math.abs(qi);
    }
    if (moved < 1e-9) break;
  }
  return { zr, zi };
}

export function formants(frame, sr) {
  const n = frame.length, w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const pre = i ? frame[i] - 0.97 * frame[i - 1] : frame[i];
    w[i] = pre * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1)));
  }
  const order = Math.round(sr / 1000) + 2;
  const a = lpc(w, order);
  if (!a) return null;
  const { zr, zi } = polyRoots(a);
  const out = [];
  for (let i = 0; i < zr.length; i++) {
    if (zi[i] <= 0.01) continue;
    const f = Math.atan2(zi[i], zr[i]) * sr / (2 * Math.PI);
    const bw = -Math.log(Math.hypot(zr[i], zi[i])) * sr / Math.PI;
    if (f > 180 && f < sr / 2 - 200 && bw < 500) out.push({ f, bw });
  }
  out.sort((x, y) => x.f - y.f);
  if (out.length < 2) return null;
  return { f1: out[0].f, f2: out[1].f, f3: out[2] ? out[2].f : 0 };
}

// ---------- frame-by-frame features ----------
// Returns one entry per 10 ms: { t, rms, v (0..1 voicing), f0, hf (share of energy above 2.5 kHz),
// centroid (Hz), f1, f2 }.
export function analyze(samples, sr, opts = {}) {
  const wantFormants = opts.formants !== false;
  const hop = Math.round(sr * HOP_MS / 1000);
  const N = sr > 30000 ? 1024 : 512;
  const { y: lowS, sr: lowSr } = downsample(samples, sr);
  const lowWin = Math.round(lowSr * WIN_MS / 1000), lowHop = lowSr * HOP_MS / 1000;
  const frames = [];
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let start = 0, k = 0; start + N <= samples.length; start += hop, k++) {
    let e = 0;
    for (let i = 0; i < N; i++) {
      const s = samples[start + i];
      e += s * s;
      re[i] = s * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))); im[i] = 0;
    }
    const rms = Math.sqrt(e / N);
    fft(re, im);
    let tot = 0, hi = 0, cen = 0;
    const binHz = sr / N;
    for (let b = Math.ceil(80 / binHz); b < N / 2 && b * binHz < 10000; b++) {
      const p = re[b] * re[b] + im[b] * im[b], f = b * binHz;
      tot += p; cen += p * f;
      if (f > 2500) hi += p;
    }
    const ls = Math.round(k * lowHop);
    let v = 0, f0 = 0, f1 = 0, f2 = 0;
    if (ls + lowWin <= lowS.length) {
      const fr = lowS.subarray(ls, ls + lowWin);
      ({ v, f0 } = voicing(fr, lowSr));
      if (wantFormants && v > 0.5 && rms > 0.004) {
        const fm = formants(fr, lowSr);
        if (fm) { f1 = fm.f1; f2 = fm.f2; }
      }
    }
    frames.push({ t: start / sr, rms, v, f0, hf: tot ? hi / tot : 0, centroid: tot ? cen / tot : 0, f1, f2 });
  }
  return frames;
}

const median = (arr) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[s.length >> 1]; };

// Loudness gate: anything clearly above the quietest stretch of the take counts as sound.
export function gate(frames, floor) {
  const peak = Math.max(...frames.map((f) => f.rms), 0);
  const quiet = floor ?? median(frames.map((f) => f.rms).sort((a, b) => a - b).slice(0, Math.max(1, frames.length >> 2)));
  return Math.max(quiet * 3, peak * 0.12, 0.004);
}

// ---------- detectors ----------

// Longest unbroken stretch where the sound is on and the voice matches `voiced`.
// Short dropouts (up to 30 ms) are forgiven. Returns ms plus what it saw.
export function sustain(frames, voiced, floor) {
  const thr = gate(frames, floor);
  let best = { ms: 0, from: 0, to: 0 }, run = 0, gap = 0, from = 0;
  const ok = (f) => f.rms > thr * (voiced ? 1 : 0.6) && (voiced ? f.v > 0.6 : f.v < 0.45);
  frames.forEach((f, i) => {
    if (ok(f)) { if (!run) from = i; run += gap + 1; gap = 0; }
    else if (run && gap < 3) gap++;
    else { run = 0; gap = 0; }
    if (run * HOP_MS > best.ms) best = { ms: run * HOP_MS, from, to: i };
  });
  const seg = frames.slice(best.from, best.to + 1);
  const anySound = frames.filter((f) => f.rms > thr * 0.6);
  const voicedShare = anySound.length ? anySound.filter((f) => f.v > 0.55).length / anySound.length : 0;
  return { ms: best.ms, hf: median(seg.map((f) => f.hf)), centroid: median(seg.map((f) => f.centroid)), voicedShare, heard: anySound.length * HOP_MS };
}

// Median F1/F2 over the steady voiced part of a take.
export function vowel(frames, floor) {
  const thr = gate(frames, floor);
  const ok = frames.filter((f) => f.rms > thr && f.v > 0.6 && f.f1 > 0);
  if (ok.length < 8) return null;
  return { f1: median(ok.map((f) => f.f1)), f2: median(ok.map((f) => f.f2)), ms: ok.length * HOP_MS };
}

// How long does the mouth hiss before the vowel starts? A plain [g] releases in a click
// (well under 40 ms of noise); [dʒ] as in "jam" rubs for 50 ms or more.
export function onsetFriction(frames, floor) {
  const thr = gate(frames, floor);
  const peak = Math.max(...frames.map((f) => f.rms));
  // vowel = first run of 5 strongly voiced, low-hiss frames
  let vStart = -1;
  for (let i = 0; i + 5 <= frames.length; i++) {
    let good = true;
    for (let j = i; j < i + 5; j++) { const f = frames[j]; if (!(f.v > 0.6 && f.rms > peak * 0.35 && f.hf < 0.25)) { good = false; break; } }
    if (good) { vStart = i; break; }
  }
  if (vStart < 0) return null;
  let fric = 0;
  for (let i = vStart - 1; i >= 0 && i >= vStart - 25; i--) {
    const f = frames[i];
    if (f.rms > thr * 0.4 && f.hf > 0.4 && f.centroid > 2200) fric++;
  }
  return { ms: fric * HOP_MS, vowelAt: frames[vStart].t };
}

// Tongue-tip trill: loudness dips 18-35 times a second while the voice stays on.
// The envelope window spans two or more voice periods, so the buzz of the voice itself
// is smoothed away and only the tongue's flutter is left.
export function trill(samples, sr, floor) {
  const hop = Math.round(sr * 0.004), win = Math.round(sr * 0.016);
  const env = [];
  for (let s = 0; s + win <= samples.length; s += hop) { let e = 0; for (let i = 0; i < win; i++) e += samples[s + i] * samples[s + i]; env.push(Math.sqrt(e / win)); }
  const peak = Math.max(...env, 0), thr = Math.max(peak * 0.1, floor ? floor * 3 : 0.004);
  let best = { strength: 0, rate: 0, depth: 0 };
  const W = 45; // 180 ms window
  for (let s = 0; s + W <= env.length; s += 3) {
    const seg = env.slice(s, s + W);
    const mean = seg.reduce((a, b) => a + b, 0) / W;
    if (mean < thr) continue;
    const sorted = [...seg].sort((a, b) => a - b);
    const depth = 1 - sorted[4] / sorted[W - 5]; // how far the dips fall below the peaks
    if (depth < 0.25) continue;
    const d = seg.map((x) => x - mean);
    for (let lag = 7; lag <= 14; lag++) { // 28-56 ms period
      let c = 0, ea = 0, eb = 0;
      for (let i = 0; i < W - lag; i++) { c += d[i] * d[i + lag]; ea += d[i] * d[i]; eb += d[i + lag] * d[i + lag]; }
      const r = c / Math.sqrt(ea * eb + 1e-12);
      // must also repeat at twice the lag, or it is just one bump
      let c2 = 0, ea2 = 0, eb2 = 0;
      for (let i = 0; i < W - 2 * lag; i++) { c2 += d[i] * d[i + 2 * lag]; ea2 += d[i] * d[i]; eb2 += d[i + 2 * lag] * d[i + 2 * lag]; }
      const r2 = c2 / Math.sqrt(ea2 * eb2 + 1e-12);
      const score = Math.min(r, r2);
      if (score > best.strength) best = { strength: score, rate: 1000 / (lag * 4), depth };
    }
  }
  return best;
}

// ---------- vowel space ----------
// Voices differ, so vowels are placed relative to the speaker's own corners: "ee", "ah", "oo".
export const DEFAULT_CORNERS = { i: { f1: 300, f2: 2400 }, a: { f1: 780, f2: 1250 }, u: { f1: 330, f2: 850 } };

// Maps F1/F2 to { open: 0 (ee/oo) .. 1 (ah), front: 0 (oo) .. 1 (ee) }.
export function place(f1, f2, c = DEFAULT_CORNERS) {
  const top = (c.i.f1 + c.u.f1) / 2;
  const open = (f1 - top) / Math.max(120, c.a.f1 - top);
  const front = Math.log(f2 / c.u.f2) / Math.log(Math.max(1.5, c.i.f2 / c.u.f2));
  return { open, front };
}
