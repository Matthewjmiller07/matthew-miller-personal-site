// The Produce Aisle scene: an Israeli supermarket's fruit-and-vegetable section in three.js.
// Everything is procedural and instanced: one draw call per produce kind, one for all crates, one for
// all heaps, one for all price cards. It renders only when something moves.
import * as THREE from 'three';
import { produce, sections, type Produce } from '../../data/produce-aisle';
import { crateGeometry, moundGeometry, moundHeight, pieceKind, pieceKindHi } from './geometry';

export interface Slot {
  item: Produce; index: number; side: -1 | 1; z: number;
  /** crate world matrix (unit crate → placed) */ matrix: THREE.Matrix4;
  center: THREE.Vector3;
}

export interface AisleApi {
  slots: Slot[];
  focus(id: string | null): void;
  goToSection(id: string): void;
  setPanelOffset(px: number, bottomPx: number): void;
  /** Pick one piece out of the open crate and hold it up to the camera (true), or put it back. */
  hold(on: boolean): void;
  dispose(): void;
}

interface Opts {
  canvas: HTMLCanvasElement;
  onSelect: (id: string | null) => void;
  onSection: (sectionId: string, progress: number) => void;
  onHover: (id: string | null) => void;
  onHold?: (holding: boolean) => void;
}

const AISLE_X = 1.55;       // crate centre distance from the aisle's centre line
const CRATE_W = 0.78;       // depth (x)
const CRATE_L = 1.08;       // length (z)
const CRATE_H = 0.24;
const TABLE_TOP = 0.78;
const TILT = 0.24;          // radians, crates lean toward the shopper
const PITCH = 1.22;         // z between pairs of crates
const SECTION_GAP = 1.7;
const EYE = 1.62;

function layoutSlots(): Slot[] {
  const slots: Slot[] = [];
  let z = 0;
  let index = 0;
  sections.forEach((sec, si) => {
    const items = produce.filter((p) => p.section === sec.id);
    if (si > 0) z -= SECTION_GAP;
    items.forEach((item, i) => {
      const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
      if (i > 0 && i % 2 === 0) z -= PITCH;
      const m = new THREE.Matrix4();
      const rot = new THREE.Matrix4().makeRotationZ(side * TILT);
      const lift = Math.sin(TILT) * CRATE_W * 0.5 + 0.02;
      m.makeTranslation(side * AISLE_X, TABLE_TOP + lift, z).multiply(rot);
      slots.push({ item, index: index++, side, z, matrix: m, center: new THREE.Vector3(side * AISLE_X, TABLE_TOP + lift + CRATE_H * 0.6, z) });
    });
    z -= PITCH;
  });
  return slots;
}

// Seeded PRNG so the heaps look the same every visit.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const HEB_FONT = '"Frank Ruhl Libre", "Noto Serif Hebrew", "David", serif';
const SANS = 'Inter, system-ui, sans-serif';

/** Price cards for every item, 4 × 8 cells of 512 × 256 on one 2048² canvas. */
function drawItemAtlas(ctx: CanvasRenderingContext2D, slots: Slot[]) {
  const W = 512, H = 256;
  ctx.clearRect(0, 0, 2048, 2048);
  slots.forEach((s, i) => {
    const x0 = (i % 4) * W, y0 = Math.floor(i / 4) * H;
    ctx.save();
    ctx.translate(x0, y0);
    // Israeli shelf card: yellow, red price, black name
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d0021b';
    ctx.fillRect(0, 0, W, 18);
    ctx.fillStyle = '#111';
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.font = `700 92px ${HEB_FONT}`;
    let name = s.item.he;
    let fs = 92;
    while (ctx.measureText(name).width > W - 40 && fs > 40) { fs -= 4; ctx.font = `700 ${fs}px ${HEB_FONT}`; }
    ctx.fillText(name, W - 22, 112);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = `600 30px ${SANS}`;
    ctx.fillStyle = '#333';
    ctx.fillText(s.item.en.replace(/\s*\(.*\)/, ''), 22, 160);
    ctx.font = `italic 400 24px ${SANS}`;
    ctx.fillStyle = '#5a4a00';
    ctx.fillText(s.item.translit, 22, 194);
    // price
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d0021b';
    ctx.font = `800 64px ${SANS}`;
    ctx.fillText(`₪${s.item.price}`, W - 22, 222);
    ctx.font = `500 20px ${SANS}`;
    ctx.fillStyle = '#333';
    ctx.direction = 'rtl';
    ctx.fillText(s.item.unit ? `ל${s.item.unit}` : 'לק״ג', W - 22, 246);
    ctx.restore();
  });
}

/** Overhead section signs, 1024 × 128 cells on a 1024² canvas; cell 7 is the end wall. */
function drawSectionAtlas(ctx: CanvasRenderingContext2D) {
  const W = 1024, H = 128;
  ctx.clearRect(0, 0, 1024, 1024);
  const cells = [...sections.map((s) => ({ he: s.he, en: s.en })), { he: 'קופות ←', en: 'Checkout · thanks for shopping' }];
  cells.forEach((c, i) => {
    const y0 = i * H;
    ctx.fillStyle = i === cells.length - 1 ? '#c8102e' : '#0b6e4f';
    ctx.fillRect(0, y0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(0, y0 + H - 8, W, 8);
    ctx.fillStyle = '#fff';
    ctx.direction = 'rtl'; ctx.textAlign = 'right';
    ctx.font = `700 70px ${HEB_FONT}`;
    ctx.fillText(c.he, W - 30, y0 + 86);
    ctx.direction = 'ltr'; ctx.textAlign = 'left';
    ctx.font = `600 34px ${SANS}`;
    ctx.fillText(c.en, 30, y0 + 78);
  });
}

function quad(geoParts: number[], uvParts: number[], m: THREE.Matrix4, w: number, h: number, u0: number, v0: number, u1: number, v1: number) {
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => new THREE.Vector3(x, y, 0).applyMatrix4(m));
  const uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  for (const i of [0, 1, 2, 0, 2, 3]) {
    geoParts.push(pts[i].x, pts[i].y, pts[i].z);
    uvParts.push(uv[i][0], uv[i][1]);
  }
}

function signMesh(pos: number[], uv: number[], tex: THREE.Texture) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#d9d4c7'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#cfc9ba'; x.fillRect(0, 0, 128, 128); x.fillRect(128, 128, 128, 128);
  x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 3;
  x.strokeRect(0, 0, 128, 128); x.strokeRect(128, 128, 128, 128); x.strokeRect(128, 0, 128, 128); x.strokeRect(0, 128, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function mountAisle(opts: Opts): AisleApi {
  const { canvas } = opts;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 1.5, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const BG = new THREE.Color('#ece7da');
  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 7, 26);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60);

  scene.add(new THREE.HemisphereLight('#fff8ec', '#8a8070', 2.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(0.6, 3, 1.2);
  scene.add(sun);

  const slots = layoutSlots();
  const zMin = Math.min(...slots.map((s) => s.z));
  const aisleLen = -zMin + 6;
  const zStart = 3.2, zEnd = zMin - 0.6;

  // ── room ──────────────────────────────────────────────────────────────────
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(d: T) => { disposables.push(d); return d; };

  const ftex = track(floorTexture());
  ftex.repeat.set(6 / 1.2, aisleLen / 1.2);
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(7, aisleLen + 8)), track(new THREE.MeshLambertMaterial({ map: ftex })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, zMin / 2);
  scene.add(floor);

  const wallMat = track(new THREE.MeshLambertMaterial({ color: '#f4f1ea' }));
  const bandMat = track(new THREE.MeshLambertMaterial({ color: '#0b6e4f' }));
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(track(new THREE.PlaneGeometry(aisleLen + 8, 3.6)), wallMat);
    wall.position.set(side * 2.75, 1.8, zMin / 2);
    wall.rotation.y = -side * Math.PI / 2;
    scene.add(wall);
    const band = new THREE.Mesh(track(new THREE.PlaneGeometry(aisleLen + 8, 0.32)), bandMat);
    band.position.set(side * 2.74, 2.25, zMin / 2);
    band.rotation.y = -side * Math.PI / 2;
    scene.add(band);
    // the long display table
    const table = new THREE.Mesh(track(new THREE.BoxGeometry(1.25, TABLE_TOP, -zMin + 2.2)), track(new THREE.MeshLambertMaterial({ color: '#2b2b2b' })));
    table.position.set(side * (AISLE_X + 0.1), TABLE_TOP / 2, zMin / 2);
    scene.add(table);
    const skirt = new THREE.Mesh(track(new THREE.PlaneGeometry(-zMin + 2.2, 0.12)), bandMat);
    skirt.position.set(side * (AISLE_X - 0.53), TABLE_TOP - 0.08, zMin / 2);
    skirt.rotation.y = -side * Math.PI / 2;
    scene.add(skirt);
    // misting pipe over the greens
    const pipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.015, 0.015, -zMin + 2, 6)), track(new THREE.MeshLambertMaterial({ color: '#b9b9b9' })));
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(side * (AISLE_X + 0.45), 1.55, zMin / 2);
    scene.add(pipe);
  }
  const ceiling = new THREE.Mesh(track(new THREE.PlaneGeometry(6, aisleLen + 8)), track(new THREE.MeshBasicMaterial({ color: '#f7f5f0' })));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 3.6, zMin / 2);
  scene.add(ceiling);
  // fluorescent strips, instanced
  const nLights = Math.ceil((aisleLen + 6) / 2.4);
  const lights = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.16, 0.04, 1.6)), track(new THREE.MeshBasicMaterial({ color: '#ffffff' })), nLights * 2);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < nLights; i++) for (const sx of [-1, 1]) {
    m4.makeTranslation(sx * 0.9, 3.56, 4 - i * 2.4);
    lights.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), m4);
  }
  scene.add(lights);

  // ── crates, heaps, produce ────────────────────────────────────────────────
  const crateScale = new THREE.Matrix4().makeScale(CRATE_W, CRATE_H, CRATE_L);
  const crates = new THREE.InstancedMesh(track(crateGeometry()), track(new THREE.MeshLambertMaterial({ color: '#ffffff' })), slots.length);
  const mounds = new THREE.InstancedMesh(track(moundGeometry()), track(new THREE.MeshLambertMaterial({ color: '#ffffff' })), slots.length);
  const c = new THREE.Color();
  const crateColor: Record<string, string> = { bins: '#e9e4d8', greens: '#22292a', coined: '#2f7d4f' };
  const innerW = CRATE_W - 0.07, innerL = CRATE_L - 0.07;

  // group slots by piece kind so each kind is one InstancedMesh
  const byKind = new Map<string, { slot: Slot; mats: THREE.Matrix4[]; cols: THREE.Color[] }[]>();
  const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pv = new THREE.Vector3();

  slots.forEach((s, i) => {
    crates.setMatrixAt(i, tmpM.copy(s.matrix).multiply(crateScale));
    c.set(crateColor[s.item.section] ?? '#b98a52');
    crates.setColorAt(i, c);

    const key = s.item.id === 'lemon' ? 'lemon' : s.item.shape;
    const kind = pieceKind(key);
    const H = kind.size < 0.06 ? 0.11 : kind.size < 0.12 ? 0.07 : 0.02;
    const bedY = 0.06 * CRATE_H + 0.02;
    // the heap underneath
    tmpM.copy(s.matrix).multiply(new THREE.Matrix4().makeTranslation(0, bedY, 0)).multiply(new THREE.Matrix4().makeScale(innerW, H + 0.001, innerL));
    mounds.setMatrixAt(i, tmpM);
    c.set(s.item.colors[0]).multiplyScalar(0.5);
    mounds.setColorAt(i, c);

    const rand = rng(i * 7919 + 17);
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    const along = kind.layout === 'rows' ? kind.length : kind.size;
    // tiny things (lentils, olives) get a minimum spacing; the coloured heap fills the gaps
    const nx = Math.max(1, Math.floor(innerW / Math.max(kind.size * 0.95, 0.032)));
    const nz = Math.max(1, Math.floor(innerL / Math.max(along * 0.95, 0.032)));
    const layers = kind.size < 0.06 ? 1 : 2;
    for (let L = 0; L < layers; L++) {
      const off = L * 0.5;
      for (let ix = 0; ix < nx - L; ix++) for (let iz = 0; iz < nz - L; iz++) {
        const lx = (ix + 0.5 + off) / nx - 0.5, lz = (iz + 0.5 + off) / nz - 0.5; // -0.5..0.5
        const u = lx * 2, v = lz * 2;
        if (L > 0 && u * u + v * v > 0.55) continue;
        const jx = (rand() - 0.5) * kind.size * 0.25, jz = (rand() - 0.5) * along * 0.2;
        const px = lx * innerW + jx, pz = lz * innerL + jz;
        const surf = bedY + moundHeight((px / innerW) * 2, (pz / innerL) * 2) * H;
        const y = surf + kind.height * 0.42 + L * kind.height * 0.75;
        if (kind.layout === 'rows') e.set((rand() - 0.5) * 0.4, Math.PI / 2 + (rand() - 0.5) * 0.35, (rand() - 0.5) * 0.15);
        else e.set(rand() * Math.PI * 0.3, rand() * Math.PI * 2, (rand() - 0.5) * 0.4);
        q.setFromEuler(e);
        const s0 = 0.9 + rand() * 0.2;
        sc.set(s0, s0, s0);
        pv.set(px, y, pz);
        mats.push(new THREE.Matrix4().compose(pv, q, sc).premultiply(s.matrix));
        const col = new THREE.Color();
        if (kind.baked) col.setScalar(0.85 + rand() * 0.2);
        else col.set(s.item.colors[Math.floor(rand() * s.item.colors.length)]).multiplyScalar(0.9 + rand() * 0.2);
        cols.push(col);
      }
    }
    const list = byKind.get(key) ?? [];
    list.push({ slot: s, mats, cols });
    byKind.set(key, list);
  });
  scene.add(crates, mounds);

  const pieceMat = track(new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true }));
  let totalPieces = 0;
  for (const [key, list] of byKind) {
    const kind = pieceKind(key);
    const count = list.reduce((n, l) => n + l.mats.length, 0);
    const mesh = new THREE.InstancedMesh(kind.geo, pieceMat, count);
    let k = 0;
    for (const l of list) l.mats.forEach((m, j) => { mesh.setMatrixAt(k, m); mesh.setColorAt(k, l.cols[j]); k++; });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    track(kind.geo);
    scene.add(mesh);
    totalPieces += count;
  }
  (canvas as any).dataset.pieces = String(totalPieces);

  // ── signs ─────────────────────────────────────────────────────────────────
  const itemCanvas = document.createElement('canvas');
  itemCanvas.width = itemCanvas.height = 2048;
  const secCanvas = document.createElement('canvas');
  secCanvas.width = secCanvas.height = 1024;
  const itemTex = track(new THREE.CanvasTexture(itemCanvas));
  const secTex = track(new THREE.CanvasTexture(secCanvas));
  for (const t of [itemTex, secTex]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }
  const drawSigns = () => {
    drawItemAtlas(itemCanvas.getContext('2d')!, slots);
    drawSectionAtlas(secCanvas.getContext('2d')!);
    itemTex.needsUpdate = secTex.needsUpdate = true;
    dirty = true;
  };

  const pos: number[] = [], uv: number[] = [];
  const cardW = 0.36, cardH = 0.18;
  slots.forEach((s, i) => {
    const u0 = (i % 4) / 4, v1 = 1 - Math.floor(i / 4) / 8, v0 = v1 - 1 / 8;
    const m = new THREE.Matrix4().makeTranslation(s.side * (AISLE_X - CRATE_W / 2 - 0.02), TABLE_TOP + 0.24, s.z)
      .multiply(new THREE.Matrix4().makeRotationY(-s.side * Math.PI / 2))
      .multiply(new THREE.Matrix4().makeRotationX(-0.35));
    quad(pos, uv, m, cardW, cardH, u0, v0, u0 + 0.25, v1);
  });
  const cards = signMesh(pos, uv, itemTex);
  track(cards.geometry); track(cards.material as THREE.Material);
  scene.add(cards);
  // card stands
  const stands = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4)), track(new THREE.MeshLambertMaterial({ color: '#888' })), slots.length);
  slots.forEach((s, i) => { m4.makeTranslation(s.side * (AISLE_X - CRATE_W / 2 - 0.02), TABLE_TOP + 0.08, s.z); stands.setMatrixAt(i, m4); });
  scene.add(stands);

  const sPos: number[] = [], sUv: number[] = [];
  const sectionZ: { id: string; z: number }[] = [];
  sections.forEach((sec, i) => {
    const first = slots.find((s) => s.item.section === sec.id)!;
    const z = first.z + PITCH * 0.55;
    sectionZ.push({ id: sec.id, z: first.z });
    const v1 = 1 - i / 8, v0 = v1 - 1 / 8;
    quad(sPos, sUv, new THREE.Matrix4().makeTranslation(0, 2.75, z), 2.4, 0.3, 0, v0, 1, v1);
  });
  // end wall sign
  quad(sPos, sUv, new THREE.Matrix4().makeTranslation(0, 2.2, zMin - 3.2), 3.2, 0.4, 0, 1 - 8 / 8, 1, 1 - 7 / 8);
  const secSigns = signMesh(sPos, sUv, secTex);
  track(secSigns.geometry); track(secSigns.material as THREE.Material);
  scene.add(secSigns);
  // chains for the hanging signs
  const chains = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.004, 0.004, 0.7, 3)), track(new THREE.MeshBasicMaterial({ color: '#666' })), sections.length * 2);
  sectionZ.forEach((s, i) => { for (const sx of [-1, 1]) { m4.makeTranslation(sx * 1.0, 3.25, s.z + PITCH * 0.55); chains.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), m4); } });
  scene.add(chains);
  const endWall = new THREE.Mesh(track(new THREE.PlaneGeometry(6, 3.6)), wallMat);
  endWall.position.set(0, 1.8, zMin - 3.3);
  scene.add(endWall);

  // ── picking + highlight ───────────────────────────────────────────────────
  const pick = new THREE.InstancedMesh(track(new THREE.BoxGeometry(1, 1, 1)), track(new THREE.MeshBasicMaterial()), slots.length);
  slots.forEach((s, i) => pick.setMatrixAt(i, tmpM.copy(s.matrix).multiply(new THREE.Matrix4().makeTranslation(0, 0.22, 0)).multiply(new THREE.Matrix4().makeScale(CRATE_W + 0.1, 0.5, CRATE_L))));
  pick.visible = false;
  pick.computeBoundingSphere();
  scene.add(pick);

  const hl = new THREE.LineSegments(track(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))), track(new THREE.LineBasicMaterial({ color: '#ffb000', transparent: true, opacity: 0.95 })));
  hl.visible = false;
  hl.matrixAutoUpdate = false;
  scene.add(hl);
  const glow = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), track(new THREE.MeshBasicMaterial({ color: '#ffcc33', transparent: true, opacity: 0.22, depthWrite: false })));
  glow.rotation.x = -Math.PI / 2;
  glow.visible = false;
  scene.add(glow);

  const showHighlight = (i: number | null) => {
    if (i == null) { hl.visible = glow.visible = false; dirty = true; return; }
    const s = slots[i];
    hl.matrix.copy(s.matrix).multiply(new THREE.Matrix4().makeTranslation(0, CRATE_H * 0.5, 0)).multiply(new THREE.Matrix4().makeScale(CRATE_W + 0.03, CRATE_H + 0.03, CRATE_L + 0.03));
    hl.visible = true;
    glow.position.set(s.side * (AISLE_X - 0.9), 0.005, s.z);
    glow.scale.set(0.8, CRATE_L, 1);
    glow.visible = true;
    dirty = true;
  };

  // ── camera state ──────────────────────────────────────────────────────────
  let walkZ = zStart, walkTarget = zStart;
  let yaw = 0, yawTarget = 0, pitch = -0.12, pitchTarget = -0.12;
  let focused: number | null = null;
  let hovered: number | null = null;
  const camPos = new THREE.Vector3(0, EYE, zStart);
  const camLook = new THREE.Vector3(0, EYE - 0.3, zStart - 3);
  const goalPos = new THREE.Vector3(), goalLook = new THREE.Vector3();
  let dirty = true;
  let panelX = 0, panelY = 0;

  function computeGoal() {
    if (focused != null) {
      const s = slots[focused];
      goalPos.set(-s.side * 0.15, 1.72, s.z + 1.05);
      goalLook.set(s.side * (AISLE_X - 0.05), TABLE_TOP + 0.12, s.z - 0.05);
    } else {
      goalPos.set(0, EYE, walkZ);
      goalLook.set(-Math.sin(yaw) * 3, EYE + Math.sin(pitch) * 3, walkZ - Math.cos(yaw) * 3);
    }
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 74 : 62;
    applyOffset();
    camera.updateProjectionMatrix();
    dirty = true;
  }
  function applyOffset() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (panelX || panelY) camera.setViewOffset(w, h, panelX / 2, panelY / 2, w, h);
    else camera.clearViewOffset();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // ── holding one piece up close ────────────────────────────────────────────
  // A smooth, high-poly copy of the piece lifts out of the crate and floats in front of the camera,
  // in the middle of whatever part of the view the panel leaves free. Drag turns it, scroll brings it
  // closer, a click puts it back.
  const holdMat = track(new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.45, metalness: 0, transparent: true, opacity: 1 }));
  const held = new THREE.Mesh(new THREE.BufferGeometry(), holdMat);
  held.visible = false;
  held.frustumCulled = false;
  held.renderOrder = 2; // transparent pass, so it draws after (over) the dimming backdrop
  scene.add(held);
  const backdrop = new THREE.Mesh(track(new THREE.PlaneGeometry(6, 6)), track(new THREE.MeshBasicMaterial({ color: '#141210', transparent: true, opacity: 0, depthTest: false, depthWrite: false })));
  backdrop.renderOrder = 1;
  backdrop.visible = false;
  backdrop.frustumCulled = false;
  scene.add(backdrop);
  const holdLight = new THREE.PointLight('#fff2dc', 0, 3, 1.2); // always present, so toggling it never recompiles shaders
  scene.add(holdLight);
  let holdSlot = -1, holdT = 0, holdGoal = 0, holdScale = 1, holdDist = 0.55, holdClock = 0, spinning = true;
  const holdQ = new THREE.Quaternion();
  const fwd = new THREE.Vector3(), camUp = new THREE.Vector3(), camRight = new THREE.Vector3(), hp = new THREE.Vector3();
  const qa = new THREE.Quaternion(), axis = new THREE.Vector3();

  function pickUp(i: number) {
    const s = slots[i];
    const key = s.item.id === 'lemon' ? 'lemon' : s.item.shape;
    const kind = pieceKindHi(key);
    if (!kind.geo.boundingSphere) kind.geo.computeBoundingSphere();
    track(kind.geo);
    held.geometry = kind.geo;
    holdMat.color.set(kind.baked ? '#ffffff' : s.item.colors[0]);
    holdScale = 0.14 / kind.geo.boundingSphere!.radius;
    holdQ.setFromEuler(new THREE.Euler(0.35, Math.random() * Math.PI * 2, 0.1));
    holdSlot = i; holdGoal = 1; holdDist = 0.55; spinning = true;
    held.visible = backdrop.visible = true;
    opts.onHold?.(true);
    kick();
  }
  function putDown(instant = false) {
    if (holdSlot < 0) return;
    holdGoal = 0;
    if (instant) { holdT = 0; held.visible = backdrop.visible = false; holdLight.intensity = 0; holdSlot = -1; dirty = true; }
    opts.onHold?.(false);
    kick();
  }
  const holding = () => holdSlot >= 0 && holdGoal === 1;

  function updateHeld(dt: number) {
    if (holdSlot < 0) return false;
    holdT = THREE.MathUtils.clamp(holdT + (holdGoal ? 1 : -1) * dt * 2.4, 0, 1);
    if (holdT === 0 && holdGoal === 0) {
      held.visible = backdrop.visible = false; holdLight.intensity = 0; holdSlot = -1;
      return true;
    }
    const e = holdT * holdT * (3 - 2 * holdT);
    holdClock += dt;
    camera.getWorldDirection(fwd);
    camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    hp.copy(camera.position).addScaledVector(fwd, holdDist).addScaledVector(camUp, Math.sin(holdClock * 1.6) * 0.004);
    // arc up out of the crate on the way
    held.position.copy(slots[holdSlot].center).lerp(hp, e).addScaledVector(camUp, Math.sin(e * Math.PI) * 0.12);
    held.scale.setScalar(1 + (holdScale - 1) * e);
    if (spinning) holdQ.premultiply(qa.setFromAxisAngle(axis.set(0, 1, 0), dt * 0.5));
    held.quaternion.copy(camera.quaternion).multiply(holdQ);
    backdrop.position.copy(camera.position).addScaledVector(fwd, 1.1);
    backdrop.quaternion.copy(camera.quaternion);
    (backdrop.material as THREE.MeshBasicMaterial).opacity = 0.62 * e;
    holdLight.position.copy(camera.position).addScaledVector(camUp, 0.35).addScaledVector(camRight, 0.3);
    holdLight.intensity = 2 * e;
    canvas.dataset.hold = e.toFixed(2);
    return true;
  }

  // ── input ─────────────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function hit(clientX: number, clientY: number): number | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const h = raycaster.intersectObject(pick, false)[0];
    return h?.instanceId ?? null;
  }

  const clampZ = (z: number) => Math.min(zStart, Math.max(zEnd, z));

  function onWheel(ev: WheelEvent) {
    if (holding()) {
      ev.preventDefault();
      holdDist = THREE.MathUtils.clamp(holdDist + (ev.deltaMode === 1 ? ev.deltaY * 30 : ev.deltaY) * 0.0006, 0.28, 0.95);
      return;
    }
    if (focused != null) { opts.onSelect(null); return; }
    const d = (ev.deltaMode === 1 ? ev.deltaY * 30 : ev.deltaY) * 0.006;
    const atEnd = walkTarget <= zEnd + 0.01 && d > 0, atStart = walkTarget >= zStart - 0.01 && d < 0;
    if (atEnd || atStart) return; // let the page scroll past the aisle
    ev.preventDefault();
    walkTarget = clampZ(walkTarget - d);
  }

  let down: { lx: number; ly: number; x: number; y: number; t: number; yaw: number; pitch: number; z: number; id: number; moved: boolean; touch: boolean } | null = null;
  function onDown(ev: PointerEvent) {
    down = { lx: ev.clientX, ly: ev.clientY, x: ev.clientX, y: ev.clientY, t: performance.now(), yaw: yawTarget, pitch: pitchTarget, z: walkTarget, id: ev.pointerId, moved: false, touch: ev.pointerType !== 'mouse' };
    canvas.setPointerCapture(ev.pointerId);
  }
  function onMove(ev: PointerEvent) {
    if (down && ev.pointerId === down.id) {
      const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
      if (!down.moved) return;
      if (holding()) {
        // turn the piece in your hand, around the view's own axes
        const mx = ev.clientX - down.lx, my = ev.clientY - down.ly;
        holdQ.premultiply(qa.setFromAxisAngle(axis.set(0, 1, 0), mx * 0.012));
        holdQ.premultiply(qa.setFromAxisAngle(axis.set(1, 0, 0), my * 0.012));
        down.lx = ev.clientX; down.ly = ev.clientY;
        spinning = false;
        return;
      }
      if (focused != null) return;
      yawTarget = THREE.MathUtils.clamp(down.yaw + dx * 0.004, -1.2, 1.2);
      if (down.touch) walkTarget = clampZ(down.z + dy * 0.02);       // swipe up = walk forward
      else pitchTarget = THREE.MathUtils.clamp(down.pitch + dy * 0.003, -0.6, 0.35);
      return;
    }
    if (ev.pointerType === 'mouse') {
      const h = hit(ev.clientX, ev.clientY);
      if (h !== hovered) {
        hovered = h;
        canvas.style.cursor = h != null ? 'pointer' : 'grab';
        if (focused == null) showHighlight(h);
        opts.onHover(h != null ? slots[h].item.id : null);
      }
    }
  }
  function onUp(ev: PointerEvent) {
    if (!down || ev.pointerId !== down.id) return;
    const wasClick = !down.moved && performance.now() - down.t < 500;
    down = null;
    if (!wasClick) return;
    if (holding()) { putDown(); return; }
    const h = hit(ev.clientX, ev.clientY);
    if (h != null && h === focused) { pickUp(h); return; } // click the open crate again to take one out
    opts.onSelect(h != null ? slots[h].item.id : null);
  }
  const keys = new Set<string>();
  function onKey(ev: KeyboardEvent) {
    const t = ev.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = ev.key;
    if (ev.type === 'keyup') { keys.delete(k); return; }
    if (k === 'Escape' && holding()) { putDown(); return; }
    if (k === 'Escape' && focused != null) { opts.onSelect(null); return; }
    if (focused != null && (k === ']' || k === 'ArrowRight' || k === 'n')) { opts.onSelect(slots[(focused + 1) % slots.length].item.id); ev.preventDefault(); return; }
    if (focused != null && (k === '[' || k === 'ArrowLeft' || k === 'p')) { opts.onSelect(slots[(focused - 1 + slots.length) % slots.length].item.id); ev.preventDefault(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd'].includes(k)) {
      const r = canvas.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight * 0.6) return; // only while the aisle is on screen
      keys.add(k);
      ev.preventDefault();
    }
  }
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => { down = null; });
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  // ── loop ──────────────────────────────────────────────────────────────────
  let raf = 0, last = performance.now();
  let lastSection = '';
  let visible = true;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { dirty = true; kick(); } });
  io.observe(canvas);

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (keys.size) {
      if (keys.has('ArrowUp') || keys.has('w')) walkTarget = clampZ(walkTarget - dt * 3.2);
      if (keys.has('ArrowDown') || keys.has('s')) walkTarget = clampZ(walkTarget + dt * 3.2);
      if (focused == null && (keys.has('ArrowLeft') || keys.has('a'))) yawTarget = Math.min(1.2, yawTarget + dt * 1.6);
      if (focused == null && (keys.has('ArrowRight') || keys.has('d'))) yawTarget = Math.max(-1.2, yawTarget - dt * 1.6);
    }
    const k = 1 - Math.exp(-dt * 6);
    walkZ += (walkTarget - walkZ) * k;
    yaw += (yawTarget - yaw) * k;
    pitch += (pitchTarget - pitch) * k;
    computeGoal();
    const before = camPos.distanceToSquared(goalPos) + camLook.distanceToSquared(goalLook);
    camPos.lerp(goalPos, k);
    camLook.lerp(goalLook, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    const holdingNow = updateHeld(dt);
    const moving = holdingNow || before > 1e-7 || keys.size > 0 || Math.abs(walkTarget - walkZ) > 1e-4 || Math.abs(yawTarget - yaw) > 1e-4;
    if (dirty || moving) {
      renderer.render(scene, camera);
      dirty = false;
    }
    // section readout
    let cur = sectionZ[0];
    for (const s of sectionZ) if (camPos.z <= s.z + PITCH + 1.0) cur = s;
    const progress = THREE.MathUtils.clamp((zStart - camPos.z) / (zStart - zEnd), 0, 1);
    if (cur.id !== lastSection || moving) { opts.onSection(cur.id, progress); lastSection = cur.id; }
    if (moving && visible) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  // any input wakes the loop
  for (const ev of ['wheel', 'pointerdown', 'pointermove'] as const) canvas.addEventListener(ev, kick, { passive: true });
  window.addEventListener('keydown', kick);

  resize();
  drawSigns();
  // Redraw the signs once the Hebrew webfont is in (the canvas can't wait for CSS on its own).
  if (document.fonts?.load) {
    Promise.all([document.fonts.load(`700 64px "Frank Ruhl Libre"`, 'תפוח'), document.fonts.load(`600 30px Inter`)])
      .then(() => { drawSigns(); kick(); })
      .catch(() => {});
  }
  kick();

  const api: AisleApi = {
    slots,
    focus(id) {
      const i = id ? slots.findIndex((s) => s.item.id === id) : -1;
      if (holdSlot >= 0 && i !== holdSlot) putDown(true);
      if (i >= 0) {
        focused = i;
        walkTarget = clampZ(slots[i].z + 1.05);
        walkZ = walkTarget;
        yawTarget = 0;
        showHighlight(i);
      } else {
        if (focused != null) { walkZ = walkTarget = clampZ(slots[focused].z + 1.4); yaw = yawTarget = 0; }
        focused = null;
        showHighlight(hovered);
      }
      kick();
    },
    goToSection(id) {
      const s = sectionZ.find((x) => x.id === id);
      if (!s) return;
      if (focused != null) opts.onSelect(null);
      walkTarget = clampZ(s.z + PITCH + 0.6);
      yawTarget = 0;
      kick();
    },
    hold(on) {
      if (on && focused != null) pickUp(focused);
      else putDown();
    },
    setPanelOffset(px, py) { panelX = px; panelY = py; applyOffset(); camera.updateProjectionMatrix(); dirty = true; kick(); },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('keydown', kick);
      for (const d of disposables) d.dispose();
      scene.traverse((o) => { if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose(); });
      renderer.dispose();
    },
  };
  return api;
}
