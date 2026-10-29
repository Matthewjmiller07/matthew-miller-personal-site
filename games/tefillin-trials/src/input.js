import { useEffect, useRef } from 'react';

// Discrete game actions from the keyboard and the on-screen buttons, as window events.
// 'action' (E / tap), 'pulse' (Space), 'pick' (1-3), 'amen' (Q), 'bless' (B).
const KEYMAP = { KeyE: 'action', Enter: 'action', Space: 'pulse', KeyQ: 'amen', KeyB: 'bless', KeyF: 'shift', KeyM: 'mitzvat' };

export function fire(name, detail) {
  window.dispatchEvent(new CustomEvent(`tt-${name}`, { detail }));
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (/^Digit[1-4]$/.test(e.code)) { fire('pick', Number(e.code.slice(5)) - 1); return; }
    const name = KEYMAP[e.code];
    if (name) {
      if (e.code === 'Space') e.preventDefault();
      fire(name);
    }
  });
}

/** Subscribe to a game action; the latest handler is always used. */
export function useAction(name, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = (e) => ref.current(e.detail);
    window.addEventListener(`tt-${name}`, fn);
    return () => window.removeEventListener(`tt-${name}`, fn);
  }, [name]);
}

// Held keys that aren't movement (hum).
export const held = { hum: false };
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyH') held.hum = true; });
  window.addEventListener('keyup', (e) => { if (e.code === 'KeyH') held.hum = false; });
  window.addEventListener('blur', () => { held.hum = false; });
}
