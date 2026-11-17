// Procedural produce: every piece is a deformed low-poly primitive, built once per kind and drawn
// as one InstancedMesh per crate kind. Nothing is downloaded; the whole aisle is generated here.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Layout = 'heap' | 'rows';
export interface PieceKind {
  geo: THREE.BufferGeometry;
  /** footprint across (m) */ size: number;
  /** footprint along the crate, for rows (m) */ length: number;
  /** height of the piece when resting (m) */ height: number;
  layout: Layout;
  /** vertex colours carry the real colour; instance colours only vary brightness */ baked: boolean;
}

type RGB = [number, number, number];
type ColorFn = (x: number, y: number, z: number) => RGB;

const tmp = new THREE.Color();
const hex = (h: string): RGB => { tmp.set(h); return [tmp.r, tmp.g, tmp.b]; };

// Cheap smooth pseudo-noise from summed sines: deterministic and good enough for lumps.
function n3(x: number, y: number, z: number) {
  return (
    Math.sin(x * 1.7 + y * 2.3) * Math.cos(z * 1.9 - x * 0.7) * 0.5 +
    Math.sin(y * 3.1 + z * 2.7 + 1.3) * 0.3 +
    Math.cos(x * 4.3 - z * 3.7 + y * 1.1) * 0.2
  );
}

/** Strip uv/normal and weld so displaced shapes get smooth normals. */
function clean(g: THREE.BufferGeometry) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  return mergeVertices(g, 1e-4);
}

function paint(g: THREE.BufferGeometry, fn?: ColorFn) {
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const rgb = fn ? fn(p.getX(i), p.getY(i), p.getZ(i)) : [1, 1, 1];
    c[i * 3] = rgb[0]; c[i * 3 + 1] = rgb[1]; c[i * 3 + 2] = rgb[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function finish(g: THREE.BufferGeometry, fn?: ColorFn) {
  g.computeVertexNormals();
  paint(g, fn);
  g.computeBoundingSphere();
  return g;
}

interface BlobOpts {
  r: number; sx?: number; sy?: number; sz?: number; seg?: number;
  ribs?: number; ribAmp?: number; noise?: number; noiseF?: number;
  dentTop?: number; dentBot?: number; taperTop?: number; taperBot?: number;
  color?: ColorFn;
}

/** A displaced sphere: apples, citrus, onions, pumpkins, cabbages… */
function blob(o: BlobOpts) {
  const seg = Math.round((o.seg ?? 12) * DETAIL);
  const g = clean(new THREE.SphereGeometry(1, seg, Math.max(5, Math.round(seg * 0.7))));
  const p = g.attributes.position;
  const nf = o.noiseF ?? 3;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let rr = 1;
    if (o.ribs) rr += (o.ribAmp ?? 0.05) * Math.cos(Math.atan2(z, x) * o.ribs) * (1 - Math.abs(y) * 0.8);
    if (o.noise) rr += o.noise * n3(x * nf, y * nf, z * nf);
    let h = 1;
    if (o.taperTop && y > 0) { h *= 1 - o.taperTop * y * y; y *= 1 + o.taperTop * 0.35; }
    if (o.taperBot && y < 0) { h *= 1 - o.taperBot * y * y; y *= 1 + o.taperBot * 0.45; }
    if (o.dentTop && y > 0.75) y -= o.dentTop * (y - 0.75) * 4;
    if (o.dentBot && y < -0.8) y += o.dentBot * (-0.8 - y) * 4;
    x *= rr * h * (o.sx ?? 1); z *= rr * h * (o.sz ?? 1); y *= rr * (o.sy ?? 1);
    p.setXYZ(i, x * o.r, y * o.r, z * o.r);
  }
  return finish(g, o.color);
}

/** Elongated piece along x: capsule with optional lumps, bend and taper. */
function stick(o: {
  r: number; len: number; seg?: number; ribs?: number; ribAmp?: number; noise?: number; bend?: number;
  taperEnd?: number; flat?: number; color?: ColorFn;
}) {
  const g = clean(new THREE.CapsuleGeometry(o.r, o.len, Math.round(3 * DETAIL), Math.round((o.seg ?? 8) * DETAIL)));
  g.rotateZ(Math.PI / 2); // long axis → x
  const p = g.attributes.position;
  const half = o.len / 2 + o.r;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = x / half; // -1..1 along the length
    let s = 1;
    if (o.ribs) s += (o.ribAmp ?? 0.08) * Math.cos(Math.atan2(z, y) * o.ribs);
    if (o.noise) s += o.noise * n3(x * 40, y * 40, z * 40);
    if (o.taperEnd) s *= 1 - o.taperEnd * Math.max(0, t) ** 1.2;
    y *= s; z *= s * (o.flat ?? 1);
    if (o.bend) y += o.bend * (1 - t * t) * o.len * 0.25;
    p.setXYZ(i, x, y, z);
  }
  return finish(g, o.color);
}

function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts, false)!;
  g.computeBoundingSphere();
  return g;
}

function at(g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
  m.setPosition(x, y, z);
  return g.applyMatrix4(m);
}

const two = (top: string, bottom: string, cut: number, soft = 0.004): ColorFn => {
  const a = hex(top), b = hex(bottom);
  return (_x, y) => {
    const t = THREE.MathUtils.clamp((y - cut) / soft + 0.5, 0, 1);
    return [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, b[2] + (a[2] - b[2]) * t];
  };
};

const cache = new Map<string, PieceKind>();
const hiCache = new Map<string, PieceKind>();
/** Segment multiplier: 1 for the hundreds of pieces in a crate, higher for the one in your hand. */
let DETAIL = 1;

/** A smooth, high-poly version of one piece, for holding it up to the camera. */
export function pieceKindHi(key: string): PieceKind {
  const hit = hiCache.get(key);
  if (hit) return hit;
  DETAIL = 3.5;
  try {
    const k = build(key);
    hiCache.set(key, k);
    return k;
  } finally {
    DETAIL = 1;
  }
}

/** One piece geometry per produce kind, keyed by the shape name (or a special id). */
export function pieceKind(key: string): PieceKind {
  const hit = cache.get(key);
  if (hit) return hit;
  const k = build(key);
  cache.set(key, k);
  return k;
}

function heap(geo: THREE.BufferGeometry, size: number, height = size, baked = false): PieceKind {
  return { geo, size, length: size, height, layout: 'heap', baked };
}
function rows(geo: THREE.BufferGeometry, size: number, length: number, height = size, baked = false): PieceKind {
  return { geo, size, length, height, layout: 'rows', baked };
}

function build(key: string): PieceKind {
  switch (key) {
    case 'apple': return heap(blob({ r: 0.038, sy: 0.9, dentTop: 0.35, dentBot: 0.15, noise: 0.02 }), 0.078, 0.07);
    case 'citrus': return heap(blob({ r: 0.04, noise: 0.012, noiseF: 9 }), 0.082);
    case 'lemon': return heap(blob({ r: 0.032, sy: 1.25, taperTop: 0.35, taperBot: 0.35, noise: 0.01, noiseF: 9 }), 0.066, 0.075);
    case 'pomegranate': {
      const body = blob({ r: 0.048, sy: 0.92, ribs: 6, ribAmp: 0.03, noise: 0.015 });
      // the calyx: a short flared tube, sunk into the top
      const crown = clean(new THREE.CylinderGeometry(0.011, 0.007, 0.014, 6, 1, true));
      finish(crown, () => [0.8, 0.62, 0.6]); at(crown, 0, 0.048, 0);
      return heap(merge([body, crown]), 0.098, 0.1);
    }
    case 'fig': return heap(blob({ r: 0.027, taperTop: 0.75, sy: 1.1, noise: 0.02, seg: 10 }), 0.056, 0.06);
    case 'grapes': {
      const parts: THREE.BufferGeometry[] = [];
      const berry = () => blob({ r: 0.011, seg: 6 });
      let n = 0;
      for (let row = 0; row < 5; row++) {
        const ring = 5 - row;
        for (let j = 0; j < ring; j++) {
          const a = (j / ring) * Math.PI * 2 + row;
          const rad = 0.006 * ring;
          parts.push(at(berry(), -0.045 + row * 0.02, 0.008 + (j % 2) * 0.004, Math.sin(a) * rad, 0, 0, 0));
          parts[parts.length - 1].translate(0, Math.cos(a) * rad * 0.4, 0);
          n++;
        }
      }
      void n;
      return rows(merge(parts), 0.07, 0.12, 0.04);
    }
    case 'olive': return heap(blob({ r: 0.012, sx: 1.35, seg: 6 }), 0.028, 0.022);
    case 'date': return rows(stick({ r: 0.009, len: 0.02, seg: 6, noise: 0.08 }), 0.022, 0.045, 0.02);
    case 'melon': {
      const dark = hex('#1f4a17'), light = hex('#7da35a');
      return heap(blob({
        r: 0.13, sx: 1.3, seg: 18, noise: 0.01,
        color: (x, y, z) => {
          const v = Math.sin(Math.atan2(y, z) * 9 + Math.sin(x * 40) * 0.6);
          const t = THREE.MathUtils.smoothstep(v, -0.1, 0.3);
          return [light[0] + (dark[0] - light[0]) * t, light[1] + (dark[1] - light[1]) * t, light[2] + (dark[2] - light[2]) * t];
        },
      }), 0.3, 0.24, true);
    }
    case 'zucchini': return rows(stick({ r: 0.022, len: 0.16, ribs: 6, ribAmp: 0.05, taperEnd: 0.25, seg: 10 }), 0.05, 0.22, 0.045);
    case 'cucumber': return rows(stick({ r: 0.02, len: 0.13, noise: 0.06, seg: 10, bend: 0.06 }), 0.046, 0.18, 0.042);
    case 'leek': {
      const g = stick({ r: 0.02, len: 0.32, seg: 8, color: (x) => (x > 0.04 ? hex('#3f7a2c') : x > 0.0 ? hex('#a8c77e') : hex('#eef0e2')) });
      const fan = clean(new THREE.ConeGeometry(0.045, 0.1, 6, 1, true));
      fan.rotateZ(Math.PI / 2);
      finish(fan, () => hex('#2f6a22'));
      fan.translate(0.2, 0, 0);
      return rows(merge([g, fan]), 0.05, 0.42, 0.045, true);
    }
    case 'onion': return heap(blob({ r: 0.034, sy: 0.92, taperTop: 0.7, noise: 0.02, seg: 10 }), 0.07, 0.07);
    case 'garlic': return heap(blob({ r: 0.026, ribs: 8, ribAmp: 0.08, taperTop: 0.75, dentBot: 0.4, seg: 10 }), 0.054, 0.05);
    case 'gourd': return heap(blob({ r: 0.11, sy: 0.72, ribs: 10, ribAmp: 0.07, dentTop: 0.6, dentBot: 0.4, seg: 18 }), 0.23, 0.17);
    case 'beans': return heap(blob({ r: 0.007, sx: 1.4, sz: 0.85, seg: 5, color: (x, y, z) => (y > 0.004 && Math.abs(x) < 0.003 && z > 0 ? hex('#1a1a1a') : [1, 1, 1]) }), 0.022, 0.012);
    case 'beet': return heap(blob({ r: 0.035, taperBot: 0.85, noise: 0.03, seg: 10 }), 0.072, 0.08);
    case 'carrot': {
      const body = stick({ r: 0.017, len: 0.14, taperEnd: 0.92, seg: 8, noise: 0.03, color: () => hex('#ee7418') });
      const top = clean(new THREE.CylinderGeometry(0.006, 0.01, 0.04, 5));
      top.rotateZ(Math.PI / 2); finish(top, () => hex('#3c7a22')); top.translate(-0.105, 0, 0);
      return rows(merge([body, top]), 0.04, 0.22, 0.035, true);
    }
    case 'tomato': {
      const body = blob({ r: 0.035, sy: 0.8, ribs: 5, ribAmp: 0.04, seg: 12, color: () => hex('#d8261c') });
      const cal = clean(new THREE.ConeGeometry(0.014, 0.008, 5));
      finish(cal, () => hex('#2f6a22')); cal.translate(0, 0.03, 0);
      return heap(merge([body, cal]), 0.072, 0.06, true);
    }
    case 'potato': return heap(blob({ r: 0.035, sx: 1.35, sz: 1.05, noise: 0.09, noiseF: 2.5, seg: 9 }), 0.08, 0.06);
    case 'banana': {
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 4; i++) {
        const f = stick({ r: 0.016, len: 0.15, bend: 0.5, ribs: 5, ribAmp: 0.06, seg: 6, taperEnd: 0.3 });
        at(f, 0, 0, (i - 1.5) * 0.03, (i - 1.5) * 0.12, 0, 0);
        parts.push(f);
      }
      return rows(merge(parts), 0.13, 0.2, 0.06);
    }
    case 'strawberry': {
      const body = blob({ r: 0.019, taperBot: 0.9, seg: 8, color: () => hex('#d61c2a') });
      const cal = clean(new THREE.ConeGeometry(0.014, 0.006, 6));
      finish(cal, () => hex('#2f7a22')); cal.translate(0, 0.019, 0);
      return heap(merge([body, cal]), 0.04, 0.045, true);
    }
    case 'peach': return heap(blob({ r: 0.037, ribs: 1, ribAmp: 0.04, noise: 0.01, seg: 12, color: (x, y) => (y > 0.01 && x > 0 ? hex('#d2502e') : hex('#f1a463')) }), 0.075, 0.07, true);
    case 'lettuce': return heap(blob({ r: 0.085, sy: 0.85, noise: 0.08, noiseF: 7, seg: 16 }), 0.17, 0.14);
    case 'cabbage': return heap(blob({ r: 0.085, sy: 0.92, noise: 0.03, noiseF: 4, seg: 16 }), 0.17, 0.15);
    case 'herb': {
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 6; i++) {
        const stem = clean(new THREE.CylinderGeometry(0.002, 0.002, 0.12, 4));
        stem.rotateZ(Math.PI / 2); finish(stem, () => hex('#5c9a3a'));
        const leaf = blob({ r: 0.03, sy: 0.35, noise: 0.25, noiseF: 9, seg: 7, color: () => hex('#3e8a2a') });
        leaf.translate(0.08, 0, 0);
        const g = merge([stem, leaf]);
        at(g, 0, 0.004 * i, 0, 0, (i - 2.5) * 0.12, 0);
        parts.push(g);
      }
      const tie = clean(new THREE.TorusGeometry(0.01, 0.003, 4, 8));
      tie.rotateY(Math.PI / 2); finish(tie, () => hex('#c9302c')); tie.translate(-0.03, 0.006, 0);
      parts.push(tie);
      return rows(merge(parts), 0.08, 0.2, 0.04, true);
    }
    case 'pepper': return heap(blob({ r: 0.038, sy: 1.05, ribs: 4, ribAmp: 0.1, dentTop: 0.5, taperBot: 0.25, seg: 12 }), 0.08, 0.08);
    case 'almond': return heap(blob({ r: 0.011, sx: 1.5, sz: 0.65, taperTop: 0.2, seg: 6, noise: 0.04, noiseF: 12 }), 0.028, 0.016);
    case 'walnut': return heap(blob({ r: 0.016, noise: 0.13, noiseF: 10, ribs: 2, ribAmp: 0.05, seg: 8 }), 0.034, 0.03);
    case 'carob': return rows(stick({ r: 0.012, len: 0.14, flat: 0.4, bend: 0.25, noise: 0.05, seg: 6 }), 0.035, 0.18, 0.015);
    case 'pod': return rows(stick({ r: 0.012, len: 0.12, noise: 0.18, bend: 0.15, seg: 6 }), 0.03, 0.16, 0.026);
    case 'lentil': return heap(blob({ r: 0.009, sy: 0.4, seg: 6 }), 0.02, 0.008);
    default: return heap(blob({ r: 0.04 }), 0.08);
  }
}

/** Open wooden crate, unit footprint: 1 (x, depth) × 1 (z, length) × 1 (y). Scaled per instance. */
export function crateGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.deleteAttribute('uv');
    g.translate(x, y, z);
    paint(g);
    parts.push(g);
  };
  const t = 0.035;
  box(1, 0.06, 1, 0, 0.03, 0);
  // two slats per side with a gap between, so it reads as a crate
  for (const [y, h] of [[0.25, 0.42], [0.78, 0.42]] as const) {
    box(t, h, 1, -0.5 + t / 2, y, 0);
    box(t, h, 1, 0.5 - t / 2, y, 0);
    box(1, h, t, 0, y, -0.5 + t / 2);
    box(1, h, t, 0, y, 0.5 - t / 2);
  }
  // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.06, 1, 0.06, sx * 0.47, 0.5, sz * 0.47);
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false)!;
}

/** A dome with height 1 at the centre and 0 at the rim, 1×1 footprint: the heap inside a crate. */
export function moundGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 14, 14);
  g.rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, moundHeight(x * 2, z * 2));
  }
  g.computeVertexNormals();
  paint(g);
  return g;
}

/** u, v in -1..1 */
export function moundHeight(u: number, v: number) {
  const a = Math.max(0, Math.cos((Math.min(1, Math.abs(u)) * Math.PI) / 2));
  const b = Math.max(0, Math.cos((Math.min(1, Math.abs(v)) * Math.PI) / 2));
  return Math.pow(a, 0.7) * Math.pow(b, 0.7);
}
