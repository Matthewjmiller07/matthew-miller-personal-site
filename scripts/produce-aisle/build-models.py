#!/usr/bin/env python3
"""Convert Sand3D produce objects into the compact models /produce loads.

Source: Sandflow's sand3d-objaverse dataset (https://huggingface.co/datasets/Sandflow/sand3d-objaverse):
each object is an OpenUSD file written by a sand3d program, metres, Z up, per-part materials. Every
object here is CC-BY-4.0 and derived from a Sketchfab model; the per-object credit goes into
manifest.json, which the page shows.

For each crate this writes two levels of detail into public/produce-aisle/models/:
  <id>.lo.bin  a few hundred triangles: the hundreds of pieces heaped in the crate (instanced)
  <id>.hi.bin  a few thousand: the one you pick up
and one manifest.json (size, layout, credit).

  python3 scripts/produce-aisle/build-models.py <dir of <id>.usda> <meta.json>
Needs: usd-core numpy trimesh fast-simplification

Binary layout (little endian), all sections 4-byte aligned:
  u32 nVerts, u32 nIdx, f32 min[3], f32 max[3],
  u16 pos[nVerts*3] (quantised across the box), u8 rgb[nVerts*3] (linear colour), u16 idx[nIdx]
"""
import json, math, os, re, struct, sys
import numpy as np
import fast_simplification
from pxr import Usd, UsdGeom, UsdShade

SRC, META = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'produce-aisle', 'models')
os.makedirs(OUT, exist_ok=True)

# id -> (longest side in metres, layout, lie flat along its length)
KINDS = {
    'apple': (0.078, 'heap', False), 'tapuz': (0.082, 'heap', False), 'lemon': (0.075, 'heap', False),
    'pomegranate': (0.095, 'heap', False), 'peach': (0.078, 'heap', False), 'strawberry': (0.045, 'heap', False),
    'onion': (0.075, 'heap', False), 'garlic': (0.056, 'heap', False), 'beet': (0.17, 'heap', False),
    'agvaniya': (0.078, 'heap', False), 'gourd': (0.22, 'heap', False), 'avatiach': (0.30, 'heap', False),
    'cabbage': (0.18, 'heap', False),
    'banana': (0.19, 'rows', True), 'kishu': (0.21, 'rows', True), 'melafefon': (0.17, 'rows', True),
    'carrot': (0.21, 'rows', True), 'leek': (0.28, 'rows', True), 'pepper': (0.13, 'rows', True),
    'fava': (0.14, 'rows', True), 'grapes': (0.12, 'rows', True),
}
LO, HI = 260, 6500   # triangle budgets
LO_OVERRIDE = {'banana': 900, 'pepper': 400, 'carrot': 400, 'fava': 500}  # thin things fall apart below this

def load(path):
    st = Usd.Stage.Open(path)
    cache = UsdGeom.XformCache()
    parts = []
    for p in st.Traverse():
        if not p.IsA(UsdGeom.Mesh): continue
        m = UsdGeom.Mesh(p)
        pts = np.array(m.GetPointsAttr().Get(), dtype=np.float64)
        idx = np.array(m.GetFaceVertexIndicesAttr().Get(), dtype=np.int64)
        cnt = np.array(m.GetFaceVertexCountsAttr().Get(), dtype=np.int64)
        if len(pts) == 0 or len(idx) == 0: continue
        M = np.array(cache.GetLocalToWorldTransform(p)).T          # row-vector → column-vector form
        pts = (np.c_[pts, np.ones(len(pts))] @ M.T)[:, :3]
        # triangulate (they already are, but be safe: fan)
        tris, o = [], 0
        for c in cnt:
            for k in range(1, c - 1): tris.append((idx[o], idx[o + k], idx[o + k + 1]))
            o += c
        col = (0.6, 0.6, 0.6)
        mat = UsdShade.MaterialBindingAPI(p).ComputeBoundMaterial()[0]
        if mat:
            for s in mat.GetPrim().GetChildren():
                sh = UsdShade.Shader(s)
                if sh and sh.GetInput('diffuseColor') and sh.GetInput('diffuseColor').Get() is not None:
                    col = tuple(float(x) for x in sh.GetInput('diffuseColor').Get()); break
        else:
            dc = UsdGeom.PrimvarsAPI(p).GetPrimvar('displayColor')
            if dc and dc.Get(): col = tuple(float(x) for x in dc.Get()[0])
        # Z up → Y up: (x, y, z) → (x, z, -y)
        pts = np.c_[pts[:, 0], pts[:, 2], -pts[:, 1]]
        parts.append((pts, np.array(tris, dtype=np.int64), col))
    return parts

def weld(pts, tris, tol=1e-6):
    key = np.round(pts / tol).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    tris = inv.reshape(-1)[tris]
    keep = (tris[:, 0] != tris[:, 1]) & (tris[:, 1] != tris[:, 2]) & (tris[:, 0] != tris[:, 2])
    pts = pts[first]
    tris = tris[keep]
    used = np.unique(tris)
    remap = -np.ones(len(pts), dtype=np.int64); remap[used] = np.arange(len(used))
    return pts[used], remap[tris]

def cluster(pts, tris, target):
    """Vertex clustering: snap to a grid and merge. Cruder than quadric decimation, but it works on the
    open, non-manifold thin sheets (leaves, stems) the quadric collapse refuses to touch."""
    diag = np.linalg.norm(pts.max(axis=0) - pts.min(axis=0))
    lo, hi = diag / 400, diag / 2
    best = (pts, tris)
    for _ in range(14):
        h = math.sqrt(lo * hi)
        key = np.floor((pts - pts.min(axis=0)) / h).astype(np.int64)
        _, inv = np.unique(key, axis=0, return_inverse=True)
        inv = inv.reshape(-1)
        n = inv.max() + 1
        sums = np.zeros((n, 3)); cnt = np.bincount(inv, minlength=n)
        for k in range(3): sums[:, k] = np.bincount(inv, weights=pts[:, k], minlength=n)
        q = sums / cnt[:, None]
        f = inv[tris]
        keep = (f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 0] != f[:, 2])
        f = f[keep]
        if len(f) > target: lo = h
        else: hi = h; best = (q, f)
    q, f = best
    used = np.unique(f)
    remap = -np.ones(len(q), dtype=np.int64); remap[used] = np.arange(len(used))
    return q[used], remap[f]

def decimate(pts, tris, target, crude_ok):
    if len(tris) <= target: return pts, tris
    red = 1 - target / len(tris)
    p, f = fast_simplification.simplify(pts.astype(np.float32), tris.astype(np.int32), target_reduction=min(red, 0.985), agg=5)
    p, f = p.astype(np.float64), f.astype(np.int64)
    # the quadric collapse leaves open sheets (leaves, thin skins) alone; the grid fallback is crude, so
    # only the tiny heap version uses it, and the pick-up version keeps its few extra triangles
    if crude_ok and len(f) > target * 1.5 and len(f) > 40:
        p, f = cluster(p, f, target)
    return p, f

def orient(parts, lie):
    allp = np.vstack([p for p, _, _ in parts])
    c = allp.mean(axis=0)
    if lie:
        u, s, vt = np.linalg.svd(allp - c, full_matrices=False)
        R = vt                                       # rows: longest, middle, shortest axis
        if np.linalg.det(R) < 0: R[2] *= -1
        # longest → x, shortest → y (up), middle → z
        B = np.array([R[0], R[2], R[1]])
        if np.linalg.det(B) < 0: B[1] *= -1
        parts = [((p - c) @ B.T, t, col) for p, t, col in parts]
    else:
        parts = [(p - c, t, col) for p, t, col in parts]
    allp = np.vstack([p for p, _, _ in parts])
    lo, hi = allp.min(axis=0), allp.max(axis=0)
    mid = (lo + hi) / 2
    return [(p - mid, t, col) for p, t, col in parts]

def merge_by_colour(parts):
    """sand3d programs often make hundreds of small parts of one material; simplify them as one."""
    groups = {}
    for p, t, col in parts:
        g = groups.setdefault(tuple(round(c, 4) for c in col), [[], [], 0])
        g[0].append(p); g[1].append(t + g[2]); g[2] += len(p)
    return [(np.vstack(g[0]), np.vstack(g[1]), col) for col, g in groups.items()]

def build(parts, budget, crude_ok):
    parts = merge_by_colour(parts)
    total = sum(len(t) for _, t, _ in parts)
    P, F, C = [], [], []
    base = 0
    for p, t, col in parts:
        p, t = weld(p, t)
        share = max(14, int(budget * len(t) / total))
        p, t = decimate(p, t, share, crude_ok)
        P.append(p); F.append(t + base); C.append(np.tile(col, (len(p), 1))); base += len(p)
    return np.vstack(P), np.vstack(F), np.vstack(C)

def pack(pts, tris, cols, path):
    lo, hi = pts.min(axis=0), pts.max(axis=0)
    span = np.maximum(hi - lo, 1e-9)
    q = np.round((pts - lo) / span * 65535).astype('<u2')
    rgb = np.clip(np.round(cols * 255), 0, 255).astype('u1')
    assert len(pts) < 65536
    buf = bytearray(struct.pack('<II6f', len(pts), tris.size, *lo, *hi))
    for arr in (q.tobytes(), rgb.tobytes(), tris.astype('<u2').tobytes()):
        buf += arr
        while len(buf) % 4: buf += b'\0'
    open(path, 'wb').write(buf)
    return len(buf)

meta = json.load(open(META))
manifest = {}
for name, (longest, layout, lie) in KINDS.items():
    parts = load(os.path.join(SRC, f'{name}.usda'))
    parts = orient(parts, lie)
    allp = np.vstack([p for p, _, _ in parts])
    ext = allp.max(axis=0) - allp.min(axis=0)
    s = longest / ext.max()
    parts = [(p * s, t, c) for p, t, c in parts]
    ext = ext * s
    sizes = {}
    for lod, budget in (('lo', LO_OVERRIDE.get(name, LO)), ('hi', HI)):
        P, F, C = build(parts, budget, lod == 'lo')
        sizes[lod] = (len(F), pack(P, F, C, os.path.join(OUT, f'{name}.{lod}.bin')))
    a = meta[name]['attribution']
    m = re.match(r'^"(.*)" by (.*?), (https?://\S+?), (\S+?)(?:;|$)', a)
    title, author, url, lic = m.groups() if m else (a, '', '', meta[name]['license'])
    footprint = max(ext[0], ext[2]) if layout == 'heap' else max(ext[1], ext[2])
    manifest[name] = {
        'size': round(float(footprint), 4), 'length': round(float(ext[0]), 4), 'height': round(float(ext[1]), 4),
        'layout': layout, 'tris': [sizes['lo'][0], sizes['hi'][0]], 'bytes': [sizes['lo'][1], sizes['hi'][1]],
        'credit': {'title': title, 'author': author, 'url': url, 'license': lic.rstrip(','), 'id': meta[name]['id']},
    }
    print(f"{name:12} lo {sizes['lo'][0]:5} tris {sizes['lo'][1]//1024:3} KB   hi {sizes['hi'][0]:5} tris {sizes['hi'][1]//1024:3} KB   {ext*1000}")
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
print('models:', len(manifest), 'total KB', sum(sum(v['bytes']) for v in manifest.values()) // 1024)
