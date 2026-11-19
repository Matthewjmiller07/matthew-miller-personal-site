// Sand3D produce models. The files in public/produce-aisle/models/ come from Sandflow's open
// sand3d-objaverse dataset (CC-BY-4.0, each derived from a Sketchfab model), converted by
// scripts/produce-aisle/build-models.py. Two levels of detail per crate: a few hundred triangles for
// the pieces heaped in the crate, a few thousand for the one you pick up. See that script for the
// binary layout. manifest.json carries each model's real-world size and its credit.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import manifest from '../../../public/produce-aisle/models/manifest.json';
import type { PieceKind } from './geometry';

export interface Credit { title: string; author: string; url: string; license: string; id: string }
interface Entry { size: number; length: number; height: number; layout: 'heap' | 'rows'; credit: Credit }

export const MODELS = manifest as unknown as Record<string, Entry>;
export const hasModel = (id: string) => id in MODELS;
export const creditFor = (id: string): Credit | null => MODELS[id]?.credit ?? null;

const pad4 = (n: number) => (n + 3) & ~3;
const geoCache = new Map<string, Promise<THREE.BufferGeometry>>();

export function loadModelGeometry(id: string, lod: 'lo' | 'hi'): Promise<THREE.BufferGeometry> {
  const key = `${id}.${lod}`;
  let p = geoCache.get(key);
  if (!p) {
    p = fetch(`/produce-aisle/models/${key}.bin`)
      .then((r) => { if (!r.ok) throw new Error(`${key}: ${r.status}`); return r.arrayBuffer(); })
      .then((buf) => {
        const dv = new DataView(buf);
        const nV = dv.getUint32(0, true), nI = dv.getUint32(4, true);
        const lo = [8, 12, 16].map((o) => dv.getFloat32(o, true));
        const hi = [20, 24, 28].map((o) => dv.getFloat32(o, true));
        let o = 32;
        const q = new Uint16Array(buf, o, nV * 3); o += pad4(nV * 6);
        const rgb = new Uint8Array(buf.slice(o, o + nV * 3)); o += pad4(nV * 3);
        const idx = new Uint16Array(buf, o, nI);
        const pos = new Float32Array(nV * 3);
        for (let i = 0; i < nV * 3; i++) pos[i] = lo[i % 3] + (q[i] / 65535) * (hi[i % 3] - lo[i % 3]);
        let g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(rgb, 3, true)); // linear, as written
        g.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
        // smooth where the surface is smooth, crisp where the model has real edges
        g = toCreasedNormals(g, Math.PI / 5);
        g.computeBoundingSphere();
        return g;
      });
    geoCache.set(key, p);
    p.catch(() => geoCache.delete(key)); // let a later pick-up retry
  }
  return p;
}

/** The instanced-heap version of a model, in the shape the crate layout code expects. */
export async function loadPieceKind(id: string): Promise<PieceKind> {
  const m = MODELS[id];
  const geo = await loadModelGeometry(id, 'lo');
  return { geo, size: m.size, length: m.length, height: m.height, layout: m.layout, baked: true };
}
