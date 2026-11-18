// Hineni Lite: helpers every level uses (good / bad feedback, multiple-choice reactions, portals).
import * as THREE from 'three';
import { G, game } from './state.js';
import { burst, player, shuffle, label, mat, on, dist2 } from './engine.js';
import { ENCOUNTERS } from '../content.js';
import { sfx } from '../audio.js';

const at = () => ({ x: player.pos.x, y: 1.6, z: player.pos.z });

export function good(text, xp = 15) {
  sfx.good();
  burst('hineni', at());
  if (text) game.toast(text, 'good');
  game.addXp(xp);
}

export function bad(text) {
  sfx.bad();
  game.hit();
  burst('hefsek', at());
  if (text) game.toast(text, 'bad');
}

/** Pop a multiple-choice reaction. Resolves with the picked option. */
export function pick(who, line, options, { why = null, keepOrder = false, xp = 15 } = {}) {
  sfx.talk();
  return new Promise((resolve) => game.setReaction({
    who, line, options: keepOrder ? options : shuffle(options),
    onPick: (o) => {
      game.setReaction(null);
      if (why) { if (o.ok) good(why, xp); else { sfx.bad(); game.toast(o.why || why, 'bad'); } }
      resolve(o);
    },
  }));
}

/** An encounter from content.js (the gauntlet's dilemmas). Resolves true when answered right. */
export function ask(kind, overrides = {}) {
  const e = { ...ENCOUNTERS[kind], ...overrides };
  sfx.talk();
  return new Promise((resolve) => game.setReaction({
    who: e.name, line: e.line, options: shuffle(e.options),
    onPick: (o) => {
      game.setReaction(null);
      if (o.ok) good(e.why); else bad(o.why || e.why);
      resolve(!!o.ok);
    },
  }));
}

/** Collects disposers so a level can clean up in one call. */
export function bag() {
  const fns = [];
  return { add: (f) => { fns.push(f); return f; }, on: (n, f) => fns.push(on(n, f)), dispose: () => { for (const f of fns.splice(0)) f(); } };
}

/** A glowing ring you walk into and press E. */
export function portal(parent, d, { x, z, color, title, he, stars = 0, onEnter }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 8, 40), mat(color, { basic: true }));
  ring.position.y = 2.2;
  const pad = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 40), mat(color, { basic: true, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.03;
  g.add(ring, pad);
  parent.add(g);
  const tag = label(g, {
    className: 'tt-portal', y: 4.2, style: `border-color:${color}`,
    html: `<div lang="he" dir="rtl" style="color:${color};font-size:1.1rem">${he}</div><div>${title}</div><div class="tt-stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">★</span>`).join('')}</div>`,
  });
  d.add(() => tag.remove());
  let inside = false;
  d.on('action', () => { if (inside && !G.reaction) onEnter(); });
  return {
    update(dt) {
      const now = dist2(player.pos, g.position) < 1.6;
      if (now !== inside) { inside = now; game.setPrompt(inside ? `E · enter ${title}` : null); }
      ring.rotation.z += dt * (inside ? 2.5 : 0.6);
    },
  };
}
