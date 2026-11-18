// Hineni Lite: the three places the game happens, built once and swapped by visibility.
// Same layouts as the full game (the shul, the street corner, the ward) in cheap materials.
import * as THREE from 'three';
import { scene, box, cyl, sphere, at, mat, label } from './engine.js';
import { BENCHES, BIMAH, HALF_X, HALF_Z, STAND, ARM_STAGE, BEDS, BODY_STAGE, NURSES } from '../layout.js';

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const floor = (w, d, m) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); f.rotation.x = -Math.PI / 2; return f; };
const plane = (w, h, m) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);

function lights(g, { sky, ground, sun, sunPos, amb }) {
  g.add(new THREE.HemisphereLight(sky, ground, 1.6));
  g.add(new THREE.AmbientLight('#ffffff', amb));
  const d = new THREE.DirectionalLight(sun, 1.8);
  d.position.set(...sunPos);
  g.add(d);
}

function buildShul() {
  const g = new THREE.Group();
  lights(g, { sky: '#ffe9c4', ground: '#3a2a1c', sun: '#ffd9a0', sunPos: [10, 20, 8], amb: 0.35 });
  const wood = canvasTex(64, 256, (c) => {
    c.fillStyle = '#6b4527'; c.fillRect(0, 0, 64, 256);
    for (let x = 0; x < 64; x += 16) { c.fillStyle = `rgba(0,0,0,${0.08 + (x % 32 ? 0.06 : 0)})`; c.fillRect(x, 0, 1, 256); }
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(40,20,5,${Math.random() * 0.15})`; c.fillRect(Math.random() * 64, Math.random() * 256, 1, 6); }
  }, [12, 6]);
  g.add(floor(HALF_X * 2, HALF_Z * 2, new THREE.MeshLambertMaterial({ map: wood })));
  g.add(at(floor(2.4, HALF_Z * 2 - 4, mat('#7a1f2b')), 0, 0.01, 0));
  // walls
  const wall = mat('#e9dcc0');
  g.add(at(plane(HALF_X * 2, 10, wall), 0, 5, -HALF_Z));
  const back = at(plane(HALF_X * 2, 10, wall), 0, 5, HALF_Z); back.rotation.y = Math.PI; g.add(back);
  for (const s of [-1, 1]) {
    const w = at(plane(HALF_Z * 2, 10, wall), s * HALF_X, 5, 0); w.rotation.y = -s * Math.PI / 2; g.add(w);
    for (const z of [-16, -8, 0, 8, 16]) {
      const win = at(plane(2.6, 5, mat(['#5f8fe8', '#e8c15a', '#d9566a', '#4fc0b0'][(z / 8 + 2 + (s > 0 ? 1 : 0)) % 4], { basic: true })), s * (HALF_X - 0.02), 4.6, z);
      win.rotation.y = -s * Math.PI / 2; g.add(win);
    }
  }
  g.add(at(box(HALF_X * 2, 2.4, 0.3, '#4a2d18'), 0, 1.2, -HALF_Z + 0.3));
  // benches
  for (const [x, z] of BENCHES) {
    g.add(at(box(5.5, 0.12, 0.7, '#5a3a20'), x, 0.5, z));
    g.add(at(box(5.5, 0.7, 0.1, '#4a2d18'), x, 0.85, z + 0.35));
  }
  // bimah
  g.add(at(box(BIMAH.half * 2, 1.2, BIMAH.half * 2, '#5a3a20'), 0, 0.6, 0));
  g.add(at(box(BIMAH.half * 2 + 0.1, 0.1, BIMAH.half * 2 + 0.1, '#c9a24a'), 0, 1.22, 0));
  g.add(at(box(2, 0.2, 1.2, '#2a3a6a'), 0, 1.4, -0.4));
  // aron kodesh and ner tamid
  const aron = new THREE.Group(); aron.position.set(0, 0, -HALF_Z + 0.6);
  aron.add(at(box(6, 6, 1.2, '#3a2412'), 0, 3, 0));
  aron.add(at(box(4.2, 4.6, 0.1, '#7a1f2b'), 0, 3.2, 0.65));
  aron.add(at(box(4.4, 0.2, 0.2, '#e0b54a'), 0, 5.6, 0.7));
  aron.add(at(box(1.6, 0.9, 0.12, '#e0b54a', { emissive: '#7a5a10' }), 0, 6.6, 0.6));
  g.add(aron);
  g.add(at(sphere(0.18, '#ffb347', { basic: true }), 0, 7.5, -22.4));
  const ner = new THREE.PointLight('#ffb347', 6, 10); ner.position.set(0, 7.3, -22); g.add(ner);
  return {
    group: g, background: '#2b1d12', fog: ['#2b1d12', 40, 100],
    bounds: { x: HALF_X, z: HALF_Z },
    boxes: [
      { x: 0, z: 0, hx: BIMAH.half, hz: BIMAH.half },
      { x: 0, z: -HALF_Z + 0.8, hx: 3, hz: 0.8 },
      ...BENCHES.map(([x, z]) => ({ x, z, hx: 2.75, hz: 0.35 })),
    ],
  };
}

function buildStreet() {
  const g = new THREE.Group();
  const halfX = 22, halfZ = 18;
  lights(g, { sky: '#dff0ff', ground: '#a58a60', sun: '#fff1d6', sunPos: [18, 24, 14], amb: 0.5 });
  const cobble = canvasTex(256, 256, (c) => {
    c.fillStyle = '#6b6258'; c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 21) for (let x = (y / 21) % 2 ? -10 : 0; x < 256; x += 21) {
      const v = 120 + Math.floor(Math.random() * 50);
      c.fillStyle = `rgb(${v + 12},${v + 4},${v - 8})`;
      c.beginPath(); c.roundRect(x + 1.5, y + 1.5, 18, 18, 5); c.fill();
    }
  }, [10, 8]);
  g.add(floor(halfX * 2, halfZ * 2, new THREE.MeshLambertMaterial({ map: cobble })));
  g.add(at(floor(halfX * 2, 6, mat('#d8cbb0')), 0, 0.02, -halfZ + 4));
  for (let i = 0; i < 7; i++) g.add(at(floor(4, 0.6, mat('#f4f1e8')), -halfX + 4, 0.025, 8 - i * 1.3));
  // stone buildings around the square
  const stone = mat('#e6d3ad');
  const bldg = (x, z, w, h, d, ry = 0) => {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry;
    b.add(at(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone), 0, h / 2, 0));
    for (let f = 0; f < Math.floor(h / 3.2); f++) for (let k = 0; k < Math.floor(w / 3.4); k++) {
      b.add(at(box(1.1, 1.5, 0.05, '#3a4a5a'), -w / 2 + 1.7 + k * 3.4, 2.4 + f * 3.2, d / 2 + 0.03));
    }
    g.add(b);
  };
  bldg(-12, -halfZ - 3, 14, 11, 6); bldg(6, -halfZ - 3, 12, 13, 6); bldg(18, -halfZ - 2, 9, 9, 6);
  bldg(-halfX - 3, 4, 22, 10, 6, Math.PI / 2); bldg(halfX + 3, -4, 22, 12, 6, -Math.PI / 2);
  // trees and lamps
  for (const [x, z] of [[-16, 10], [16, 10], [-17, -8], [17, -8]]) {
    g.add(at(cyl(0.6, 0.5, 0.7, '#b9a07a'), x, 0.35, z));
    g.add(at(cyl(0.08, 0.12, 1.6, '#5a3d25', 6), x, 1.4, z));
    g.add(at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), mat('#5d9a45', { flatShading: true })), x, 2.6, z));
  }
  // the stand
  const s = new THREE.Group(); s.position.set(STAND.x, 0, STAND.z);
  s.add(at(box(4.2, 0.08, 1.4, '#f4f1e8'), 0, 0.92, 0));
  s.add(at(plane(4.2, 0.85, mat('#1f3f7a')), 0, 0.5, 0.71));
  [-1.4, -0.7, 0.6, 1.3].forEach((x, i) => s.add(at(box(0.42, 0.16, 0.3, ['#5a1620', '#1d2433', '#2e5d4b', '#3a2e5a'][i]), x, 1.02, -0.2 + (i % 2) * 0.25)));
  for (const x of [-2.1, 2.1]) s.add(at(cyl(0.04, 0.04, 3.2, '#d9dde5', 6), x, 1.6, -1.25));
  for (let i = 0; i < 8; i++) { const st = at(box(0.525, 0.04, 0.8, i % 2 ? '#f4f1e8' : '#2c5aa0'), -2.1 + 0.2625 + i * 0.525, 3.05, -1.05); st.rotation.x = 0.55; s.add(st); }
  s.add(at(box(3.4, 0.75, 0.08, '#141826'), 0, 3.75, -1.3));
  g.add(s);
  const sign = new THREE.Object3D(); sign.position.set(STAND.x, 3.9, STAND.z - 1.2); g.add(sign);
  g.userData.labels = [[sign, '<span lang="he" dir="rtl" style="font-size:1.1rem">יָד כֵּהָה</span> · TEFILLIN STAND', 0]];
  // the arm stage, far away
  const stage = new THREE.Group(); stage.position.set(ARM_STAGE.x, ARM_STAGE.y, ARM_STAGE.z);
  stage.add(floor(18, 18, mat('#20263a')));
  g.add(stage);
  return {
    group: g, background: '#9cc6ea', fog: ['#cfe2f0', 35, 90],
    bounds: { x: halfX, z: halfZ },
    boxes: [{ x: STAND.x, z: STAND.z, hx: 2.1, hz: 0.7 }],
  };
}

function buildWard() {
  const g = new THREE.Group();
  lights(g, { sky: '#ffffff', ground: '#9fb3bf', sun: '#fff6e6', sunPos: [-16, 20, 10], amb: 0.55 });
  const tiles = canvasTex(256, 256, (c) => {
    c.fillStyle = '#dfe6e8'; c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = 214 + Math.floor(Math.random() * 16);
      c.fillStyle = `rgb(${v - 6},${v + 2},${v + 4})`; c.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
    }
  }, [9, 12]);
  g.add(floor(HALF_X * 2, HALF_Z * 2, new THREE.MeshLambertMaterial({ map: tiles })));
  g.add(at(floor(0.25, HALF_Z * 2 - 4, mat('#2c7fb8')), 0, 0.02, 0));
  const wall = mat('#eef3f5');
  g.add(at(plane(HALF_X * 2, 8, wall), 0, 4, -HALF_Z));
  const back = at(plane(HALF_X * 2, 8, wall), 0, 4, HALF_Z); back.rotation.y = Math.PI; g.add(back);
  for (const s of [-1, 1]) {
    const w = at(plane(HALF_Z * 2, 8, wall), s * HALF_X, 4, 0); w.rotation.y = -s * Math.PI / 2; g.add(w);
    const wain = at(plane(HALF_Z * 2, 1.2, mat('#7fb7c9')), s * (HALF_X - 0.02), 0.6, 0); wain.rotation.y = -s * Math.PI / 2; g.add(wain);
    for (const z of [-18, -9, 0, 9, 18]) { const win = at(plane(4.2, 2.6, mat('#dff3ff', { basic: true })), s * (HALF_X - 0.03), 3.6, z); win.rotation.y = -s * Math.PI / 2; g.add(win); }
  }
  for (const b of BEDS) {
    const bed = new THREE.Group(); bed.position.set(b.x + b.side * 1.6, 0, b.z); bed.rotation.y = b.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    bed.add(at(box(1.3, 0.22, 2.4, '#f7f9fb'), 0, 0.62, 0));
    bed.add(at(box(1.24, 0.08, 1.7, '#8fc1e3'), 0, 0.76, -0.25));
    bed.add(at(box(0.8, 0.14, 0.4, '#ffffff'), 0, 0.82, -0.95));
    bed.add(at(box(1.36, 0.8, 0.06, '#c9d3db'), 0, 0.95, -1.2));
    bed.add(at(box(0.04, 2.3, 2.6, '#7fb7c9', { transparent: true, opacity: 0.55, side: THREE.DoubleSide }), -0.95, 1.55, 0));
    g.add(bed);
  }
  g.add(at(box(6.4, 1.2, 1.2, '#f7f9fb'), NURSES.x, 0.6, NURSES.z));
  g.add(at(box(6.6, 0.06, 1.4, '#2c7fb8'), NURSES.x, 1.22, NURSES.z));
  g.add(at(box(7.4, 1.5, 0.1, '#14324a'), 0, 5.4, -HALF_Z + 0.4));
  const sign = new THREE.Object3D(); sign.position.set(0, 5.2, -HALF_Z + 0.5); g.add(sign);
  g.userData.labels = [[sign, '<span lang="he" dir="rtl" style="font-size:1.1rem">מַחְלֶקֶת שִׁקּוּם</span> · REHAB WARD', 0]];
  const stage = new THREE.Group(); stage.position.set(BODY_STAGE.x, BODY_STAGE.y, BODY_STAGE.z);
  stage.add(floor(16, 16, mat('#20304a')));
  g.add(stage);
  return {
    group: g, background: '#cfe3ee', fog: ['#e6f0f5', 40, 95],
    bounds: { x: HALF_X, z: HALF_Z },
    boxes: [...BEDS.map((b) => ({ x: b.x + b.side * 1.6, z: b.z, hx: 1.25, hz: 0.7 })), { x: NURSES.x, z: NURSES.z, hx: 3.2, hz: 0.6 }],
  };
}

const BUILDERS = { shul: buildShul, street: buildStreet, ward: buildWard };
const built = {};
let signLabels = [];
/** Show one world (building it the first time) and return its collision data. */
export function showWorld(name) {
  if (!built[name]) { built[name] = BUILDERS[name](); scene.add(built[name].group); }
  for (const [k, w] of Object.entries(built)) w.group.visible = k === name;
  const w = built[name];
  scene.background = new THREE.Color(w.background);
  scene.fog = new THREE.Fog(...w.fog);
  for (const l of signLabels) l.remove();
  signLabels = (w.group.userData.labels || []).map(([obj, html, y]) => label(obj, { className: 'tt-tag lt-sign', html, y }));
  return w;
}
export const worldFor = (screen) => (screen === 'stand' ? 'street' : screen === 'ward' ? 'ward' : 'shul');
