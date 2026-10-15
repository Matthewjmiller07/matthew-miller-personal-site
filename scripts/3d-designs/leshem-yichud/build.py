"""Leshem Yichud tefillin card: a 3-colour printable plaque with the SCP logo.

Builds every size into public/3d/leshem-yichud/: a multi-part 3MF, one STL per colour,
a GLB for the web preview, and stats.json with filament and time estimates.

  python scripts/3d-designs/leshem-yichud/build.py

Needs: trimesh shapely manifold3d uharfbuzz fonttools scikit-image pillow numpy mapbox_earcut
"""
import io
import json
import math
import re
import zipfile
from pathlib import Path

import numpy as np
import trimesh
import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image
from shapely import affinity
from shapely.geometry import MultiPolygon, Polygon, box
from shapely.ops import unary_union
from skimage import filters, measure

HERE = Path(__file__).parent
ROOT = HERE.parents[2]
OUT = ROOT / 'public' / '3d' / 'leshem-yichud'
FONT_VAR = ROOT / 'public' / 'fonts' / 'NotoSerifHebrew-Variable.ttf'

COLORS = {  # SCP navy + gold, white body text
    'navy': '#1B2A5E',
    'white': '#F4F1E8',
    'gold': '#F2B340',
}
RELIEF = {'white': 0.6, 'gold': 1.0}  # mm above the base; gold is taller so a 2-swap pause print works

# Mirror on the back, for checking the shel rosh: 1 mm self-adhesive acrylic mirror stuck to the
# flat, bed-smooth back. The card prints face up, so a deep recess there would be one long sagging
# bridge; instead a thin groove (an easy bridge) marks where the mirror goes.
MIRROR = dict(inset=7.0, radius=3.0, groove_w=0.8, groove_d=0.4, t=1.0)

SIZES = [
    # key, label, W, H, base thickness, printers
    dict(key='pocket', label='Pocket', w=80, h=115, base=1.6,
         printers='A1 mini, A1, P1S, X1C (any bed ≥ 120 mm)', bag='Slips into a standard tefillin bag'),
    dict(key='standard', label='Standard', w=105, h=150, base=2.0,
         printers='A1 mini, A1, P1S, X1C (any bed ≥ 160 mm)', bag='Fits a tallis-and-tefillin bag'),
    dict(key='display', label='Display', w=160, h=230, base=2.4,
         printers='A1, P1S, P1P, X1C, H2D (256 mm bed) — too big for the A1 mini', bag='Shtender / desk plaque'),
]

PLA_DENSITY = 1.24  # g/cm³
G_PER_M = 2.98      # grams per metre of 1.75 mm PLA


# ---------------------------------------------------------------- text

def clean_text(s):
    s = s.strip().replace('"', '״')  # gershayim
    s = re.sub('[֑-ֽ֯]', '', s)  # cantillation + meteg: unprintable at this size
    return re.sub(r'\s+', ' ', s)


class FlatPen(BasePen):
    """Flattens TrueType/CFF outlines into point lists."""

    def __init__(self, glyphset, steps=6):
        super().__init__(glyphset)
        self.steps, self.contours, self.cur = steps, [], []

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            self.cur.append(((1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0],
                             (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1]))

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            a, b, c, d = (1-t)**3, 3*(1-t)**2*t, 3*(1-t)*t*t, t**3
            self.cur.append((a*p0[0] + b*p1[0] + c*p2[0] + d*p3[0],
                             a*p0[1] + b*p1[1] + c*p2[1] + d*p3[1]))

    def _closePath(self):
        if len(self.cur) >= 3:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


class Face:
    def __init__(self, weight):
        buf = io.BytesIO()
        instancer.instantiateVariableFont(TTFont(FONT_VAR), {'wght': weight}).save(buf)
        data = buf.getvalue()
        self.tt = TTFont(io.BytesIO(data))
        self.upem = self.tt['head'].unitsPerEm
        self.order = self.tt.getGlyphOrder()
        self.gs = self.tt.getGlyphSet()
        self.hb = hb.Font(hb.Face(data))
        self.cache = {}

    def glyph(self, gid):
        if gid not in self.cache:
            pen = FlatPen(self.gs)
            self.gs[self.order[gid]].draw(pen)
            g = Polygon()
            for c in pen.contours:
                g = g.symmetric_difference(Polygon(c).buffer(0))
            self.cache[gid] = g
        return self.cache[gid]

    def shape(self, text):
        """Return ([(gid, x, y)], advance) in font units, visual left-to-right order."""
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hb, buf, {'kern': True})
        out, x = [], 0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            out.append((info.codepoint, x + pos.x_offset, pos.y_offset))
            x += pos.x_advance
        return out, x

    def render(self, text, em, x_left, baseline):
        glyphs, adv = self.shape(text)
        k = em / self.upem
        parts = []
        for gid, gx, gy in glyphs:
            g = self.glyph(gid)
            if not g.is_empty:
                parts.append(affinity.affine_transform(g, [k, 0, 0, k, x_left + gx*k, baseline + gy*k]))
        return unary_union(parts) if parts else Polygon()

    def width(self, text, em):
        return self.shape(text)[1] * em / self.upem


def layout_paragraph(face, words, em, box_w, line_h):
    space = face.width(' ', em)
    widths = [face.width(w, em) for w in words]
    lines, cur, cur_w = [], [], 0
    for w, ww in zip(words, widths):
        need = ww if not cur else cur_w + space + ww
        if cur and need > box_w:
            lines.append(cur)
            cur, cur_w = [(w, ww)], ww
        else:
            cur.append((w, ww))
            cur_w = need
    if cur:
        lines.append(cur)
    return lines, space, len(lines) * line_h


def fit_paragraph(face, words, box_w, box_h, lh_ratio):
    lo, hi = 1.0, 20.0
    for _ in range(40):
        mid = (lo + hi) / 2
        _, _, h = layout_paragraph(face, words, mid, box_w, mid * lh_ratio)
        lo, hi = (mid, hi) if h <= box_h else (lo, mid)
    return lo


def render_paragraph(face, words, em, box, lh_ratio, dilate):
    x0, y0, x1, y1 = box
    lines, space, _ = layout_paragraph(face, words, em, x1 - x0, em * lh_ratio)
    lh = min((y1 - y0) / len(lines), em * 1.9)  # spread the lines to fill the box
    total = lh * len(lines)
    y = y1 - (y1 - y0 - total) / 2 - em * 0.95  # centre the block vertically
    parts = []
    for i, line in enumerate(lines):
        used = sum(ww for _, ww in line)
        last = i == len(lines) - 1
        gap = space if last or len(line) == 1 else (x1 - x0 - used) / (len(line) - 1)
        span = used + gap * (len(line) - 1)
        right = x1 if not last else x1 - ((x1 - x0) - span) / 2  # last line centred
        for w, ww in line:  # Hebrew: first word on the right
            parts.append(face.render(w, em, right - ww, y))
            right -= ww + gap
        y -= lh
    geom = unary_union(parts)
    return (geom.buffer(dilate, join_style=1) if dilate else geom), len(lines)


# ---------------------------------------------------------------- logo

def trace_logo(png, width_mm):
    """Trace the SCP logo PNG: returns (gold flame, navy strands + letters) as polygons."""
    im = Image.open(png).convert('RGB')
    a = np.asarray(im).astype(int)
    ink = (a.sum(axis=2) < 690)
    ys, xs = np.where(ink)
    im = im.crop((xs.min() - 4, ys.min() - 4, xs.max() + 5, ys.max() + 5))
    scale = 6
    im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gold = ((r > 170) & (g > 120) & (b < 150) & (r - b > 60)).astype(float)
    navy = ((b > r + 25) & (r < 130)).astype(float)

    def polys(mask):
        m = filters.gaussian(mask, sigma=scale * 0.6)
        geom = Polygon()
        for c in measure.find_contours(m, 0.5):
            if len(c) < 8:
                continue
            p = Polygon([(x, -y) for y, x in c]).buffer(0)
            if p.area > (scale * 3) ** 2:
                geom = geom.symmetric_difference(p)
        return geom.simplify(scale * 0.25)

    gp, npoly = polys(gold), polys(navy)
    k = width_mm / im.width
    gp = affinity.scale(gp, k, k, origin=(0, 0))
    npoly = affinity.scale(npoly, k, k, origin=(0, 0))
    minx, miny, maxx, maxy = unary_union([gp, npoly]).bounds
    gp = affinity.translate(gp, -minx, -miny)
    npoly = affinity.translate(npoly, -minx, -miny)
    return gp, npoly, (maxx - minx, maxy - miny)


# ---------------------------------------------------------------- design

def rounded_rect(x0, y0, x1, y1, r):
    return box(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, quad_segs=16)


def diamond(cx, cy, rx, ry):
    return Polygon([(cx - rx, cy), (cx, cy + ry), (cx + rx, cy), (cx, cy - ry)])


def divider(cx, cy, length, thick, s):
    line = box(cx - length / 2, cy - thick / 2, cx + length / 2, cy + thick / 2)
    gap = box(cx - 4.2 * s, cy - thick, cx + 4.2 * s, cy + thick)
    return unary_union([
        line.difference(gap),
        diamond(cx, cy, 2.6 * s, 1.6 * s),
        diamond(cx - 3.6 * s, cy, 0.9 * s, 0.9 * s),
        diamond(cx + 3.6 * s, cy, 0.9 * s, 0.9 * s),
        diamond(cx - length / 2, cy, 1.1 * s, 1.1 * s),
        diamond(cx + length / 2, cy, 1.1 * s, 1.1 * s),
    ])


def design(size, body_face, title_face, words):
    W, H = size['w'], size['h']
    s = W / 105
    minw = 0.6
    dil = 0.05 if W < 150 else 0.0  # fatten small text a hair so strokes survive a 0.4 nozzle

    base = rounded_rect(0, 0, W, H, 6 * s)
    outer = rounded_rect(2.4 * s, 2.4 * s, W - 2.4 * s, H - 2.4 * s, 4.6 * s)
    band = outer.difference(outer.buffer(-max(1.2 * s, minw)))
    i0 = 4.6 * s
    inner = rounded_rect(i0, i0, W - i0, H - i0, 3 * s)
    inner_line = inner.difference(inner.buffer(-max(0.5 * s, minw)))
    corners = [diamond(x, y, 1.5 * s, 1.5 * s) for x in (i0, W - i0) for y in (i0, H - i0)]
    gold = [band, inner_line, *corners]
    white = []

    m = 7.5 * s
    top = H - m

    # SCP logo, flame gold and the navy parts white so they read on the navy card
    lg, lw, (lw_mm, lh_mm) = trace_logo(HERE / 'scp-logo.png', 30 * s)
    lx, ly = (W - lw_mm) / 2, top - lh_mm
    gold.append(affinity.translate(lg, lx, ly))
    white.append(affinity.translate(lw, lx, ly))
    y = ly - 3.0 * s

    # Title
    t_em = 6.6 * s
    title = 'הֲנָחַת תְּפִלִּין'
    tw = title_face.width(title, t_em)
    t_geom = title_face.render(title, t_em, (W - tw) / 2, y - t_em * 0.72)
    gold.append(t_geom)
    y = t_geom.bounds[1] - 2.6 * s
    gold.append(divider(W / 2, y, W * 0.56, max(0.55 * s, minw), s))
    body_top = y - 2.8 * s

    # Bottom emblem: the shin of the tefillin bayit, in a little box, between two rules
    eb = 9.5 * s
    ey0 = m + 0.2 * s
    bx = rounded_rect(W / 2 - eb / 2, ey0, W / 2 + eb / 2, ey0 + eb, 1.6 * s)
    gold.append(bx.difference(bx.buffer(-max(0.8 * s, minw))))
    shin_em = eb * 0.92
    sw = title_face.width('ש', shin_em)
    gold.append(title_face.render('ש', shin_em, W / 2 - sw / 2, ey0 + eb * 0.2))
    for sgn in (-1, 1):
        x_in, x_out = W / 2 + sgn * (eb / 2 + 2.2 * s), W / 2 + sgn * (W / 2 - m - 1 * s)
        gold.append(box(min(x_in, x_out), ey0 + eb / 2 - minw / 2, max(x_in, x_out), ey0 + eb / 2 + minw / 2))
        gold.append(diamond(x_out, ey0 + eb / 2, 1.1 * s, 1.1 * s))
    body_bot = ey0 + eb + 2.6 * s

    # Body
    bbox = (m + 0.5 * s, body_bot, W - m - 0.5 * s, body_top)
    lh_ratio = 1.55
    em = fit_paragraph(body_face, words, bbox[2] - bbox[0], bbox[3] - bbox[1], lh_ratio) * 0.995
    body, n_lines = render_paragraph(body_face, words, em, bbox, lh_ratio, dil)
    white.append(body)

    to_mp = lambda parts: unary_union([p for p in parts if not p.is_empty])
    gold_g = to_mp(gold).buffer(0.03, join_style=2).buffer(-0.03, join_style=2).intersection(base)  # fuse point contacts
    white_g = to_mp(white).difference(gold_g.buffer(0.1)).intersection(base)
    return dict(base=base, white=white_g, gold=gold_g, body_em=em, lines=n_lines)


# ---------------------------------------------------------------- meshes

def polys_of(g):
    if isinstance(g, Polygon):
        return [g] if not g.is_empty else []
    return [p for sub in getattr(g, 'geoms', []) for p in polys_of(sub)]


def mirror_outline(W, H):
    """The mirror's shape, the guide groove just outside it, and the mirror's cut size (w, h) in mm."""
    i = MIRROR['inset']
    glass = rounded_rect(i, i, W - i, H - i, MIRROR['radius'])
    groove = glass.buffer(MIRROR['groove_w'], join_style=1).difference(glass)
    return glass, groove, (W - 2 * i, H - 2 * i)


def extrude(g, z0, h):
    meshes = []
    g = g.simplify(0.015).buffer(-0.004, join_style=2)  # a 4 µm inset splits pinch points so every part is manifold
    for p in polys_of(g):
        if p.area < 0.01:
            continue
        m = trimesh.creation.extrude_polygon(p, h)
        m.apply_translation([0, 0, z0])
        meshes.append(m)
    return trimesh.util.concatenate(meshes)


def write_3mf(path, parts, title):
    """Core-spec 3MF: one object made of coloured parts (Bambu/Orca/Prusa keep them as parts)."""
    res, comps = [], []
    mats = ''.join(f'<base name="{n}" displaycolor="{COLORS[n]}FF"/>' for n, _ in parts)
    res.append(f'<basematerials id="1">{mats}</basematerials>')
    for i, (name, mesh) in enumerate(parts):
        oid = i + 2
        v = ''.join(f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in mesh.vertices)
        t = ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in mesh.faces)
        res.append(f'<object id="{oid}" type="model" name="{name}" pid="1" pindex="{i}">'
                   f'<mesh><vertices>{v}</vertices><triangles>{t}</triangles></mesh></object>')
        comps.append(f'<component objectid="{oid}"/>')
    top = len(parts) + 2
    res.append(f'<object id="{top}" type="model" name="{title}"><components>{"".join(comps)}</components></object>')
    model = ('<?xml version="1.0" encoding="UTF-8"?>'
             '<model unit="millimeter" xml:lang="en-US" '
             'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
             f'<metadata name="Title">{title}</metadata>'
             f'<resources>{"".join(res)}</resources><build><item objectid="{top}"/></build></model>')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',
                   '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
        z.writestr('_rels/.rels',
                   '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Target="/3D/3dmodel.model" Id="rel0" '
                   'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
        z.writestr('3D/3dmodel.model', model)


# ---------------------------------------------------------------- estimates

def estimate(d, base_t):
    """Rough A1-mini-class estimate (0.4 nozzle, 0.2 mm layers, PLA, Bambu default speeds)."""
    lh = 0.2
    A, P = d['base'].area, d['base'].length
    n_base = round(base_t / lh)
    solid = min(n_base, 8)  # 3 bottom + 5 top shells
    sparse = n_base - solid
    t = A / 0.5 / 50 * 1.25                      # first layer, 50 mm/s
    t += (solid - 1) * A / 0.42 / 150            # solid infill, accel-limited
    t += sparse * 0.15 * A / 0.45 / 220          # 15 % sparse
    t += n_base * 2 * P / 150                    # walls

    grams = {'navy': A * base_t * (solid + 0.15 * sparse) / n_base / 1000 * PLA_DENSITY}
    for c in ('white', 'gold'):
        g = d[c]
        layers = round(RELIEF[c] / lh)
        islands = len(polys_of(g))
        t += layers * (g.area / 0.42 + 0.5 * g.length) / 55   # tiny features crawl
        t += layers * islands * 0.12                          # travel + retract per island
        grams[c] = g.area * RELIEF[c] / 1000 * PLA_DENSITY

    prep = 6 * 60  # heat, clean, level
    swaps = 4      # navy→white, white→gold, gold→white, white→gold (the relief layers alternate)
    ams_t = swaps * 75
    purge_g = 1.6 + 0.9  # flush + small prime tower
    total = t + prep
    return dict(
        grams={k: round(v, 1) for k, v in grams.items()},
        model_g=round(sum(grams.values()), 1),
        ams_waste_g=purge_g,
        ams_total_g=round(sum(grams.values()) + purge_g, 1),
        metres=round(sum(grams.values()) / G_PER_M, 2),
        time_manual_min=round((total + 2 * 90) / 60),
        time_ams_min=round((total + ams_t) / 60),
        print_min=round(t / 60),
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    words = clean_text((HERE / 'text.he.txt').read_text()).split(' ')
    body_face, title_face = Face(780), Face(900)
    stats = {}
    for size in SIZES:
        d = design(size, body_face, title_face, words)
        T, G = size['base'], MIRROR['groove_d']
        glass, groove, mirror_wh = mirror_outline(size['w'], size['h'])
        meshes = {
            'navy': trimesh.boolean.union([extrude(d['base'].difference(groove), 0, G + 0.01),
                                           extrude(d['base'], G, T - G)], engine='manifold'),
            'white': extrude(d['white'], T, RELIEF['white']),
            'gold': extrude(d['gold'], T, RELIEF['gold']),
        }
        stem = f"leshem-yichud-{size['key']}"
        for c, m in meshes.items():
            m.export(OUT / f'{stem}-{c}.stl')
        write_3mf(OUT / f'{stem}.3mf', list(meshes.items()), f"Leshem Yichud tefillin card ({size['label']})")
        if size['key'] == 'standard':
            scene = trimesh.Scene()
            for c, m in meshes.items():
                mm = m.copy()
                rgb = [int(COLORS[c][i:i + 2], 16) for i in (1, 3, 5)]
                mm.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
                    baseColorFactor=[*rgb, 255], roughnessFactor=0.55 if c != 'gold' else 0.3,
                    metallicFactor=0.0 if c != 'gold' else 0.6))
                scene.add_geometry(mm, node_name=c)
            glass = extrude(glass, -MIRROR['t'], MIRROR['t'])  # preview only: the mirror stuck on
            glass.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
                baseColorFactor=[235, 240, 245, 255], roughnessFactor=0.04, metallicFactor=1.0))
            scene.add_geometry(glass, node_name='mirror')
            scene.export(OUT / 'leshem-yichud-preview.glb')
        est = estimate(d, T)
        stats[size['key']] = dict(
            label=size['label'], w=size['w'], h=size['h'], thickness=round(T + RELIEF['gold'], 1),
            base=round(T, 2), printers=size['printers'], bag=size['bag'],
            mirror=dict(w=mirror_wh[0], h=mirror_wh[1], t=MIRROR['t'], radius=MIRROR['radius']),
            body_em_mm=round(d['body_em'], 2), lines=d['lines'],
            triangles=sum(len(m.faces) for m in meshes.values()), **est)
        print(size['key'], json.dumps(stats[size['key']], ensure_ascii=False))
    (OUT / 'stats.json').write_text(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
