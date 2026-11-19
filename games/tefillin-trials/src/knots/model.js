// The Knot Explorer's 3D shel yad, built from measurements rather than a generic mesh, so the parts
// the halacha talks about are where they really are. Units: the upper arm is about 1 unit in radius
// (~5 cm), the bayit 0.66 (~3.3 cm), the strap 0.24 wide (~1.2 cm).
//
// Axes: the arm runs along x, shoulder at -x, elbow at +x. Up is +y. The heart (the inside of the
// arm) is -z. The bayit sits on the lower half of the biceps, the ma'abarta toward the shoulder.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ── materials ───────────────────────────────────────────────────────────────
function grainTexture(scale = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5000; i++) {
    const v = 100 + rnd() * 70;
    g.fillStyle = `rgba(${v},${v},${v},${0.35 + rnd() * 0.4})`;
    const r = 0.6 + rnd() * 2.2 * scale;
    g.beginPath(); g.arc(rnd() * 256, rnd() * 256, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const grain = grainTexture();
const grainFine = grainTexture(0.5);
grainFine.repeat.set(6, 1);

export const MATS = {
  paint: new THREE.MeshPhysicalMaterial({ color: '#030304', roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22, bumpMap: grain, bumpScale: 0.5, envMapIntensity: 0.3 }),
  strapFront: new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3, bumpMap: grainFine, bumpScale: 0.4, envMapIntensity: 0.35, side: THREE.DoubleSide }),
  strapBack: new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.95, bumpMap: grainFine, bumpScale: 1.2, side: THREE.DoubleSide }),
  gid: new THREE.MeshStandardMaterial({ color: '#d9c49a', roughness: 0.7 }),
  gidBad: new THREE.MeshStandardMaterial({ color: '#ff4a4a', roughness: 0.5, emissive: '#7a0000', emissiveIntensity: 0.6 }),
  tan: new THREE.MeshStandardMaterial({ color: '#b48a5c', roughness: 0.85, bumpMap: grainFine, bumpScale: 1 }),
  slot: new THREE.MeshBasicMaterial({ color: '#000000' }),
  skin: new THREE.MeshPhysicalMaterial({ color: '#d9a37c', roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffd2b8'), sheenRoughness: 0.5, clearcoat: 0.08 }),
  heart: new THREE.MeshStandardMaterial({ color: '#ff3a5a', emissive: '#ff2a4a', emissiveIntensity: 1.2 }),
  arrow: new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: '#ffb000', emissiveIntensity: 0.8 }),
};

// ── the arm ─────────────────────────────────────────────────────────────────
const X0 = -3.4, X1 = 3.2; // shoulder, elbow
export const armR = (x) => 0.86 + 0.2 * Math.exp(-(((x - 0.1) / 1.25) ** 2)) - 0.08 * Math.max(0, (x - 2) / 1.2);

export function makeArm() {
  const pts = [];
  for (let i = 0; i <= 60; i++) { const x = X0 + ((X1 - X0) * i) / 60; pts.push(new THREE.Vector2(armR(x), x)); }
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.rotateZ(-Math.PI / 2); // lathe axis y → x
  const g = new THREE.Group();
  const arm = new THREE.Mesh(geo, MATS.skin);
  arm.castShadow = arm.receiveShadow = true;
  g.add(arm);
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(armR(X0) * 1.08, 40, 30), MATS.skin);
  shoulder.position.x = X0; shoulder.castShadow = true; g.add(shoulder);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(armR(X1) * 1.02, 40, 30), MATS.skin);
  elbow.position.x = X1; elbow.castShadow = true; g.add(elbow);
  // the forearm, bent down toward you
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 3.2, 12, 40), MATS.skin);
  fore.position.set(X1 + 0.35, -1.9, -0.6); fore.rotation.set(-0.35, 0, 0.18); fore.castShadow = true; g.add(fore);
  return g;
}

// ── a strap: a two-sided leather ribbon along a path ────────────────────────
const W = 0.24, TH = 0.022;
const radial = (p) => new THREE.Vector3(0, p.y, p.z).normalize();

/** samples: [{ p: Vector3, n: Vector3 }], n = the way the black face points. */
function ribbon(samples, width = W) {
  const n = samples.length;
  const front = new Float32Array(n * 2 * 3), back = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  let len = 0;
  for (let i = 0; i < n; i++) {
    const { p, n: nn } = samples[i];
    const t = (i < n - 1 ? samples[i + 1].p.clone().sub(p) : p.clone().sub(samples[i - 1].p)).normalize();
    let b = new THREE.Vector3().crossVectors(t, nn);
    if (b.lengthSq() < 1e-6) b = new THREE.Vector3(1, 0, 0);
    b.normalize().multiplyScalar(width / 2);
    const nh = nn.clone().normalize().multiplyScalar(TH / 2);
    const a = p.clone().add(b), c = p.clone().sub(b);
    a.clone().add(nh).toArray(front, i * 6); c.clone().add(nh).toArray(front, i * 6 + 3);
    a.clone().sub(nh).toArray(back, i * 6); c.clone().sub(nh).toArray(back, i * 6 + 3);
    if (i) len += p.distanceTo(samples[i - 1].p);
    uv.set([0, len * 2, 1, len * 2], i * 4);
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const mk = (pos, flip, mat) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(flip ? idx.slice().reverse() : idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const g = new THREE.Group();
  g.add(mk(front, false, MATS.strapFront), mk(back, true, MATS.strapBack));
  return g;
}

/** Sample a smooth path through points; normals from normalFn (radial from the arm by default). */
function path(points, { steps = 80, normal = radial } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return curve.getSpacedPoints(steps).map((p) => ({ p, n: normal(p) }));
}

/** A helix around the arm from angle a0 to a1 (radians, 0 = top, +π/2 = the far side +z), moving x0 → x1. */
function helix(x0, x1, a0, a1, lift = 0.03, steps = 120) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps, a = a0 + (a1 - a0) * k, x = x0 + (x1 - x0) * k;
    const r = armR(x) + lift;
    const p = new THREE.Vector3(x, r * Math.cos(a), r * Math.sin(a));
    out.push({ p, n: radial(p) });
  }
  return out;
}
const tube = (pts, r, mat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, r, 8, false), mat); m.castShadow = true; return m; };

// ── the tefillin ────────────────────────────────────────────────────────────
export const DIM = { T: 0.96, TH: 0.1, B: 0.66, MW: 0.36, MH: 0.24, bx: 0.95 };

/** Build the shel yad for one method. Returns { group, anchors, update(pull) }. */
/**
 * stage (optional): how far the tying has got, for the step-by-step player. Leave it out for the
 * finished knot. { yud, knot, loop: null | 'big' | 'small', through, ring, loose, extras }
 */
const DONE = { yud: true, knot: true, loop: 'small', through: true, ring: true, loose: false, extras: true };
export function buildTefillin(method, stage = DONE) {
  stage = { ...DONE, ...stage };
  const { T, TH: tH, B, MW, MH, bx } = DIM;
  const ex = method.extras || {};
  const y0 = armR(bx) - 0.02;
  const mx = bx - T / 2 - MW / 2 + 0.02;
  const g = new THREE.Group();
  const anchors = {};
  const fixed = new THREE.Group(); // the bayit, titura, ma'abarta
  g.add(fixed);

  // titura (the base) and ma'abarta (the tunnel at its back)
  const titura = new THREE.Mesh(new RoundedBoxGeometry(T, tH, T, 3, 0.025), MATS.paint);
  titura.position.set(bx, y0 + tH / 2, 0); titura.castShadow = titura.receiveShadow = true; fixed.add(titura);
  const maab = new THREE.Mesh(new RoundedBoxGeometry(MW, MH, T, 3, 0.04), MATS.paint);
  maab.position.set(mx, y0 + MH / 2, 0); maab.castShadow = true; fixed.add(maab);
  for (const s of [-1, 1]) { const slot = new THREE.Mesh(new THREE.PlaneGeometry(MW - 0.1, 0.06), MATS.slot); slot.position.set(mx, y0 + 0.12, s * (T / 2 + 0.002)); slot.rotation.y = s > 0 ? 0 : Math.PI; fixed.add(slot); }
  // the ketzitzah
  const bayit = new THREE.Mesh(new RoundedBoxGeometry(B, B, B, 4, 0.03), MATS.paint);
  bayit.position.set(bx, y0 + tH + B / 2, 0); bayit.castShadow = true; fixed.add(bayit);
  // gid stitches around the titura (three a side), and the seam groove
  const st = new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6);
  for (let side = 0; side < 4; side++) for (let k = -1; k <= 1; k++) {
    const m = new THREE.Mesh(st, MATS.gid);
    const along = k * 0.28, edge = T / 2 - 0.07;
    const [x, z, rot] = side === 0 ? [along, -edge, 0] : side === 1 ? [along, edge, 0] : side === 2 ? [-edge, along, 1] : [edge, along, 1];
    m.position.set(bx + x, y0 + tH + 0.004, z);
    // a short stitch across the edge: along z on the front and back edges, along x on the sides
    if (rot) m.rotation.set(0, 0, Math.PI / 2); else m.rotation.set(Math.PI / 2, 0, 0);
    fixed.add(m);
  }
  anchors.bayit = new THREE.Vector3(bx, y0 + tH + B + 0.1, 0);
  anchors.titura = new THREE.Vector3(bx + T / 2, y0 + tH, T / 2);
  anchors.maabarta = new THREE.Vector3(mx - 0.15, y0 + MH + 0.32, T / 2 + 0.1);

  // the MB's notch in the titura, by the knot
  if (ex.notch) {
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.2, tH * 0.9, 0.12), MATS.slot);
    n.position.set(bx - T / 2 + 0.11, y0 + tH / 2 + 0.01, -T / 2 + 0.05); fixed.add(n);
    anchors.notch = n.position.clone().add(new THREE.Vector3(0, 0.1, -0.05));
  }
  // the Chazon Ish's piece of strap stuffed in the ma'abarta
  if (ex.insert) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(MW - 0.12, 0.045, T + 0.08), MATS.tan);
    p.position.set(mx, y0 + 0.17, 0); fixed.add(p);
    anchors.insert = new THREE.Vector3(mx, y0 + MH + 0.04, -T / 2 - 0.02);
  }

  // ── the moving part: knot (yud), loop and straps ──
  const knot = new THREE.Group();
  g.add(knot);
  const kz = -T / 2 - 0.12;
  const ky = y0 + 0.14;
  const far = method.loop === 'far';
  if (!stage.through) knot.position.z = -0.35; // not yet fed in: the knot sits off to the heart side
  // The yud, as in the video: the strap's tip folded twice into a small square tab, the natural
  // back of the strap showing at its edges.
  if (stage.yud) {
    const tab = new THREE.Group();
    tab.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), MATS.strapBack));
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.056), MATS.strapFront); tab.add(face);
    tab.position.set(mx - 0.04, ky + (stage.knot ? 0.17 : 0.06), kz - 0.04);
    tab.rotation.set(-0.35, 0.15, 0.25);
    tab.traverse((o) => { o.castShadow = true; });
    knot.add(tab);
  }
  if (stage.knot) {
    // the body of the knot: strap wrapped round on itself
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.22, 0.22, 3, 0.08), MATS.strapFront);
    body.position.set(mx, ky, kz); body.castShadow = true; knot.add(body);
    for (const [dx, rz] of [[-0.07, 0.5], [0.07, -0.5]]) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.022, 6, 24, Math.PI * 1.3), MATS.strapBack);
      wrap.position.set(mx + dx, ky, kz - 0.01); wrap.rotation.set(0, Math.PI / 2, rz); knot.add(wrap);
    }
  }
  // the leg of the yud: the strap's end, toward the heart
  knot.add(ribbon(path([new THREE.Vector3(mx + 0.02, ky - 0.04, kz - 0.08), new THREE.Vector3(mx + 0.05, ky - 0.16, kz - 0.25), new THREE.Vector3(mx + 0.08, ky - 0.32, kz - 0.36)], { steps: 20 }), 0.18));
  anchors.yud = new THREE.Vector3(mx, ky + 0.3, kz);
  anchors.leg = new THREE.Vector3(mx + 0.08, ky - 0.36, kz - 0.4);
  // through the ma'abarta
  if (stage.through) knot.add(ribbon(path([new THREE.Vector3(mx, y0 + 0.12, kz + 0.06), new THREE.Vector3(mx, y0 + 0.12, T / 2 + 0.06)], { steps: 6, normal: () => new THREE.Vector3(0, 1, 0) })));

  // the gid thread
  if (stage.extras && ex.thread === 'top') {
    knot.add(tube([new THREE.Vector3(bx - T / 2 + 0.06, y0 + tH + 0.005, -T / 2 + 0.08), new THREE.Vector3(mx + 0.1, ky + 0.14, kz + 0.02), new THREE.Vector3(mx - 0.05, ky + 0.15, kz - 0.12), new THREE.Vector3(mx - 0.17, ky, kz - 0.02), new THREE.Vector3(mx - 0.05, ky - 0.12, kz + 0.1), new THREE.Vector3(bx - T / 2 + 0.03, y0 + 0.05, -T / 2 + 0.06)], 0.014, MATS.gid));
    anchors.thread = new THREE.Vector3(mx, ky + 0.2, kz - 0.1);
  }
  if (stage.extras && ex.thread === 'under') {
    knot.add(tube([new THREE.Vector3(mx - 0.1, ky, kz), new THREE.Vector3(mx, y0 - 0.005, -T / 2 + 0.1), new THREE.Vector3(bx, y0 - 0.012, 0), new THREE.Vector3(bx + T / 2 - 0.1, y0 - 0.005, T / 2 - 0.1), new THREE.Vector3(bx + T / 2 + 0.02, y0 + tH, T / 2)], 0.02, MATS.gidBad));
    anchors.under = new THREE.Vector3(bx + 0.2, y0 - 0.1, T / 2 + 0.1);
  }

  // the loop: by the knot (Ashkenaz, Chabad), or doubled through to the far side (Sefard)
  const a0 = 0.5; // where the strap leaves the ma'abarta's ends, as an angle around the arm
  const xr = mx;
  const loopFar = far && stage.through;
  const loopPos = loopFar ? new THREE.Vector3(xr, y0 + 0.03, T / 2 + 0.24) : new THREE.Vector3(xr - 0.02, y0 + 0.02, kz - 0.2);
  if (stage.loop) {
    const r = ex.slip ? 0.09 : stage.loop === 'big' ? 0.26 : 0.14;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 10, 28), MATS.strapFront);
    loop.scale.set(1, 1, 0.35);
    loop.position.copy(loopPos);
    if (stage.loop === 'big' && !loopFar) loop.position.z -= 0.12;
    loop.rotation.y = Math.PI / 2;
    loop.castShadow = true;
    if (ex.slip) loop.position.set(mx - 0.13, ky - 0.02, kz - 0.06);
    knot.add(loop);
    anchors.loop = (ex.slip ? loop.position.clone() : loop.position.clone()).add(new THREE.Vector3(-0.15, 0.12 + (stage.loop === 'big' ? 0.15 : 0), loopFar ? 0.15 : -0.15));
  }
  // before the strap goes around the arm, it hangs loose off the heart side (or out of the far loop)
  if (stage.loose) {
    const from = stage.through ? new THREE.Vector3(mx, y0 + 0.1, T / 2 + 0.1) : new THREE.Vector3(mx + 0.1, ky - 0.05, kz - 0.05);
    const out = stage.through ? 1 : -1;
    knot.add(ribbon(path([from, from.clone().add(new THREE.Vector3(0.15, -0.1, 0.45 * out)), new THREE.Vector3(mx + 0.6, -0.2, 1.6 * out), new THREE.Vector3(mx + 1.2, -2.2, 2.0 * out)], { steps: 50 })));
    anchors.free = new THREE.Vector3(mx + 0.4, 0.2, 1.4 * out);
  }
  if (stage.ring) {
    // the ring: from one end of the ma'abarta, under the arm, to the loop on the other
    knot.add(ribbon(far ? helix(xr, xr, -a0, -2 * Math.PI + a0, 0.03, 90) : helix(xr, xr, a0, 2 * Math.PI - a0, 0.03, 90)));
  }

  // the free strap: from the loop around the arm and down toward the forearm
  const xFree = bx + T / 2 + 0.45; // first crossing of the top past the titura
  let free = null;
  if (stage.ring && ex.wrapBayit && stage.extras) {
    // Or LeTzion: around the bayit, then straight down to the forearm with no wraps on the upper arm
    const by = y0 + tH + B * 0.45, h = B / 2 + 0.03;
    const around = [];
    for (let i = 0; i <= 48; i++) {
      const a = Math.PI / 2 + (i / 48) * Math.PI * 2;
      const r = h / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      around.push(new THREE.Vector3(bx + r * Math.cos(a) * 0.98, by, r * Math.sin(a) * 0.98));
    }
    const bayitLoop = path(around, { steps: 120, normal: (p) => new THREE.Vector3(p.x - bx, 0, p.z).normalize() });
    knot.add(ribbon(path([loopPos.clone().add(new THREE.Vector3(0.05, 0.02, 0.05)), new THREE.Vector3(bx - 0.1, by - 0.1, T / 2 + 0.25), around[0]], { steps: 20 })));
    knot.add(ribbon(bayitLoop));
    knot.add(ribbon(path([around[around.length - 1], new THREE.Vector3(bx + B / 2 + 0.35, by - 0.15, h + 0.1), new THREE.Vector3(X1 - 0.1, armR(X1) * 0.7, armR(X1) * 0.75), new THREE.Vector3(X1 + 0.5, -0.9, 0.2)], { steps: 40 })));
    anchors.wrap = new THREE.Vector3(bx, by + 0.1, h + 0.12);
  } else if (stage.ring) {
    const start = far ? 0.75 : -0.75;
    const dir = far ? 1 : -1;
    const total = Math.PI * 2 * 2.2;
    // x along the way: reach the far side of the titura before the strap first comes over the top
    const xAt = (tr) => (tr < 4 ? xr + 0.05 + (xFree - xr - 0.05) * (tr / 4) : xFree + (X1 - 0.1 - xFree) * ((tr - 4) / (total - 4)));
    free = [];
    for (let i = 0; i <= 240; i++) {
      const tr = (total * i) / 240, a = start + dir * tr, x = xAt(tr), r = armR(x) + 0.035;
      const p = new THREE.Vector3(x, r * Math.cos(a), r * Math.sin(a));
      free.push({ p, n: radial(p) });
    }
    knot.add(ribbon(free));
    // and off the elbow toward the forearm
    const last = free[free.length - 1].p;
    knot.add(ribbon(path([last, new THREE.Vector3(X1 + 0.35, last.y - 0.4, last.z * 0.6), new THREE.Vector3(X1 + 0.6, -1.2, -0.1)], { steps: 24 })));
  }

  // a pass over the yud (the Be'er Heitev) or over the titura (the Chafetz Chaim knot)
  if (stage.extras && (ex.overYud || ex.chafetz)) {
    const top = y0 + MH + 0.06;
    knot.add(ribbon(path([loopPos.clone().add(new THREE.Vector3(0.1, 0, -0.05)), new THREE.Vector3(mx + 0.12, ky + 0.16, kz - 0.05), new THREE.Vector3(mx + 0.12, top, 0), new THREE.Vector3(mx + 0.12, top - 0.05, T / 2 + 0.12), new THREE.Vector3(mx + 0.15, y0 - 0.3, T / 2 + 0.35)], { steps: 40 }), 0.22));
    anchors.over = new THREE.Vector3(mx + 0.12, top + 0.12, 0);
  }
  if (stage.extras && ex.chafetz || stage.loop2) {
    const l2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 10, 28), MATS.strapFront);
    l2.scale.set(1, 1, 0.35); l2.position.set(mx - 0.05, y0 + 0.08, T / 2 + 0.2); l2.rotation.y = Math.PI / 2; knot.add(l2);
    anchors.loop2 = l2.position.clone().add(new THREE.Vector3(-0.1, 0.15, 0.15));
  }
  // Chabad: twice around the titura, like a shin (not over the ketzitzah)
  if (stage.extras && ex.shin) {
    for (const sg of [-1, 1]) {
      const x = bx + sg * (T / 2 - 0.08);
      knot.add(ribbon(path([new THREE.Vector3(x, y0 - 0.1, -T / 2 - 0.3), new THREE.Vector3(x, y0 + tH + 0.02, -T / 2 + 0.02), new THREE.Vector3(x, y0 + tH + 0.02, T / 2 - 0.02), new THREE.Vector3(x, y0 - 0.1, T / 2 + 0.3)], { steps: 30, normal: (p) => new THREE.Vector3(0, Math.max(0.3, p.y - y0 + 0.4), p.z * 0.6).normalize() }), 0.13));
    }
    anchors.shin = new THREE.Vector3(bx, y0 + tH + 0.1, -T / 2 - 0.1);
  }
  const baseZ = knot.position.z;
  // anchors on the moving part follow it
  if (knot.position.z) for (const k of ['yud', 'leg', 'loop', 'free']) anchors[k]?.add(knot.position);

  // the heart side, marked
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 16), MATS.heart);
  heart.position.set(mx, ky - 0.1, -T / 2 - 1.2); g.add(heart);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 16), MATS.heart);
  arrow.position.set(mx, ky - 0.1, -T / 2 - 1.0); arrow.rotation.x = -Math.PI / 2; g.add(arrow);
  anchors.heart = heart.position.clone().add(new THREE.Vector3(0, 0.15, 0));

  // the pull: an arrow along the free strap
  const pull = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 16), MATS.arrow);
  pull.visible = false;
  g.add(pull);

  // A lefty with a righty's pair, flipped: the ketzitzah toward the shoulder, the yud still at the heart.
  if (ex.flip) { fixed.scale.x = -1; knot.scale.x = -1; }
  if (ex.flip) {
    const mirror = (v) => v && v.set(-v.x, v.y, v.z);
    for (const k of Object.keys(anchors)) mirror(anchors[k]);
    heart.position.x *= -1; arrow.position.x *= -1;
  }
  // tilt it a little toward the heart, as it should sit (Shulchan Aruch 27:1)
  g.rotation.x = -0.12;

  return {
    group: g, anchors,
    /** pull: 0 (loose) → 1 (tight). Ashkenaz-style knots with nothing holding them slide off the bayit. */
    update(pullK) {
      const gap = method.holds ? 0 : 0.26 * pullK;
      knot.position.z = baseZ - gap;
      if (free && pullK > 0.01) {
        const i = Math.floor((1 - pullK) * 30) + 6;
        const s = free[Math.min(free.length - 2, i)];
        const t = free[Math.min(free.length - 1, i + 3)].p.clone().sub(s.p).normalize();
        pull.visible = true;
        pull.position.copy(s.p).add(s.n.clone().multiplyScalar(0.18));
        pull.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t.multiplyScalar(-1));
        if (ex.flip) pull.position.x *= -1;
      } else pull.visible = false;
      return gap;
    },
  };
}
