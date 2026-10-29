// Tiny WebAudio synth: no audio files to download.
import { useGame } from './store.js';

let ctx = null;
let master = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.4, at = 0, slide = 0 } = {}) {
  if (useGame.getState().muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  unlock: () => ac(),
  good: () => { tone(659, 0.18, { type: 'triangle' }); tone(988, 0.3, { type: 'triangle', at: 0.09 }); },
  great: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: 'triangle', at: i * 0.08 })),
  bad: () => { tone(160, 0.45, { type: 'sawtooth', vol: 0.3, slide: -80 }); tone(110, 0.5, { type: 'square', vol: 0.15 }); },
  collect: () => tone(1200, 0.12, { type: 'sine', vol: 0.25, slide: 400 }),
  pulse: () => { tone(220, 0.5, { type: 'sine', vol: 0.5, slide: 600 }); tone(110, 0.4, { type: 'triangle', vol: 0.3 }); },
  buzz: () => { for (let i = 0; i < 3; i++) tone(180, 0.08, { type: 'square', vol: 0.12, at: i * 0.11 }); },
  step: () => tone(90, 0.05, { type: 'triangle', vol: 0.05 }),
  kaddish: () => [147, 220, 294].forEach((f) => tone(f, 2.6, { type: 'sine', vol: 0.18 })),
  talk: () => { for (let i = 0; i < 4; i++) tone(300 + Math.random() * 300, 0.06, { type: 'square', vol: 0.06, at: i * 0.07 }); },
};

// A niggun in A freygish, one note per call; the hum key walks through it.
const NIGGUN = [57, 58, 61, 62, 64, 62, 61, 58, 57, 61, 64, 65, 64, 62, 61, 57];
let note = 0;
export function humNote() {
  const midi = NIGGUN[note++ % NIGGUN.length];
  tone(440 * 2 ** ((midi - 69) / 12), 0.32, { type: 'triangle', vol: 0.22 });
}
