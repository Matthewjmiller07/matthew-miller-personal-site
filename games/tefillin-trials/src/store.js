import { create } from 'zustand';
import { RANKS } from './content.js';

const SAVE_KEY = 'tefillin-trials-v1';

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const saved = load();

export const useGame = create((set, get) => ({
  screen: 'title', // title | hub | gauntlet | catch | table | results
  minhag: saved.minhag || 'ashkenaz',
  xp: saved.xp || 0,
  sayings: saved.sayings || [],
  stars: saved.stars || {},
  muted: saved.muted || false,
  results: null,
  toasts: [],
  reaction: null, // { who, line, options: [{t, ok, why}], onPick }
  hud: {}, // per-level heads-up values
  prompt: null, // contextual "press E" text
  bubble: null, // { id, text, who }
  shake: 0,
  glitch: 0,
  levelKey: 0, // bump to remount a level

  setMinhag: (minhag) => { set({ minhag }); persist(); },
  go: (screen) => set((s) => ({ screen, results: null, reaction: null, prompt: null, bubble: null, hud: {}, levelKey: s.levelKey + 1 })),
  setHud: (patch) => set((s) => ({ hud: { ...s.hud, ...patch } })),
  setPrompt: (prompt) => { if (get().prompt !== prompt) set({ prompt }); },
  setReaction: (reaction) => set({ reaction }),
  setBubble: (bubble) => set({ bubble }),
  toggleMute: () => { set((s) => ({ muted: !s.muted })); persist(); },
  hit: (amount = 1) => set({ glitch: performance.now() + 650 * amount, shake: performance.now() + 400 }),
  toast: (text, tone = 'good') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  },
  addXp: (n) => { set((s) => ({ xp: Math.max(0, s.xp + n) })); persist(); },
  learn: (id) => {
    if (get().sayings.includes(id)) return false;
    set((s) => ({ sayings: [...s.sayings, id], xp: s.xp + 20 }));
    persist();
    return true;
  },
  finish: (level, results) => {
    set((s) => ({
      screen: 'results',
      results: { level, ...results },
      reaction: null,
      prompt: null,
      stars: { ...s.stars, [level]: Math.max(s.stars[level] || 0, results.stars) },
      xp: s.xp + results.xp,
    }));
    persist();
  },
}));

function persist() {
  const { minhag, xp, sayings, stars, muted } = useGame.getState();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ minhag, xp, sayings, stars, muted }));
  } catch {}
}

export function rankFor(xp) {
  let r = RANKS[0][1];
  for (const [min, name] of RANKS) if (xp >= min) r = name;
  return r;
}

// Shared mutable input from the touch joystick and on-screen buttons.
export const touch = { x: 0, y: 0, action: false, pulse: false, hum: false };
