// Hineni Lite: the whole game on plain three.js. No React, no physics engine, no post-processing:
// one renderer, Lambert materials, blob shadows, DOM labels. This file is the engine: renderer and
// loop, input, the player, people, steering, labels and particle bursts.
import * as THREE from 'three';

// ── Renderer, scene, camera ────────────────────────────────────────────────
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 160);
export let renderer = null;
let labelLayer = null;

export function initEngine(root) {
  renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'lt-canvas';
  root.appendChild(renderer.domElement);
  labelLayer = document.createElement('div');
  labelLayer.className = 'lt-labels';
  root.appendChild(labelLayer);
  const resize = () => {
    const w = root.clientWidth || window.innerWidth;
    const h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();
  camera.position.set(0, 14, 30);
}

let tickers = [];
export function onFrame(fn) { tickers.push(fn); return () => { tickers = tickers.filter((f) => f !== fn); }; }

export function startLoop() {
  const clock = new THREE.Clock();
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    for (const f of [...tickers]) f(dt, clock.elapsedTime);
    updateBursts(dt);
    updateLabels();
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(frame);
}

// ── Input: held keys, discrete actions, touch joystick ─────────────────────
export const keys = new Set();
export const touch = { x: 0, y: 0, hum: false };
const ACTION_KEYS = { KeyE: 'action', Enter: 'action', Space: 'pulse', KeyQ: 'amen', KeyB: 'bless', KeyF: 'shift', KeyM: 'mitzvat' };
const handlers = new Map();
export function on(name, fn) {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name).add(fn);
  return () => handlers.get(name).delete(fn);
}
export function fire(name, detail) { for (const fn of [...(handlers.get(name) || [])]) fn(detail); }

window.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  keys.add(e.code);
  if (e.repeat) return;
  if (document.querySelector('.tt-lb')) return;
  if (/^Digit[1-4]$/.test(e.code)) { fire('pick', Number(e.code.slice(5)) - 1); return; }
  const name = ACTION_KEYS[e.code];
  if (name) { if (e.code === 'Space') e.preventDefault(); fire(name); }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
export const humming = () => keys.has('KeyH') || touch.hum;

// ── The world's solid bits: circles and boxes on the floor plane ───────────
export const world = { circles: [], boxes: [], bounds: { x: 18, z: 24 } };
export function setWorld(w) { world.circles = w.circles || []; world.boxes = w.boxes || []; world.bounds = w.bounds; }

/** Push a point of radius r out of every collider and back inside the bounds. */
export function collide(p, r, extra = []) {
  for (const c of [...world.circles, ...extra]) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const d = Math.hypot(dx, dz), min = c.r + r;
    if (d < min && d > 1e-5) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
  }
  for (const b of world.boxes) {
    const qx = Math.max(b.x - b.hx, Math.min(p.x, b.x + b.hx));
    const qz = Math.max(b.z - b.hz, Math.min(p.z, b.z + b.hz));
    const dx = p.x - qx, dz = p.z - qz;
    const d = Math.hypot(dx, dz);
    if (d < r) {
      if (d > 1e-5) { p.x = qx + (dx / d) * r; p.z = qz + (dz / d) * r; }
      else { // inside: out along the shallow axis
        const ox = b.hx - Math.abs(p.x - b.x), oz = b.hz - Math.abs(p.z - b.z);
        if (ox < oz) p.x = b.x + Math.sign(p.x - b.x || 1) * (b.hx + r); else p.z = b.z + Math.sign(p.z - b.z || 1) * (b.hz + r);
      }
    }
  }
  const { x: bx, z: bz } = world.bounds;
  p.x = Math.max(-bx + r, Math.min(bx - r, p.x));
  p.z = Math.max(-bz + r, Math.min(bz - r, p.z));
}

// ── People: a few primitives, shared geometry, cached materials ────────────
const G = {
  leg: new THREE.BoxGeometry(0.2, 0.75, 0.22),
  torso: new THREE.CylinderGeometry(0.3, 0.36, 0.85, 10),
  arm: new THREE.BoxGeometry(0.15, 0.62, 0.15),
  head: new THREE.SphereGeometry(0.24, 14, 12),
  kippah: new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4),
  brim: new THREE.CylinderGeometry(0.36, 0.36, 0.03, 16),
  crown: new THREE.CylinderGeometry(0.21, 0.23, 0.24, 14),
  beard: new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, Math.PI / 2.2, Math.PI / 2),
  box: new THREE.BoxGeometry(0.13, 0.13, 0.13),
  band: new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10),
  blob: new THREE.CircleGeometry(0.45, 16),
};
const mats = new Map();
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  const { basic, ...rest } = opts;
  if (!mats.has(key)) mats.set(key, basic ? new THREE.MeshBasicMaterial({ color, ...rest }) : new THREE.MeshLambertMaterial({ color, ...rest }));
  return mats.get(key);
}
const blobMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false });

let tallitTex = null;
function tallitMat() {
  if (!tallitTex) {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 8, 64);
    g.fillStyle = '#1b1d2a';
    for (const y of [40, 46, 50]) g.fillRect(0, y, 8, y === 46 ? 2 : 3);
    tallitTex = new THREE.CanvasTexture(c);
    tallitTex.colorSpace = THREE.SRGBColorSpace;
  }
  return mats.get('tallit') || (mats.set('tallit', new THREE.MeshLambertMaterial({ map: tallitTex })), mats.get('tallit'));
}

/**
 * A person built from primitives. look: { robe, skin, kippah, hat, beard, tallit, yad, rosh, scale }.
 * Returns a THREE.Group with .motion { speed, daven, talk, wave } and .animate(dt).
 */
export function makePerson(look = {}) {
  const { robe = '#2b3a55', skin = '#e8c39e', kippah = '#1b1d2a', hat = 'kippah', beard = null, tallit = false, scale = 1 } = look;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.scale.setScalar(scale);
  const legMat = mat('#1a1b22');
  const legL = new THREE.Mesh(G.leg, legMat); legL.position.set(-0.12, 0.38, 0);
  const legR = new THREE.Mesh(G.leg, legMat); legR.position.set(0.12, 0.38, 0);
  const torso = new THREE.Group(); torso.position.y = 0.78;
  const chest = new THREE.Mesh(G.torso, tallit ? tallitMat() : mat(robe)); chest.position.y = 0.42;
  const armMat = mat(tallit ? '#f2efe6' : robe);
  const mkArm = (x) => { const g = new THREE.Group(); g.position.set(x, 0.8, 0); const m = new THREE.Mesh(G.arm, armMat); m.position.y = -0.3; g.add(m); const h = new THREE.Mesh(G.box, mat(skin)); h.scale.setScalar(0.9); h.position.y = -0.64; g.add(h); return g; };
  const armL = mkArm(-0.42), armR = mkArm(0.42);
  const head = new THREE.Group(); head.position.y = 1.12;
  const face = new THREE.Mesh(G.head, mat(skin)); head.add(face);
  if (hat === 'fedora') {
    const b = new THREE.Mesh(G.brim, mat('#111')); b.position.y = 0.16; head.add(b);
    const c = new THREE.Mesh(G.crown, mat('#111')); c.position.y = 0.28; head.add(c);
  } else {
    const k = new THREE.Mesh(G.kippah, mat(kippah)); k.position.y = 0.1; head.add(k);
  }
  if (beard) { const bd = new THREE.Mesh(G.beard, mat(beard)); bd.position.set(0, -0.05, 0.05); head.add(bd); }
  torso.add(chest, armL, armR, head);
  body.add(legL, legR, torso);
  // tefillin: shel yad on the left upper arm, shel rosh on the hairline
  const yad = new THREE.Group();
  yad.add(new THREE.Mesh(G.box, mat('#050507')));
  yad.position.set(-0.08, -0.2, 0.06); armL.add(yad);
  const rosh = new THREE.Mesh(G.box, mat('#050507')); rosh.position.set(0, 0.2, 0.17); head.add(rosh);
  const blob = new THREE.Mesh(G.blob, blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; root.add(blob);

  root.motion = { speed: 0, daven: false, talk: false, wave: false };
  root.setTefillin = (y, r) => { yad.visible = !!y; rosh.visible = !!r; };
  root.setTefillin(look.yad, look.rosh);
  let ph = Math.random() * 10;
  root.animate = (dt) => {
    const m = root.motion;
    ph += dt * (2 + Math.min(m.speed, 8) * 1.3);
    const swing = Math.min(1, m.speed / 3) * 0.6;
    legL.rotation.x = Math.sin(ph) * swing;
    legR.rotation.x = -Math.sin(ph) * swing;
    armL.rotation.x = -Math.sin(ph) * swing * 0.8;
    armR.rotation.x = m.wave ? -2.6 + Math.sin(ph * 3) * 0.3 : Math.sin(ph) * swing * 0.8;
    armR.rotation.z = m.wave ? 0.3 : 0;
    torso.rotation.x = m.daven ? 0.18 + Math.sin(ph * 1.6) * 0.16 : 0;
    head.rotation.x = m.talk ? Math.sin(ph * 6) * 0.08 : 0;
  };
  return root;
}

// ── NPCs: a person with simple steering ────────────────────────────────────
export function makeNpc(parent, { x = 0, z = 0, look = {}, name = '', speed = 2, wander = true } = {}) {
  const v = makePerson(look);
  v.position.set(x, 0, z);
  v.name = name;
  v.look = look;
  v.vel = new THREE.Vector3();
  v.speed = speed;
  v.mode = wander && speed > 0 ? 'wander' : 'still';
  v.target = null;
  v.wanderAng = Math.random() * Math.PI * 2;
  v.faceTarget = null;
  parent.add(v);
  return v;
}

/** One steering step: wander | seek | arrive | pursue | flee | still. */
export function steer(v, dt, playerPos) {
  const want = new THREE.Vector3();
  if (v.mode === 'wander') {
    v.wanderAng += (Math.random() - 0.5) * dt * 4;
    want.set(Math.sin(v.wanderAng), 0, Math.cos(v.wanderAng)).multiplyScalar(v.speed * 0.6);
  } else if ((v.mode === 'seek' || v.mode === 'arrive') && v.target) {
    want.set(v.target.x - v.position.x, 0, v.target.z - v.position.z);
    const d = want.length();
    const sp = v.mode === 'arrive' ? Math.min(v.speed, d * 1.5) : v.speed;
    if (d > 0.08) want.multiplyScalar(sp / d); else want.set(0, 0, 0);
  } else if (v.mode === 'pursue' && playerPos) {
    want.set(playerPos.x - v.position.x, 0, playerPos.z - v.position.z).normalize().multiplyScalar(v.speed);
  } else if (v.mode === 'flee' && playerPos) {
    want.set(v.position.x - playerPos.x, 0, v.position.z - playerPos.z);
    const d = want.length();
    if (d < 6) want.normalize().multiplyScalar(v.speed); else { v.wanderAng += (Math.random() - 0.5) * dt * 3; want.set(Math.sin(v.wanderAng), 0, Math.cos(v.wanderAng)).multiplyScalar(v.speed * 0.4); }
  }
  v.vel.lerp(want, Math.min(1, dt * 4));
  const p = v.position;
  const before = { x: p.x, z: p.z };
  p.x += v.vel.x * dt; p.z += v.vel.z * dt;
  const q = { x: p.x, z: p.z };
  collide(q, 0.45);
  // bounce the wander heading off walls
  if (v.mode === 'wander' && (Math.abs(q.x - p.x) > 1e-3 || Math.abs(q.z - p.z) > 1e-3)) v.wanderAng += Math.PI * (0.6 + Math.random() * 0.8);
  p.x = q.x; p.z = q.z;
  const moved = Math.hypot(p.x - before.x, p.z - before.z) / Math.max(dt, 1e-4);
  v.motion.speed = moved;
  let yaw = v.rotation.y;
  if (v.faceTarget) yaw = Math.atan2(v.faceTarget.x - p.x, v.faceTarget.z - p.z);
  else if (moved > 0.2) yaw = Math.atan2(v.vel.x, v.vel.z);
  let d = yaw - v.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  v.rotation.y += d * Math.min(1, dt * 8);
  v.animate(dt);
}

// ── The player ─────────────────────────────────────────────────────────────
/** Set by vr.js while a headset session runs: walking follows the head, the rig owns the camera. */
export const vrState = { active: false, fwd: { x: 0, z: -1 } };

export const player = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), facing: Math.PI, frozen: false, camOverride: false,
  cinematic: false, shake: 0, mesh: null, speed: 0,
};

export function spawnPlayer(parent, [x, z], { yad = true, rosh = false } = {}) {
  player.mesh = makePerson({ robe: '#e7e9f0', kippah: '#2c5aa0', tallit: true, skin: '#e8c39e', yad, rosh });
  player.pos.set(x, 0, z);
  player.vel.set(0, 0, 0);
  player.facing = Math.PI;
  player.frozen = false;
  player.camOverride = false;
  parent.add(player.mesh);
  return player.mesh;
}

const camTarget = new THREE.Vector3();
const camLook = new THREE.Vector3();
export function updatePlayer(dt, { paused = false, npcs = [] } = {}) {
  const dir = new THREE.Vector3(
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.x, 0,
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + touch.y,
  );
  if (dir.lengthSq() > 1) dir.normalize();
  if (vrState.active) {
    // stick forward = where you're looking
    const f = vrState.fwd;
    const x = dir.x, z = dir.z;
    dir.set(-f.z * x + f.x * -z, 0, f.x * x + f.z * -z);
  }
  const sp = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8.5 : 6;
  if (player.frozen || paused || player.cinematic) player.vel.multiplyScalar(0.8);
  else player.vel.set(dir.x * sp, 0, dir.z * sp);
  const p = { x: player.pos.x + player.vel.x * dt, z: player.pos.z + player.vel.z * dt };
  collide(p, 0.4, npcs.map((n) => ({ x: n.position.x, z: n.position.z, r: 0.42 * (n.look?.scale || 1) })));
  player.speed = Math.hypot(p.x - player.pos.x, p.z - player.pos.z) / Math.max(dt, 1e-4);
  player.pos.x = p.x; player.pos.z = p.z;
  if (dir.lengthSq() > 0.01 && !player.frozen && !paused) {
    let d = Math.atan2(dir.x, dir.z) - player.facing;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    player.facing += d * Math.min(1, dt * 12);
  }
  if (player.mesh) {
    player.mesh.position.set(player.pos.x, 0, player.pos.z);
    player.mesh.rotation.y = player.facing;
    player.mesh.motion.speed = player.speed;
    player.mesh.animate(dt);
  }
  if (player.cinematic || player.camOverride || vrState.active) return;
  camTarget.set(player.pos.x, 12, player.pos.z + 12);
  camera.position.lerp(camTarget, Math.min(1, dt * 3));
  if (player.shake > performance.now()) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, 0));
  camLook.set(player.pos.x, 1.4, player.pos.z - 2);
  camera.lookAt(camLook);
}

/** Ease the camera to a fixed shot (close-ups, the title orbit). VR replaces this (vr.js). */
export const viewHook = { fn: null };
export function view(pos, look, dt, rate = 4) {
  if (viewHook.fn) return viewHook.fn(pos, look, dt);
  camera.position.lerp(pos, Math.min(1, dt * rate));
  camera.lookAt(look);
}

// ── DOM labels that follow a world position ────────────────────────────────
const labels = new Set();
/** A div pinned over a world point (an Object3D, or a function returning a Vector3). */
export function label(anchor, { className = 'tt-tag', html = '', y = 2.3, style = '' } = {}) {
  const el = document.createElement('div');
  el.className = `lt-label ${className}`;
  el.style.cssText = style;
  el.innerHTML = html;
  labelLayer.appendChild(el);
  const l = { el, anchor, y, set: (h) => { if (l.html !== h) { l.html = h; el.innerHTML = h; } el.style.display = h ? '' : 'none'; }, remove: () => { el.remove(); labels.delete(l); } };
  l.set(html);
  labels.add(l);
  return l;
}
const tmp = new THREE.Vector3();
function updateLabels() {
  if (!labelLayer) return;
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  for (const l of labels) {
    if (!l.html) continue;
    if (typeof l.anchor === 'function') tmp.copy(l.anchor()); else l.anchor.getWorldPosition(tmp);
    tmp.y += l.y;
    tmp.project(camera);
    const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2;
    l.el.style.visibility = visible ? 'visible' : 'hidden';
    l.el.style.transform = `translate(-50%, -100%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
  }
}
export function clearLabels() { for (const l of [...labels]) l.remove(); }

/** A speech bubble over an NPC: say(v, who, text) / say(v, null). */
export function say(v, who, text) {
  if (!v.bubble) v.bubble = label(v, { className: 'tt-bubble', y: 2.5 * (v.look?.scale || 1) });
  v.bubble.set(who === null ? '' : `${who ? `<b>${esc(who)}</b>` : ''}${esc(text)}`);
}
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── Particle bursts: small additive sprites ────────────────────────────────
const dotTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
const BURSTS = {
  hineni: { color: '#ffd84a', n: 26, speed: 4, size: 0.35 },
  hefsek: { color: '#ff5a4a', n: 22, speed: 3.5, size: 0.35 },
  collect: { color: '#9fd7ff', n: 18, speed: 3, size: 0.3 },
  pulse: { color: '#7ad1ff', n: 40, speed: 9, size: 0.4, flat: true },
  firework: { color: '#ffe58a', n: 50, speed: 7, size: 0.4 },
  hum: { color: '#7ad1a8', n: 4, speed: 1.2, size: 0.3, up: true },
};
const live = [];
const spriteMats = new Map();
export function burst(name, pos) {
  const b = BURSTS[name] || BURSTS.collect;
  if (!spriteMats.has(name)) spriteMats.set(name, new THREE.SpriteMaterial({ map: dotTex, color: b.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  for (let i = 0; i < b.n; i++) {
    const s = new THREE.Sprite(spriteMats.get(name).clone());
    s.position.set(pos.x, pos.y, pos.z);
    s.scale.setScalar(b.size);
    const a = Math.random() * Math.PI * 2, e = b.flat ? 0 : (Math.random() - 0.3) * Math.PI;
    const v = b.speed * (0.5 + Math.random() * 0.5);
    s.userData = { v: new THREE.Vector3(Math.cos(a) * Math.cos(e) * v, b.up ? 1.5 + Math.random() : Math.sin(e) * v + (b.flat ? 0 : 1), Math.sin(a) * Math.cos(e) * v), life: 0.9 + Math.random() * 0.4, t: 0 };
    scene.add(s);
    live.push(s);
  }
}
function updateBursts(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const s = live[i];
    const u = s.userData;
    u.t += dt;
    s.position.addScaledVector(u.v, dt);
    u.v.y -= 3 * dt;
    s.material.opacity = Math.max(0, 1 - u.t / u.life);
    if (u.t > u.life) { scene.remove(s); s.material.dispose(); live.splice(i, 1); }
  }
}

// ── Small helpers ──────────────────────────────────────────────────────────
export const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
export const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function box(w, h, d, color, opts) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts)); }
export function cyl(rt, rb, h, color, seg = 12, opts) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts)); }
export function sphere(r, color, opts, seg = 16) { return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat(color, opts)); }
export function at(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }
