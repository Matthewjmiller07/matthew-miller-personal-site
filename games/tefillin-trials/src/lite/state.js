// Hineni Lite: game state. The same save key as the full game, so XP, stars and the poskim you've
// met carry over between the two versions.
import { RANKS } from '../content.js';
import { fromUrl, syncUrl } from '../nav.js';
import { player } from './engine.js';

const SAVE_KEY = 'tefillin-trials-v1';
const saved = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { return {}; } })();
const start = fromUrl();

export const G = {
  screen: start.screen || 'title',
  leaderboard: start.leaderboard ? (start.screen && start.screen !== 'hub' ? start.screen : 'ward') : null,
  player: saved.player || '',
  minhag: saved.minhag || 'ashkenaz',
  xp: saved.xp || 0,
  sayings: saved.sayings || [],
  stars: saved.stars || {},
  muted: saved.muted || false,
  results: null,
  toasts: [],
  reaction: null,
  hud: {},
  prompt: null,
};

const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
let queued = false;
function emit() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; for (const fn of subs) fn(G); });
}
export function set(patch) { Object.assign(G, patch); emit(); }

function persist() {
  const { minhag, xp, sayings, stars, muted, player: name } = G;
  try {
    // keep whatever else the full game saved
    const prev = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...prev, minhag, xp, sayings, stars, muted, player: name }));
  } catch { /* storage blocked */ }
}

let switcher = null;
/** The level loader registers itself here (main.js). */
export function onGo(fn) { switcher = fn; }

export const game = {
  go(screen) {
    syncUrl(screen);
    set({ screen, results: null, reaction: null, prompt: null, hud: {} });
    switcher?.(screen);
  },
  setMinhag(minhag) { set({ minhag }); persist(); },
  setPlayer(name) { set({ player: name }); persist(); },
  toggleMute() { set({ muted: !G.muted }); persist(); },
  setHud(patch) { set({ hud: { ...G.hud, ...patch } }); },
  setPrompt(prompt) { if (G.prompt !== prompt) set({ prompt }); },
  setReaction(reaction) { set({ reaction }); },
  showLeaderboard(level) { set({ leaderboard: level }); },
  hit(amount = 1) { player.shake = performance.now() + 400 * amount; document.body.classList.add('lt-hit'); setTimeout(() => document.body.classList.remove('lt-hit'), 300); },
  toast(text, tone = 'good') {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...G.toasts.slice(-3), { id, text, tone }] });
    setTimeout(() => set({ toasts: G.toasts.filter((t) => t.id !== id) }), 4200);
  },
  addXp(n) { set({ xp: Math.max(0, G.xp + n) }); persist(); },
  learn(id) {
    if (G.sayings.includes(id)) return false;
    set({ sayings: [...G.sayings, id], xp: G.xp + 20 });
    persist();
    return true;
  },
  finish(level, results) {
    set({
      screen: 'results', results: { level, ...results }, reaction: null, prompt: null,
      stars: { ...G.stars, [level]: Math.max(G.stars[level] || 0, results.stars) }, xp: G.xp + results.xp,
    });
    persist();
    switcher?.('results');
  },
};

export function rankFor(xp) {
  let r = RANKS[0][1];
  for (const [min, name] of RANKS) if (xp >= min) r = name;
  return r;
}
