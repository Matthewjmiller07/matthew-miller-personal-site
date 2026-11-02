"""The Ten Plagues as surprise-egg-style toys: ten small kits that print in pieces on a Bambu A1 mini
and snap together.

Every kit stands on the same Ø40 mm stage with the plague's name sunk into the top and its number
(א–י) under it. Parts are designed to print flat with no supports, and join with pegs, slots and
loose pins (Ø3 pin in a Ø3.3 hole is a firm push fit in PLA).

Builds into public/3d/plagues/:
  <slug>/<slug>-<part>.stl    each part, already turned onto its print face
  <slug>/<slug>-plate.3mf     every part laid out on one 180 mm plate, coloured
  <slug>/<slug>-stl.zip       all the STLs
  <slug>/<slug>.glb           the assembled toy for the web viewer (parts are separate nodes)
  kits.json                   parts, colours, explode vectors, grams and time estimates

  scripts/3d-designs/plagues/.venv/bin/python scripts/3d-designs/plagues/build.py [slug ...]

Needs: manifold3d trimesh shapely fonttools numpy scipy
"""
import json
import math
import sys
import zipfile
from pathlib import Path

import numpy as np
import trimesh
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from manifold3d import CrossSection, FillRule, Manifold, OpType
from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE = Path(__file__).parent
ROOT = HERE.parents[2]
OUT = ROOT / 'public' / '3d' / 'plagues'
FONT = ROOT / 'public' / 'fonts' / 'NotoSerifHebrew-Bold.ttf'

SEG = 48            # circle segments
BASE_R, BASE_T = 20.0, 4.0
TOP = BASE_T        # z of the stage's top face
PIN_R, HOLE_R = 1.5, 1.65
FIT = 0.15          # slot clearance per side
PLA_DENSITY = 1.24
G_PER_M = 2.98
BED = 175.0         # usable A1 mini plate

FILAMENT = {
    'stage': '#E9DFC7',  # sand / bone
    'red': '#B3121C', 'blood': '#8E0D16', 'wood': '#8A5A2B', 'green': '#4E9A3A', 'lily': '#2F6B3A',
    'grey': '#8C8C8C', 'dark': '#2B2B2B', 'black': '#151515', 'tan': '#C99A52', 'brown': '#6B4423',
    'orange': '#F07F1A', 'yellow': '#FFD23F', 'white': '#F4F1E8', 'ice': '#BFE6FF', 'clear': '#DDEEF6',
    'milk': '#E9EEF0', 'gold': '#E2B33C', 'pink': '#E89AA6', 'clay': '#C0663B', 'olive': '#7C8C3A', 'navy': '#1B2A5E',
}


# ---------------------------------------------------------------- primitives

def cyl(h, r, r2=None, at=(0, 0, 0), seg=SEG):
    return Manifold.cylinder(h, r, r if r2 is None else r2, seg).translate(at)


def cube(sx, sy, sz, at=(0, 0, 0)):
    """Box centred on x/y at `at`, sitting on z = at[2]."""
    return Manifold.cube((sx, sy, sz)).translate((at[0] - sx / 2, at[1] - sy / 2, at[2]))


def sph(r, at=(0, 0, 0), seg=SEG):
    return Manifold.sphere(r, seg).translate(at)


def ell(rx, ry, rz, at=(0, 0, 0), seg=SEG):
    return Manifold.sphere(1, seg).scale((rx, ry, rz)).translate(at)


def above(m, z):
    return m.trim_by_plane((0, 0, 1), z)


def below(m, z):
    return m.trim_by_plane((0, 0, -1), -z)


def union(*ms):
    ms = [m for m in ms if m is not None]
    return Manifold.batch_boolean(ms, OpType.Add) if len(ms) > 1 else ms[0]


def rounded_box(sx, sy, sz, r, at=(0, 0, 0)):
    """Hull of eight spheres: flat top and bottom, round edges."""
    pts = [sph(r, (at[0] + dx * (sx / 2 - r), at[1] + dy * (sy / 2 - r), at[2] + r + dz * (sz - 2 * r)), seg=24)
           for dx in (-1, 1) for dy in (-1, 1) for dz in (0, 1)]
    return Manifold.batch_hull(pts)


PIN_L = 6.0


def pin_part(length=PIN_L):
    """Loose Ø3 pin with chamfered ends; prints standing up."""
    c = 0.4
    return union(cyl(c, PIN_R - c, PIN_R), cyl(length - 2 * c, PIN_R, at=(0, 0, c)),
                 cyl(c, PIN_R, PIN_R - c, at=(0, 0, length - c)))


def hole(at, depth, axis='z', r=HOLE_R, both=False):
    """A pin hole of `depth` going down (axis z) from `at`, or along +x/-x/+y/-y into a face."""
    h = cyl(depth + 0.01, r, seg=32)
    if both:
        h = cyl(2 * depth, r, seg=32).translate((0, 0, -depth))
    rot = {'z': (180, 0, 0), '-z': (0, 0, 0), 'x': (0, -90, 0), '-x': (0, 90, 0), 'y': (90, 0, 0), '-y': (-90, 0, 0)}[axis]
    return h.rotate(rot).translate(at)


def peg(at, h=3.0, r=PIN_R):
    """Integral peg pointing up from `at` with a lead-in chamfer."""
    c = 0.35
    return union(cyl(h - c, r, at=at), cyl(c, r, r - c, at=(at[0], at[1], at[2] + h - c)))


# ---------------------------------------------------------------- 2D

def C(x, y, r):
    return Point(x, y).buffer(r, 32)


def E(x, y, rx, ry, rot=0):
    return affinity.translate(affinity.rotate(affinity.scale(Point(0, 0).buffer(1, 48), rx, ry), rot), x, y)


def R(x0, y0, x1, y1):
    return box(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))


def L(pts, w):
    return LineString(pts).buffer(w / 2, 16)


def U(*gs):
    return unary_union(gs)


def mirror_x(g):
    return U(g, affinity.scale(g, -1, 1, origin=(0, 0)))


def polys(g):
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    return [p for p in getattr(g, 'geoms', []) if isinstance(p, Polygon)]


def xsec(g):
    contours = []
    for p in polys(g):
        p = orient(p, 1.0)
        contours.append(np.array(p.exterior.coords[:-1]))
        contours += [np.array(i.coords[:-1]) for i in p.interiors]
    return CrossSection(contours, FillRule.Positive)


def extrude(g, h, z0=0.0):
    return Manifold.extrude(xsec(g), h).translate((0, 0, z0))


def stand_up(m, angle=0.0, at=(0, 0, 0)):
    """A flat piece drawn in x/y (y up), thickness along z centred: stand it in the x/z plane, turn it, place it."""
    return m.rotate((90, 0, 0)).rotate((0, 0, angle)).translate(at)


def flat_figure(g, t):
    """Extrude a 2D silhouette `t` thick, centred on z = 0 (for standing figures)."""
    return extrude(g, t, -t / 2)


def revolve(profile, seg=SEG):
    """Revolve a list of (r, z) points around the z axis."""
    return Manifold.revolve(CrossSection([np.array(profile)], FillRule.Positive), seg)


# ---------------------------------------------------------------- text

class FlatPen(BasePen):
    def __init__(self, gs, steps=8):
        super().__init__(gs)
        self.contours, self.cur, self.steps = [], [], steps

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            a = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
            self.cur.append(tuple(a[0] * p0[k] + a[1] * p1[k] + a[2] * p2[k] + a[3] * p3[k] for k in (0, 1)))

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            self.cur.append(tuple((1 - t) ** 2 * p0[k] + 2 * (1 - t) * t * p1[k] + t * t * p2[k] for k in (0, 1)))

    def _closePath(self):
        if len(self.cur) > 2:
            self.contours.append(self.cur)
        self.cur = []


_font = None


def text_shape(s, height, cx, cy, max_w=None):
    """Hebrew text laid out right to left (no nikkud, so no shaping needed), centred on (cx, cy).
    `height` is the height of a plain letter like ה."""
    global _font
    if _font is None:
        _font = TTFont(FONT)
    cmap, gs, hmtx = _font.getBestCmap(), _font.getGlyphSet(), _font['hmtx']
    x, contours = 0.0, []
    for ch in s:
        if ch == ' ':
            x -= hmtx[cmap[0x20]][0]
            continue
        name = cmap[ord(ch)]
        x -= hmtx[name][0]
        pen = FlatPen(gs)
        gs[name].draw(pen)
        contours += [[(px + x, py) for px, py in c] for c in pen.contours]
    cs = CrossSection([np.array(c) for c in contours], FillRule.NonZero)
    letter_h = 0.52 * _font['head'].unitsPerEm  # ~ height of ה in Noto Serif Hebrew
    (x0, y0, x1, y1) = cs.bounds()
    k = height / letter_h
    if max_w and (x1 - x0) * k > max_w:
        k = max_w / (x1 - x0)
    cs = cs.translate((-(x0 + x1) / 2, -(y0 + y1) / 2)).scale((k, k)).translate((cx, cy))
    return cs


# ---------------------------------------------------------------- the stage

NUMERALS = 'אבגדהוזחטי'


def stage(name, index, cut=(), add=()):
    """Ø40 × 4 mm base with a chamfered top edge, the name sunk 0.8 mm into the front of the top and
    the Hebrew numeral sunk into the bottom (mirrored so it reads from underneath)."""
    b = union(cyl(BASE_T - 0.8, BASE_R, at=(0, 0, 0)), cyl(0.8, BASE_R, BASE_R - 0.8, at=(0, 0, BASE_T - 0.8)))
    b = union(b, *add) if add else b
    name_cs = text_shape(name, 5.2, 0, -13.2, max_w=24)
    b = b - Manifold.extrude(name_cs, 0.81).translate((0, 0, TOP - 0.8))
    num = Manifold.extrude(text_shape(NUMERALS[index], 16, 0, 0), 0.61).mirror((1, 0, 0)).translate((0, 0, -0.01))
    b = b - num
    for c in cut:
        b = b - c
    return b


def slot(length, t, depth, at, angle=0.0):
    """A rectangular socket in the top of the stage for a standing flat figure's tab."""
    s = cube(length + 2 * FIT, t + 2 * FIT, depth + 0.01, (0, 0, TOP - depth))
    return s.rotate((0, 0, angle)).translate((at[0], at[1], 0))


def tab(x0, x1, depth=3.0, rise=0.8):
    """The tab along the bottom of a standing silhouette (y < 0 goes into the slot)."""
    return R(x0, -depth, x1, rise)


# ---------------------------------------------------------------- kits
#
# Each kit returns a list of parts. A part is drawn where it sits in the finished toy and carries:
#   name, label, colour (FILAMENT key), qty, print rotation (turns it onto its print face),
#   explode (mm, where it flies to in the exploded view), and optional inlays [(name, manifold, colour)]
#   that print in a second colour as part of the same object.

def P(name, label, mesh, colour, explode=(0, 0, 0), rot=(0, 0, 0), qty=1, inlays=(), at=None):
    return dict(name=name, label=label, mesh=mesh, colour=colour, explode=explode, rot=rot, qty=qty,
                inlays=list(inlays), at=at)


def pins(n, *, explode=(0, 0, 25), at=(0, 0, 0)):
    return P('pin', f'Pin ×{n}' if n > 1 else 'Pin', pin_part(), 'white', explode, qty=n, at=at)


def kit_blood(i):
    # The Nile, red. A wavy channel crosses the stage and a red river drops into it; two dead fish
    # float on it, and Moshe's staff stands in a socket at the back.
    xs = np.linspace(-22, 22, 60)
    river = LineString([(x, 4.2 + 1.8 * math.sin(x / 5.0)) for x in xs]).buffer(4.6, 16)
    river = river.intersection(C(0, 0, BASE_R - 0.9))
    channel = extrude(river.buffer(FIT, 8), 1.61, TOP - 1.6)
    water = extrude(river, 2.2, TOP - 1.6)
    ripples = [L([(x - 3, 4.2 + 1.8 * math.sin((x - 3) / 5) + dy), (x, 4.2 + 1.8 * math.sin(x / 5) + dy + 0.6),
                  (x + 3, 4.2 + 1.8 * math.sin((x + 3) / 5) + dy)], 0.8) for x, dy in ((-12, 1.6), (12, -1.8), (2, 2.6))]
    water = union(water, extrude(U(*ripples).intersection(river.buffer(-0.6)), 0.5, TOP + 0.6))
    fish_spots = [(-6.5, 3.0, 20), (6.5, 5.5, -160)]
    for x, y, _ in fish_spots:
        water = union(water, peg((x, y, TOP + 0.6), h=1.6, r=1.0))
    staff_at = (12.0, 10.5)
    base = stage('דם', i, cut=[channel, cube(3.2 + 2 * FIT, 3.2 + 2 * FIT, 3.01, (staff_at[0], staff_at[1], TOP - 3))])

    fish2d = U(E(0, 0, 6, 2.8), Polygon([(-4.8, 0), (-9, 3.2), (-8, 0), (-9, -3.2)]), E(2.6, 2.2, 2.2, 0.9, -30))
    fish2d = fish2d.difference(C(4, 0.6, 0.6)).difference(C(0, 0, 1.15))
    fish = []
    for k, (x, y, a) in enumerate(fish_spots):
        f = extrude(fish2d, 2.0, 0).rotate((0, 0, a)).translate((x, y, TOP + 0.6))
        fish.append(f)

    crook = U(R(-1.6, -3, 1.6, 38), (C(4.6, 38, 6.2).difference(C(4.6, 38, 3.0))).intersection(R(-3, 38, 12, 46)),
              L([(9.2, 38), (9.6, 35), (9.0, 33.5)], 3.0))
    staff = stand_up(flat_figure(crook, 3.2), 0, (staff_at[0], staff_at[1], TOP))

    return [
        P('stage', 'Stage', base, 'stage'),
        P('river', 'The Nile (red)', water, 'red', (0, 0, 14)),
        P('fish-1', 'Fish', fish[0], 'grey', (-4, -3, 26)),
        P('fish-2', 'Fish', fish[1], 'grey', (4, 3, 26)),
        P('staff', 'Moshe’s staff', staff, 'wood', (10, 6, 30), rot=(-90, 0, 0)),
    ]


def frog_body(scale=1.0):
    s = scale
    body = above(ell(10 * s, 12 * s, 9 * s, (0, -1 * s, -1.5 * s)), 0)
    eyes = [sph(3.3 * s, (x * 5 * s, 6.5 * s, 5.4 * s)) for x in (-1, 1)]
    body = union(body, *eyes)
    for x in (-1, 1):  # pupils
        body = body - sph(1.3 * s, (x * 5.9 * s, 8.6 * s, 6.6 * s), seg=24)
    if s >= 0.7:  # a smile across the front, too fine to print on the little frog
        mouth = L([(-6 * s, 7.6 * s), (0, 9.9 * s), (6 * s, 7.6 * s)], 0.8)
        body = body - extrude(mouth, 2.2 * s, 2.2 * s).translate((0, 1.7 * s, 0))
    return body


def frog_legs(scale=1.0):
    s = scale
    front = U(L([(5, 4), (10.5, 8), (11.5, 13)], 2.6), C(10.2, 14.4, 1.4), C(12.8, 13.6, 1.4), C(11.6, 15.2, 1.3))
    back = U(L([(6, -6), (13, -3.5), (15, -10), (9.5, -13.5), (13.5, -18.5)], 3.0),
             Polygon([(13.5, -18.5), (10.8, -22), (13.6, -21), (15.3, -23), (15.6, -19)]))
    g = U(mirror_x(U(front, back)), E(0, -1, 8, 10))
    return affinity.scale(g, s, s, origin=(0, 0))


def kit_frogs(i):
    # One frog that became a swarm (Rashi on 8:2, "the frog came up"): a big frog on a lily pad
    # looking out at you, and a small one that already split off from it.
    s, fx, fy = 0.8, 1.5, 5.0
    notch = Polygon([(fx, fy), (-6, 26), (-17, 18)])
    base = stage('צפרדע', i, cut=[extrude(notch, BASE_T + 1, -0.5)],
                 add=[peg((fx, fy, TOP), h=4.6), peg((-13.5, -4.5, TOP), h=1.6, r=1.0)])
    for vein in ([(4, -4), (11, -7), (17, -6)], [(5, 2), (12, 4)], [(-4, -2), (-9, 0)]):
        base = base - extrude(L(vein, 0.8), 0.5, TOP - 0.5)
    turn = lambda m: m.rotate((0, 0, 180)).translate((fx, fy, 0))
    legs2d = affinity.scale(frog_legs(), s, s, origin=(0, 0))
    legs = turn(extrude(legs2d.difference(C(0, 0, HOLE_R)), 1.8, TOP))
    body = turn(frog_body(s).translate((0, 0, TOP + 1.8)) - hole((0, 0, TOP + 1.8), 3.2, '-z'))
    baby = union(extrude(frog_legs(0.38), 0.9, 0), frog_body(0.38).translate((0, 0, 0.9))) - hole((0, 0, 0), 1.9, '-z', r=1.15)
    baby = baby.rotate((0, 0, 150)).translate((-13.5, -4.5, TOP))
    return [
        P('stage', 'Lily-pad stage', base, 'lily'),
        P('legs', 'Legs', legs, 'green', (0, 0, 12)),
        P('body', 'Frog', body, 'green', (0, 0, 26)),
        P('baby', 'Little frog', baby, 'olive', (-8, -4, 18)),
    ]


def kit_lice(i):
    # Aharon struck the dust and it became lice (8:12); the magicians said "it is the finger of God".
    # A louse big enough to see, under a magnifying glass, on a stage strewn with dust.
    rng = np.random.default_rng(3)
    grains = []
    for _ in range(40):
        a, r = rng.uniform(0, 2 * math.pi), rng.uniform(13.5, 18.2)
        x, y = r * math.cos(a), r * math.sin(a)
        if y < -7:  # keep the name clear
            continue
        grains.append(sph(rng.uniform(0.5, 1.0), (x, y, TOP - 0.2), seg=12))
    glass_at = (0, 13.5)
    base = stage('כנים', i, cut=[slot(6, 3, 3, glass_at)], add=[above(union(*grains), TOP - 0.01), peg((0, -1, TOP), h=4.6)])
    legs2d = U(*[L([(2, y), (8, y + d), (11.5, y + d - 3)], 1.3) for y, d in ((3, 2), (0, 0), (-3, -2))])
    legs2d = U(mirror_x(U(legs2d, L([(1, 8.5), (2.6, 11.5), (4.5, 12.5)], 0.9))), E(0, 0, 4.5, 8))
    legs = extrude(legs2d.difference(C(0, 0, HOLE_R)), 1.6, 0).translate((0, -1, TOP))
    abdomen = above(ell(6.2, 8, 4.4, (0, -3, -0.6)), 0)
    for k in range(4):
        abdomen = abdomen - cube(14, 0.6, 2, (0, -8.4 + 2.4 * k, 3.0))
    thorax = above(ell(3.8, 3.4, 3.2, (0, 5, -0.4)), 0)
    head = above(ell(2.6, 2.6, 2.4, (0, 8.6, -0.3)), 0)
    louse = union(abdomen, thorax, head).translate((0, -1, TOP + 1.6)) - hole((0, -1, TOP + 1.6), 3.2, '-z')
    glass2d = U(C(0, 22, 10.5).difference(C(0, 22, 8.2)), R(-1.8, 11.6, 1.8, 0.8), R(-3, -3, 3, 0.8),
                C(0, 0, 2.6).difference(R(-3, -4, 3, 0)))
    glass2d = U(glass2d, R(-2.2, 9.8, 2.2, 12.2))
    glass = stand_up(flat_figure(glass2d, 3.0), 0, (glass_at[0], glass_at[1], TOP))
    lens = stand_up(flat_figure(C(0, 22, 8.6), 1.0), 0, (glass_at[0], glass_at[1], TOP))
    return [
        P('stage', 'Dusty stage', base, 'tan'),
        P('legs', 'Legs', legs, 'brown', (0, -2, 10)),
        P('louse', 'Louse', louse, 'brown', (0, -4, 22)),
        P('glass', 'Magnifying glass', glass, 'black', (0, 10, 22), rot=(-90, 0, 0),
          inlays=[('lens', lens, 'clear')]),
    ]


def lion():
    mane = Polygon([(9.5 + (7.0 if k % 2 == 0 else 5.2) * math.cos(2 * math.pi * k / 22),
                     13 + (7.0 if k % 2 == 0 else 5.2) * math.sin(2 * math.pi * k / 22)) for k in range(22)])
    g = U(E(0, 8.5, 9.5, 4.6), mane, C(10.5, 13, 4.2), E(14, 11.6, 2.6, 2.0),
          R(-8.2, 0, -5.6, 8.5), R(-4.6, 0, -2, 7.5), R(3.2, 0, 5.8, 8), R(6.6, 0, 9.2, 8.5),
          L([(-9, 9), (-12, 12.5), (-12.8, 15.5)], 1.2), C(-12.8, 16.2, 1.8), tab(-8.5, 9.5))
    return g.difference(C(12, 14.2, 0.7))


def bear():
    g = U(E(0, 9.5, 9.5, 6.4), C(9.6, 11.5, 4.4), E(13.2, 10.2, 2.6, 2.0), C(8.4, 15.6, 1.8),
          R(-7.8, 0, -3.6, 8), R(-2.8, 0, 0.8, 7), R(2.6, 0, 6.6, 8), E(-9.6, 11, 1.6, 1.4), tab(-7.8, 7.0))
    return g.difference(C(11.2, 12.8, 0.7))


def wolf():
    head = Polygon([(5.5, 9.5), (7.6, 14.2), (8.4, 17.4), (9.6, 14.8), (11.2, 17.2), (11.8, 13.6), (16.6, 11.6),
                    (16.4, 10.3), (12, 9.6), (8, 6.5)])
    g = U(E(0, 9.2, 8.5, 3.8), head, R(-6.8, 0, -5.0, 9), R(-4.3, 0, -2.5, 8), R(3.0, 0, 4.8, 9),
          R(5.4, 0, 7.2, 8), L([(-7.6, 10.6), (-11.5, 8.6), (-13.4, 5.2)], 2.2), tab(-6.8, 7.2))
    return g.difference(C(11, 12.5, 0.65))


def scorpion():
    body = U(E(0, 0, 3.6, 6), *[E(0, -6.6 - 2.6 * k, 2.2 - 0.25 * k, 1.6) for k in range(3)])
    tail = L([(0, -12), (0.5, -15.5), (3, -17.8), (5.4, -16), (5.2, -13)], 1.8)
    sting = Polygon([(4.4, -13.2), (6.4, -13.4), (5.2, -11.0)])
    claws = mirror_x(U(L([(2.5, 4.5), (5.5, 8), (5.6, 10.5)], 1.5),
                       Polygon([(4.6, 10), (7.4, 10.4), (7.2, 14.2), (6.0, 11.8), (5.0, 13.6), (4.2, 11.6)])))
    legs = mirror_x(U(*[L([(3, y), (7, y + 1.2), (9, y - 1.5)], 1.0) for y in (2.2, -0.2, -2.6, -5)]))
    return U(body, tail, sting, claws, legs)


def kit_wild_beasts(i):
    # Arov: a mixture of wild animals (Rashi: lions, wolves, leopards, snakes and scorpions). A lion,
    # a bear and a wolf stand in sockets; a scorpion scuttles in front.
    # staggered so each one faces you and none hides the one behind it
    k = 0.82
    animals = [('lion', 'Lion', lion(), (-4.0, 10.0), 0, 'gold', (0, 12, 22)),
               ('bear', 'Bear', affinity.scale(bear(), -1, 1, origin=(0, 0)), (6.0, 2.6), 0, 'brown', (12, 2, 20)),
               ('wolf', 'Wolf', wolf(), (-5.5, -4.2), 0, 'grey', (-12, -6, 20))]
    animals = [(n, lab, affinity.scale(g, k, k, origin=(0, 0)), at, a, c, e) for n, lab, g, at, a, c, e in animals]
    cuts, parts = [], []
    for name, label, g, at, ang, col, ex in animals:
        tab_x0, tab_x1 = polys(g.intersection(R(-30, -3.1, 30, -0.05)))[0].bounds[0::2]
        tab_len = tab_x1 - tab_x0
        tab_mid = (tab_x0 + tab_x1) / 2
        g = affinity.translate(g, -tab_mid, 0)
        cuts.append(slot(tab_len, 3.0, 3.0, at, ang))
        fig = stand_up(flat_figure(g, 3.0), ang, (at[0], at[1], TOP))
        parts.append(P(name, label, fig, col, ex, rot=(-90, 0, 0)))
    sc2d = affinity.translate(affinity.scale(affinity.rotate(scorpion(), 100, origin=(0, 0)), 0.6, 0.6, origin=(0, 0)), 10.5, -5.5)
    sc = extrude(sc2d, 1.6, TOP - 0.4)
    base = stage('ערוב', i, cut=cuts + [extrude(sc2d.buffer(FIT), 0.41, TOP - 0.4)])
    return [P('stage', 'Stage', base, 'stage')] + parts + [P('scorpion', 'Scorpion', sc, 'black', (0, -10, 16))]


def kit_pestilence(i):
    # Dever: the plague on the livestock, which spared every animal of Israel (9:6). A cow built the
    # Kinder way: body, four legs that plug in, a head on a pin, black patches for an AMS.
    leg_h, body_z = 12.5, TOP + 12.5
    legs_at = [(x, y) for x in (-8.5, 7.5) for y in (-3.6, 3.6)]
    body = rounded_box(26, 13, 11, 2.4, (-0.5, 0, body_z))
    tail = union(cyl(8.0, 0.9, at=(-13.4, 0, body_z + 2.0)), sph(1.3, (-13.4, 0, body_z + 2.0), seg=20))
    body = union(body, tail)
    for x, y in legs_at:
        body = body - hole((x, y, body_z), 3.2, '-z')
    body = body - hole((12.5, 0, body_z + 7.0), 4.2, 'x')
    spots = union(*[extrude(g, 0.6, body_z + 11) for g in (E(-6, 1.5, 4.2, 3.2, 20), E(5, -2.8, 3.4, 2.6, -30))])
    spots = spots ^ rounded_box(26, 13, 11.6, 2.4, (-0.5, 0, body_z))
    legs = []
    for x, y in legs_at:
        leg = union(cyl(1.4, 2.5, 2.3, at=(x, y, TOP - 1.0)), cyl(leg_h - 0.4, 2.2, 2.0, at=(x, y, TOP + 0.4)),
                    peg((x, y, body_z), h=3.0))
        legs.append(leg)
    hz = body_z + 3.2
    head = rounded_box(8, 8.4, 10, 2.6, (16.6, 0, hz))
    head = union(head, rounded_box(5, 7.8, 5, 2.0, (20.0, 0, hz)))
    horns = [cyl(4.2, 1.2, 0.5, seg=20).rotate((x * 30, 0, 0)).translate((16, x * 2.8, hz + 9.4)) for x in (-1, 1)]
    ears = [ell(1.2, 2.4, 1.2, (15.6, x * 5.0, hz + 7.0), seg=20) for x in (-1, 1)]
    head = union(head, *horns, *ears)
    for x in (-1, 1):
        head = head - sph(0.8, (19.1, x * 2.6, hz + 6.6), seg=16)
        head = head - sph(0.7, (22.5, x * 1.8, hz + 2.6), seg=16)
    head = head - hole((12.6, 0, body_z + 7.0), 4.2, '-x')
    hooves = [cyl(1.01, 2.7, at=(x, y, TOP - 1.0)) for x, y in legs_at]
    base = stage('דבר', i, cut=hooves)
    return [
        P('stage', 'Field stage', base, 'green'),
        *[P(f'leg-{k + 1}', 'Leg', l, 'white', (0, 0, 6)) for k, l in enumerate(legs)],
        P('body', 'Cow', body, 'white', (0, 0, 22), inlays=[('spots', spots, 'black')]),
        P('head', 'Head', head, 'white', (14, 0, 22)),
        pins(1, explode=(8, 0, 22)) | dict(at=(12.55, 0, body_z + 7.0), place_rot=(0, 90, 0)),
    ]


def kit_boils(i):
    # Shechin: Moshe threw handfuls of kiln soot toward the sky (9:8). A kiln with a fire door that
    # drops into its arch, and the cloud of soot riding on a pin above the chimney.
    kz, ky = TOP - 1.0, 2.0
    kiln = revolve([(0, 0), (11.5, 0), (11.5, 13), (10.4, 16), (8.2, 19.5), (5.4, 21.6), (0, 21.6)])
    kiln = kiln - union(*[cyl(0.5, 11.9, at=(0, 0, 3.0 + 3.2 * k)) - cyl(0.6, 11.3, at=(0, 0, 2.95 + 3.2 * k))
                          for k in range(4)])
    door = U(R(-4.4, 0, 4.4, 7.5), Polygon([(-4.4, 7.5), (0, 12.6), (4.4, 7.5)]))
    kiln = kiln - extrude(door.buffer(FIT), 6.0, -3.0).rotate((90, 0, 0)).translate((0, -11.5, 1.2))
    kiln = union(kiln, cyl(6.0, 3.6, 3.2, at=(0, 0, 21.0)))
    chimney_top = kz + 27.0
    kiln = kiln.translate((0, ky, kz)) - hole((0, ky, chimney_top), 3.8, 'z')
    fire2d = U(R(-4.4 + FIT, 0, 4.4 - FIT, 7.5), Polygon([(-4.25, 7.5), (0, 12.4), (4.25, 7.5)]))
    face = ky - 11.5 + 3.0  # back wall of the door recess
    fire = extrude(fire2d, 2.6, 0).rotate((90, 0, 0)).translate((0, face, kz + 1.2))
    tongues = Polygon([(-3.2, 0), (-2.2, 5.4), (-1, 2.2), (0, 8.6), (1.2, 2.6), (2.4, 6.0), (3.2, 0)])
    fire = union(fire, extrude(tongues, 0.6, 0).rotate((90, 0, 0)).translate((0, face - 2.6, kz + 1.9)))
    puffs = [(0, 0, 4.2), (4.6, 1, 3.6), (-4.4, -0.6, 3.4), (2.2, -3.2, 3.2), (-2, 3.4, 3.4), (1.4, 2.0, 4.6), (7.6, 2.6, 2.6)]
    cloud = above(union(*[sph(r, (x, y, 3.6 + (r - 2.6) * 0.8), seg=28) for x, y, r in puffs]), 0)
    cloud = cloud.translate((0, ky, chimney_top)) - hole((0, ky, chimney_top), 3.6, '-z')
    stones = [cube(w, 2.4, 0.6, (x, y, TOP - 0.01)) for w, x, y in ((4, -14, 5), (3, -10, 12), (4.4, 13, 9), (3, 16, 2), (3.4, -16, -2))]
    base = stage('שחין', i, cut=[cyl(1.01, 11.5 + FIT, at=(0, ky, kz))], add=stones)
    return [
        P('stage', 'Stage', base, 'stage'),
        P('kiln', 'Kiln', kiln, 'clay', (0, 0, 10)),
        P('fire', 'Fire door', fire, 'orange', (0, -16, 6), rot=(-90, 0, 0)),
        P('cloud', 'Soot cloud', cloud, 'dark', (0, 0, 38)),
        pins(1, explode=(0, 0, 24)) | dict(at=(0, ky, chimney_top)),
    ]


def hailstone(r, seed, sub=2):
    ico = trimesh.creation.icosphere(subdivisions=sub, radius=r)
    rng = np.random.default_rng(seed)
    return Manifold.hull_points(ico.vertices * (1 + rng.uniform(-0.06, 0.06, (len(ico.vertices), 1))))


def kit_hail(i):
    # Barad: hail with fire flashing inside it (9:24), "a miracle within a miracle" (Rashi). A big
    # hailstone in two halves that close around a flame; print the halves in clear and the fire glows
    # through. Three small hailstones sit in dimples around it.
    R0, cy = 15.5, 2.0
    cz = TOP + R0 - 3.0
    stone = above(hailstone(R0, 7).translate((0, cy, cz)), TOP - 1.2)
    flame2d = U(Polygon([(-6, 0), (-7.4, 7), (-4.6, 5.2), (-4.4, 11.4), (-1.8, 7.4), (0, 15.6), (1.9, 8.4),
                         (4.6, 12.8), (4.8, 6.0), (7.2, 7.8), (6.0, 0)]), E(0, 1.2, 6.0, 2.6))
    flame2d = affinity.translate(flame2d, 0, -8)
    stone = stone - stand_up(flat_figure(flame2d.buffer(0.2), 3.4), 0, (0, cy, cz))
    flame = stand_up(flat_figure(flame2d, 3.0), 0, (0, cy, cz))
    front = stone.trim_by_plane((0, -1, 0), -cy)
    back = stone.trim_by_plane((0, 1, 0), cy)
    pin_at = [(-9.4, cy, cz - 4.0), (9.4, cy, cz - 4.0), (0, cy, cz + 10.4)]
    for p in pin_at:
        front = front - hole(p, 3.4, 'y')
        back = back - hole(p, 3.4, '-y')
    small = [(-14.0, 5.0, 3.6, 2), (13.5, 7.5, 3.2, 3), (-9.0, -6.0, 2.8, 4)]
    smalls = [above(hailstone(r, s, 1).translate((x, y, TOP - 0.6 + r * 0.55)), TOP - 0.6) for x, y, r, s in small]
    base = stage('ברד', i, cut=[cyl(1.21, 9.8, at=(0, cy, TOP - 1.2))] +
                 [cyl(0.61, r * 0.95, at=(x, y, TOP - 0.6)) for x, y, r, _ in small])
    return [
        P('stage', 'Stage', base, 'dark'),
        P('front', 'Hailstone, front', front, 'ice', (0, -18, 8), rot=(-90, 0, 0)),
        P('back', 'Hailstone, back', back, 'ice', (0, 18, 8), rot=(90, 0, 0)),
        P('flame', 'Fire inside', flame, 'orange', (0, 0, 32), rot=(-90, 0, 0)),
        *[P(f'hail-{k + 1}', 'Hailstone', s, 'ice', (0, 0, 12)) for k, s in enumerate(smalls)],
        pins(3, explode=(0, -9, 8)) | dict(at=pin_at, place_rot=(90, 0, 0)),
    ]


def kit_locusts(i):
    # Arbeh: locusts that covered the eye of the land (10:5). A locust in three layers: legs and
    # antennae, the body, and a pair of wings on top. Stubble of eaten wheat rings the stage.
    legs2d = U(L([(2.6, -1), (9.6, -7), (6.4, -17.5), (8.8, -19.5)], 1.9),
               L([(2.6, 6), (6.6, 9), (7.6, 12.4)], 1.2), L([(2.6, 2), (8, 2.2), (10.2, -0.6)], 1.2),
               L([(1, 13.8), (2.8, 18), (5.6, 22.6)], 0.9))
    legs2d = affinity.translate(U(mirror_x(legs2d), E(0, 2, 4.4, 12.6)), 0, -2.5)
    legs = extrude(legs2d.difference(C(0, 0, HOLE_R)), 1.6, 0).translate((0, 0, TOP))
    bz = TOP + 1.6
    body = above(below(ell(4.6, 13.5, 6.4, (0, 0, -0.6)), 4.0), 0)
    for k in range(5):
        body = body - cube(10, 0.5, 1.2, (0, -11 + 2.0 * k, 0))
    head = above(ell(3.6, 4.2, 4.6, (0, 12.4, 0.2)), 0)
    head = union(head, *[sph(1.3, (x * 2.6, 13.2, 3.0), seg=20) for x in (-1, 1)])
    body = union(body, head).translate((0, 0, bz)) - hole((0, 0, bz), 3.2, '-z')
    body = union(body, peg((0, -3.0, bz + 4.0), h=1.2, r=1.2))
    wings2d = mirror_x(E(2.6, -6, 2.9, 12.2, 10)).difference(C(0, -3.0, 1.35))
    veins = mirror_x(U(*[L([(1.6 + 0.9 * k, 3.4), (2.2 + 1.2 * k, -16)], 0.5) for k in range(3)]))
    wings = extrude(wings2d, 1.2, bz + 4.0) - extrude(veins, 0.41, bz + 4.0 + 0.8)
    stubble = [cyl(2.2, 0.8, 0.45, at=(17.0 * math.cos(math.radians(-35 + k * 19)),
                                       17.0 * math.sin(math.radians(-35 + k * 19)), TOP - 0.01), seg=12) for k in range(13)]
    base = stage('ארבה', i, add=stubble + [peg((0, 0, TOP), h=4.4)])
    return [
        P('stage', 'Wheat-stubble stage', base, 'gold'),
        P('legs', 'Legs & antennae', legs, 'olive', (0, 0, 8)),
        P('body', 'Locust', body, 'olive', (0, 0, 18)),
        P('wings', 'Wings', wings, 'tan', (0, 0, 32)),
    ]


def kit_insects(i):
    # Arov as R' Nechemia reads it (Shemot Rabbah 11:3): kinds of hornets and mosquitoes. A hornet
    # built in layers like the locust, and three mosquitoes hovering on stalks.
    legs2d = U(*[L([(2.4, y), (7.6, y + d), (9.6, y + d - 3.4)], 1.2) for y, d in ((4.6, 1.6), (2.6, -0.6), (0.8, -2.6))],
               L([(1.0, 9.6), (2.6, 12.6), (5.2, 13.6)], 0.9))
    sting = Polygon([(-1.0, -15.4), (0, -19.2), (1.0, -15.4)])
    legs2d = U(mirror_x(legs2d), E(0, 3, 3.6, 4.6), E(0, -8.4, 4.0, 7.4), sting)
    hx, hy, ang = -1.0, -0.5, 200
    place = lambda m: m.rotate((0, 0, ang)).translate((hx, hy, 0))
    bz = TOP + 1.6
    legs = extrude(legs2d.difference(C(0, 3, HOLE_R)), 1.6, 0)
    legs = union(legs, peg((0, -8.4, 1.6), h=2.0, r=1.2))
    thorax = above(below(ell(4.2, 4.6, 4.4, (0, 3, -0.4)), 3.4), 0)
    head = above(ell(3.4, 3.0, 3.2, (0, 8.0, -0.2)), 0)
    head = union(head, *[ell(1.4, 1.8, 1.8, (x * 2.4, 8.4, 1.2), seg=20) for x in (-1, 1)])
    thorax = union(thorax, head, peg((0, 3, 3.4), h=1.0, r=1.0)) - hole((0, 3, 0), 3.2, '-z')
    abdomen = above(ell(5.0, 8.0, 4.8, (0, -8.4, -0.4)), 0)
    for k in range(3):
        abdomen = abdomen - (cyl(1.1, 20, at=(0, 0, -0.55)).rotate((90, 0, 0)).translate((0, -5.0 - 3.2 * k + 0.55, 0))
                             - ell(4.3, 7.3, 4.1, (0, -8.4, -0.4)))
    abdomen = abdomen - hole((0, -8.4, 0), 2.2, '-z', r=1.35)
    wing = lambda x, y, rx, ry, a: E(x, y, rx, ry, a)
    wings2d = mirror_x(U(wing(6.4, 5.2, 6.6, 2.4, 22), wing(5.4, 1.8, 4.6, 1.8, 8)))
    wings2d = U(wings2d, C(0, 3, 2.6)).difference(C(0, 3, 1.15))
    wings = extrude(wings2d, 1.0, 3.4)
    mos2d = U(E(0, 0, 0.9, 4.2), C(0, 4.6, 1.1), L([(0, 5.2), (0, 8.6)], 0.8),
              mirror_x(U(E(2.6, 0.6, 2.8, 1.1, 18), *[L([(0.6, y), (4.2, y + d), (6.6, y + d - 2.6)], 0.8)
                                                       for y, d in ((1.6, 1.4), (0.2, -0.4), (-1.2, -2.6))])))
    mos2d = mos2d.difference(C(0, 0.2, 0.75))
    rods, mozzies, holes = [], [], []
    for k, (x, y, h, a) in enumerate(((11.5, 10.0, 24.0, 30), (-11.5, 11.0, 18.0, -50), (1.0, 15.5, 28.0, 120))):
        rod = union(cyl(2.6, 1.15, at=(x, y, TOP - 2.6)), cyl(h, 1.3, 1.1, at=(x, y, TOP)),
                    cyl(1.0, 0.6, at=(x, y, TOP + h)))
        rods.append(rod)
        holes.append(cyl(2.61, 1.15 + FIT, at=(x, y, TOP - 2.6)))
        mozzies.append(extrude(mos2d, 1.0, 0).translate((0, -0.2, 0)).rotate((0, 0, a)).translate((x, y, TOP + h)))
    base = stage('ערוב', i, cut=holes, add=[peg((hx + 3 * math.sin(math.radians(-ang)), hy + 3 * math.cos(math.radians(ang)), TOP), h=4.6)])
    return [
        P('stage', 'Stage', base, 'stage'),
        P('legs', 'Legs & sting', place(legs.translate((0, 0, TOP))), 'black', (0, 0, 8)),
        P('thorax', 'Head & thorax', place(thorax.translate((0, 0, bz))), 'black', (0, 0, 18)),
        P('abdomen', 'Striped abdomen', place(abdomen.translate((0, 0, bz))), 'yellow', (0, 6, 18)),
        P('wings', 'Wings', place(wings.translate((0, 0, bz))), 'clear', (0, 0, 30)),
        *[P(f'stalk-{k + 1}', 'Stalk', r, 'clear', (0, 0, 4)) for k, r in enumerate(rods)],
        *[P(f'mosquito-{k + 1}', 'Mosquito', m, 'dark', (0, 0, 16)) for k, m in enumerate(mozzies)],
    ]


def kit_darkness_eye(i):
    # Torah Temimah on 10:21: "had I not feared saying something very new", the darkness was not in
    # the air but in their eyes, a film stretched over the pupil, which could be felt by hand and was
    # the thickness of a dinar. An eye with iris and pupil, the film that presses on over them, and a
    # dinar beside it.
    to_world = lambda m: m.rotate((90, 0, 0)).translate((0, 6.0, TOP + 12.6))  # local +z faces you
    front = 8.4
    eye = below(above(sph(13, (0, 0, -3), seg=96), 0), front)
    eye = union(eye, cube(8, 4.6, 4, (0, -13.3, 0)))
    eye = eye - cyl(1.41, 5.0 + FIT, at=(0, 0, front - 1.4))
    for k in range(5):  # a few veins scored into the white
        a = math.radians(200 + k * 33)
        vein = L([(7.2 * math.cos(a), 7.2 * math.sin(a)), (9.4 * math.cos(a + 0.12), 9.4 * math.sin(a + 0.12)),
                  (11.2 * math.cos(a - 0.05), 11.2 * math.sin(a - 0.05))], 0.6)
        eye = eye - (extrude(vein, 14, 0) - sph(12.6, (0, 0, -3), seg=96))
    iris = cyl(1.4, 5.0, at=(0, 0, front - 1.4)) - cyl(1.5, 1.9 + FIT, at=(0, 0, front - 1.45))
    for k in range(16):
        iris = iris - cube(2.0, 0.5, 0.31, (3.5, 0, front - 0.3)).rotate((0, 0, k * 22.5))
    pupil = union(cyl(1.4, 1.9, at=(0, 0, front - 1.4)), peg((0, 0, front), h=1.0, r=1.1))
    film = cyl(1.2, 6.2, at=(0, 0, front)) - cyl(1.06, 1.1 + FIT, at=(0, 0, front - 0.01))
    coin_at = (11.0, -6.5)
    dinar = cyl(1.2, 4.2, at=(*coin_at, TOP - 0.4)) - (cyl(0.31, 3.7, at=(*coin_at, TOP + 0.5)) - cyl(0.4, 3.2, at=(*coin_at, TOP + 0.45)))
    dinar = union(dinar, cyl(0.3, 1.4, at=(*coin_at, TOP + 0.8)))
    base = stage('חושך', i, cut=[cube(8 + 2 * FIT, 4 + 2 * FIT, 3.01, (0, 6.0 - 2.0, TOP - 3.0)),
                                 cyl(0.41, 4.2 + FIT, at=(*coin_at, TOP - 0.4))])
    return [
        P('stage', 'Stage', base, 'stage'),
        P('eye', 'Eye', to_world(eye), 'white', (0, 6, 4), rot=(-90, 0, 0)),
        P('iris', 'Iris', to_world(iris), 'brown', (0, -10, 0), rot=(-90, 0, 0)),
        P('pupil', 'Pupil', to_world(pupil), 'black', (0, -16, 0), rot=(-90, 0, 0)),
        P('film', 'The film (תבלול)', to_world(film), 'milk', (0, -24, 0), rot=(-90, 0, 0)),
        P('dinar', 'Dinar', dinar, 'gold', (4, -4, 10)),
    ]


def cloud_shape(at):
    puffs = [(0, 0, 4.2), (4.6, 1, 3.6), (-4.4, -0.6, 3.4), (2.2, -3.2, 3.2), (-2, 3.4, 3.4), (0.8, 0.5, 4.8)]
    return above(union(*[sph(r, (x, y, 3.4 + (r - 2.6) * 0.8), seg=28) for x, y, r in puffs]), 0).translate(at)


def kit_darkness(i):
    # Choshech: darkness you could feel, "but all the children of Israel had light in their dwellings"
    # (10:23). A black Egyptian house under a black cloud, and an Israelite house with a lit window
    # and an oil lamp burning outside.
    ex, ix, hy = -9.4, 9.4, 6.0
    house_e = union(rounded_box(14, 12, 14, 0.8, (ex, hy, TOP)), cube(13.8, 11.8, 0.6, (ex, hy, TOP - 0.6)),
                    *[cube(2.2, 12, 1.6, (ex + dx, hy, TOP + 14)) for dx in (-5.9, -2, 2, 5.9)])
    house_e = house_e - cube(3.6, 1.2, 7.0, (ex, 0.0, TOP)) - cube(3, 1.2, 2.6, (ex + 3.8, 0, TOP + 9.0))
    house_e = house_e - hole((ex, hy, TOP + 14.0), 3.6, 'z')
    cloud = cloud_shape((ex, hy, TOP + 15.6)) - hole((ex, hy, TOP + 15.6), 3.4, '-z')
    house_i = union(rounded_box(13, 12, 10.5, 0.8, (ix, hy, TOP)), cube(12.8, 11.8, 0.6, (ix, hy, TOP - 0.6)))
    house_i = house_i - cube(3.6, 1.2, 7.0, (ix - 2.6, 0.0, TOP)) - cube(3.2, 2.4, 3.2, (ix + 3.0, 0.0, TOP + 5.2))
    house_i = house_i - hole((ix, hy, TOP + 10.5), 3.6, 'z')
    glow = cube(3.2, 0.8, 3.2, (ix + 3.0, 0.8, TOP + 5.2))
    roof = extrude(Polygon([(-7.6, 0), (7.6, 0), (0, 6.6)]), 13.4, -6.7).rotate((90, 0, 0)).translate((ix, hy, TOP + 10.5))
    roof = roof - hole((ix, hy, TOP + 10.5), 3.6, '-z')
    lx, ly = 8.0, -5.2
    lamp = revolve([(0, 0), (2.2, 0), (3.6, 1.4), (3.8, 2.4), (3.0, 3.2), (1.2, 3.4), (0, 3.4)])
    lamp = union(lamp, cube(4.4, 2.4, 1.6, (-3.4, 0, 1.6)), cyl(0.6, 2.2, at=(0, 0, -0.6)))
    lamp = lamp - cyl(2.0, 0.9, at=(0, 0, 1.8)) - cyl(2.0, 0.85, at=(-4.8, 0, 1.8))
    lamp = lamp.translate((lx, ly, TOP))
    flame2d = U(E(0, 2.6, 1.6, 2.6), Polygon([(-1.2, 3.6), (0, 7.4), (1.2, 3.6)]), R(-0.5, -1.2, 0.5, 0.5))
    flame = stand_up(flat_figure(flame2d, 1.2), 0, (lx - 4.8, ly, TOP + 3.2))
    base = stage('חושך', i, cut=[cyl(0.61, 2.4, at=(lx, ly, TOP - 0.6)),
                                 cube(14.3, 12.3, 0.61, (ex, hy, TOP - 0.6)), cube(13.3, 12.3, 0.61, (ix, hy, TOP - 0.6))])
    return [
        P('stage', 'Stage', base, 'stage'),
        P('egypt-house', 'Egyptian house', house_e, 'black', (-8, 0, 10)),
        P('cloud', 'Darkness', cloud, 'black', (-8, 0, 30)),
        P('israel-house', 'Israelite house', house_i, 'white', (8, 0, 10), inlays=[('window', glow, 'yellow')]),
        P('roof', 'Roof', roof, 'red', (8, 0, 26)),
        P('lamp', 'Oil lamp', lamp, 'clay', (6, -8, 10)),
        P('flame', 'Flame', flame, 'yellow', (6, -8, 22), rot=(-90, 0, 0)),
        pins(2, explode=(0, 0, 18)) | dict(at=[(ex, hy, TOP + 14.8), (ix, hy, TOP + 10.5)]),
    ]


def kit_firstborn(i):
    # Makat bechorot, told through what saved Israel that night: the blood of the Pesach lamb on the
    # two doorposts and the lintel (12:7), put there with hyssop dipped in the basin (12:22), and a
    # door shut until morning. A lamb lies by the door.
    post_h, pw, fy = 24.0, 4.0, 7.0
    posts = []
    for x in (-9.6, 9.6):
        p = cube(pw, pw, post_h, (x, fy, TOP)) - hole((x, fy, TOP), 3.3, '-z') - hole((x, fy, TOP + post_h), 3.3, 'z')
        sm = U(E(0, 0, 1.3, 3.4), E(0.3, -2.8, 0.7, 1.6), C(-0.5, 3.8, 0.6))
        smear = extrude(sm, 0.6, 0).rotate((90, 0, 0)).translate((x, fy - pw / 2, TOP + 15.0))
        posts.append((p, smear))
    lz = TOP + post_h
    lintel = cube(25.2, pw + 0.6, 4.2, (0, fy, lz))
    lintel = lintel - hole((-9.6, fy, lz), 3.3, '-z') - hole((9.6, fy, lz), 3.3, '-z')
    lsm = U(E(0, 0, 4.2, 1.2), E(-3.4, -0.6, 1.4, 0.7), C(4.6, 0.3, 0.6))
    lintel_smear = extrude(lsm, 0.6, 0).rotate((90, 0, 0)).translate((0, fy - (pw + 0.6) / 2, lz + 2.1))
    door = cube(14.6, 2.0, post_h - 0.2, (0, fy + 0.6, TOP - 0.6))
    for z in (5.0, 15.5):
        door = door - cube(11, 1.0, 6.5, (0, fy - 0.4, TOP - 0.6 + z - 1.5))
    door = union(door, sph(0.9, (5.4, fy - 0.4, TOP + 11.5), seg=16))
    wool = [(0, 0, 4.2), (-3.6, 0.4, 3.6), (3.4, -0.2, 3.6), (-1.6, 2.2, 3.4), (1.8, 2.2, 3.2), (-1.4, -2.4, 3.2), (2, -2.4, 3.0)]
    lamb = union(*[sph(r * 0.9, (x, y, 2.4 + (r - 3) * 0.6), seg=24) for x, y, r in wool],
                 ell(2.0, 3.2, 2.2, (6.2, 0, 5.0)), ell(0.9, 2.0, 0.6, (5.2, 2.6, 6.2)), ell(0.9, 2.0, 0.6, (5.2, -2.6, 6.2)))
    lamb = above(lamb, 0)
    for y in (-1, 1):
        lamb = lamb - sph(0.55, (8.0, y * 1.2, 5.8), seg=12)
    lamb = lamb.rotate((0, 0, 200)).translate((-9.4, -3.0, TOP))
    bx, by = 11.4, -3.2
    basin = revolve([(0, 0), (3.6, 0), (5.2, 3.6), (4.4, 3.6), (3.0, 1.2), (0, 1.2)]).translate((bx, by, TOP - 0.6))
    blood = (cyl(1.0, 3.2, 3.9, at=(0, 0, 1.2)) - cyl(1.2, 1.0, at=(0, 0, 1.1))).translate((bx, by, TOP - 0.6))
    leaves = [E(0.3 + (1.3 if k % 2 else -1.3), 9.0 + k * 1.3, 1.5, 0.65, 25 if k % 2 else -25) for k in range(6)]
    hyssop2d = U(L([(0, -1.2), (0.3, 8), (0.6, 16)], 1.2), *leaves)
    hyssop = stand_up(flat_figure(hyssop2d, 1.4), 0, (bx, by, TOP + 0.6))
    base = stage('בכורות', i, cut=[cube(14.9, 2.3, 0.61, (0, fy + 0.6, TOP - 0.6)), cyl(0.61, 3.7, at=(bx, by, TOP - 0.6)),
                                    hole((-9.6, fy, TOP), 3.3, 'z'), hole((9.6, fy, TOP), 3.3, 'z')])
    return [
        P('stage', 'Stage', base, 'stage'),
        P('post-r', 'Doorpost', posts[0][0], 'wood', (-12, 0, 6), rot=(-90, 0, 0), inlays=[('blood', posts[0][1], 'blood')]),
        P('post-l', 'Doorpost', posts[1][0], 'wood', (12, 0, 6), rot=(-90, 0, 0), inlays=[('blood', posts[1][1], 'blood')]),
        P('lintel', 'Lintel', lintel, 'wood', (0, 0, 22), rot=(-90, 0, 0), inlays=[('blood', lintel_smear, 'blood')]),
        P('door', 'Door', door, 'brown', (0, 14, 4), rot=(-90, 0, 0)),
        P('lamb', 'Lamb', lamb, 'white', (-6, -10, 10)),
        P('basin', 'Basin', basin, 'clay', (6, -10, 8), inlays=[('blood', blood, 'blood')]),
        P('hyssop', 'Hyssop', hyssop, 'olive', (8, -12, 26), rot=(-90, 0, 0)),
        pins(4, explode=(0, -4, 14)) | dict(at=[(-9.6, fy, TOP), (9.6, fy, TOP), (-9.6, fy, lz), (9.6, fy, lz)]),
    ]


KITS = [
    dict(group=1, slug='blood', he='דָּם', en='Blood', verse='Shemot 7:20', fn=kit_blood,
         story='Moshe lifts the staff over the Nile and the water turns to blood. A red river drops into a channel across the stage, two dead fish float on it, and the staff stands at the bank.'),
    dict(group=2, slug='frogs', he='צְפַרְדֵּעַ', en='Frogs', verse='Shemot 8:2', fn=kit_frogs,
         story='“The frog came up”: the verse says one frog, and Rashi brings the midrash that it was a single frog, and when they struck it, it split into swarms. A big frog on a lily pad, with a little one already split off.'),
    dict(group=3, slug='lice', he='כִּנִּים', en='Lice', verse='Shemot 8:12–15', fn=kit_lice,
         story='Aharon strikes the dust and it becomes lice. The magicians cannot copy it and admit “it is the finger of God.” A louse big enough to see, under a magnifying glass, on a dusty stage.'),
    dict(group=4, slug='wild-beasts', he='עָרוֹב', en='Wild beasts', verse='Shemot 8:17', fn=kit_wild_beasts,
         opinion='Wild animals', source='R’ Yehuda in Shemot Rabbah 11:3; Rashi',
         story='Arov, a mixture: Rashi lists lions, wolves, leopards, snakes and scorpions. A lion, a bear and a wolf stand in sockets, and a scorpion scuttles in front.'),
    dict(group=4, slug='insects', he='עָרוֹב', en='Hornets & mosquitoes', verse='Shemot 8:17', fn=kit_insects,
         opinion='Hornets and mosquitoes', source='R’ Nechemia in Shemot Rabbah 11:3',
         story='R’ Nechemia says arov was “kinds of hornets and mosquitoes” (מִינֵי צְרָעִין וְיַתּוּשִׁין). The midrash leans to R’ Yehuda’s wild animals: the verse says not one was left, because Pharaoh would have profited from their hides, and hornets have no hides. A hornet built in layers, with three mosquitoes hovering on stalks.'),
    dict(group=5, slug='pestilence', he='דֶּבֶר', en='Pestilence', verse='Shemot 9:6', fn=kit_pestilence,
         story='The plague on the livestock, which killed the cattle of Egypt and did not touch a single animal belonging to Israel. A cow built the Kinder way: body, four legs that plug in, a head on a pin.'),
    dict(group=6, slug='boils', he='שְׁחִין', en='Boils', verse='Shemot 9:8–10', fn=kit_boils,
         story='Moshe takes handfuls of soot from a kiln and throws it at the sky, and it settles as boils on man and beast. A kiln with a glowing fire door, and the cloud of soot rising off the chimney.'),
    dict(group=7, slug='hail', he='בָּרָד', en='Hail', verse='Shemot 9:24', fn=kit_hail,
         story='Hail with fire flashing inside it: Rashi calls it a miracle inside a miracle, fire and water making peace to do God’s will. The big hailstone closes around a flame; print it in clear and the fire shows through.'),
    dict(group=8, slug='locusts', he='אַרְבֶּה', en='Locusts', verse='Shemot 10:5', fn=kit_locusts,
         story='Locusts so thick they covered the eye of the land and ate everything the hail left. A locust in three layers, legs, body and wings, on a ring of eaten wheat stubble.'),
    dict(group=9, slug='darkness', he='חֹשֶׁךְ', en='Darkness', verse='Shemot 10:21–23', fn=kit_darkness,
         opinion='Darkness over the land', source='The plain reading; Rashi',
         story='A darkness you could feel, “but all the children of Israel had light in their dwellings.” A black Egyptian house under a black cloud, and an Israelite house with a lit window and an oil lamp burning.'),
    dict(group=9, slug='darkness-eye', he='חֹשֶׁךְ', en='Darkness in the eye', verse='Shemot 10:21', fn=kit_darkness_eye,
         opinion='A film over the eye', source='Torah Temimah, Shemot 10:21',
         story='The midrash says the darkness could be felt and was “the thickness of a dinar”, and a three-day night seems to break the promise that day and night will not cease. So the Torah Temimah suggests, “had I not been afraid to invent something very new”, that the darkness was not in the air but in their eyes: a film (תְּבַלּוּל) stretched over the pupil, which you could feel with your hand and was as thick as a dinar. An eye with its iris and pupil, the film that presses on over them and pulls off, and a dinar for the thickness.'),
    dict(group=10, slug='firstborn', he='מַכַּת בְּכוֹרוֹת', en='Firstborn', verse='Shemot 12:7, 12:22–23', fn=kit_firstborn,
         story='Told through what saved Israel that night: the blood of the Pesach lamb on the two doorposts and the lintel, put there with a bundle of hyssop dipped in the basin, and a door shut until morning.'),
]


# ---------------------------------------------------------------- export

def to_trimesh(m):
    mesh = m.to_mesh()
    return trimesh.Trimesh(vertices=np.asarray(mesh.vert_properties)[:, :3].astype(np.float64),
                           faces=np.asarray(mesh.tri_verts), process=False)


def on_bed(m, rot):
    m = m.rotate(rot)
    (x0, y0, z0, x1, y1, z1) = m.bounding_box()
    return m.translate((-(x0 + x1) / 2, -(y0 + y1) / 2, -z0))


def estimate(m):
    """Small parts on an A1 mini (0.4 nozzle, 0.2 mm layers, 15 % infill): walls are most of the
    plastic, and the printer slows for small layers, so time follows layers as much as grams."""
    vol, area = m.volume(), m.surface_area()
    shell = min(vol, area * 1.0)
    g = (shell + 0.15 * (vol - shell)) / 1000 * PLA_DENSITY
    return g


def write_3mf(path, items, title):
    """Core-spec 3MF with each part as its own object on the plate; a part with inlays is one object
    made of coloured sub-parts."""
    names = sorted({c for it in items for _, _, c in it['bodies']})
    mats = ''.join(f'<base name="{n}" displaycolor="{FILAMENT[n]}FF"/>' for n in names)
    res, build, oid = [f'<basematerials id="1">{mats}</basematerials>'], [], 2
    for it in items:
        comp_ids = []
        for name, mesh, colour in it['bodies']:
            v = ''.join(f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in mesh.vertices)
            t = ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in mesh.faces)
            res.append(f'<object id="{oid}" type="model" name="{name}" pid="1" pindex="{names.index(colour)}">'
                       f'<mesh><vertices>{v}</vertices><triangles>{t}</triangles></mesh></object>')
            comp_ids.append(oid)
            oid += 1
        if len(comp_ids) > 1:
            comps = ''.join(f'<component objectid="{c}"/>' for c in comp_ids)
            res.append(f'<object id="{oid}" type="model" name="{it["name"]}"><components>{comps}</components></object>')
            top = oid
            oid += 1
        else:
            top = comp_ids[0]
        x, y = it['xy']
        build.append(f'<item objectid="{top}" transform="1 0 0 0 1 0 0 0 1 {x:.3f} {y:.3f} 0"/>')
    model = ('<?xml version="1.0" encoding="UTF-8"?>'
             '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
             f'<metadata name="Title">{title}</metadata>'
             f'<resources>{"".join(res)}</resources><build>{"".join(build)}</build></model>')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',
                   '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
        z.writestr('_rels/.rels',
                   '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
        z.writestr('3D/3dmodel.model', model)


def pack(sizes, bed=BED, gap=4.0):
    """Shelf-pack rectangles (w, h) onto the bed; returns centre positions, centred on the plate."""
    order = sorted(range(len(sizes)), key=lambda k: -sizes[k][1])
    pos, x, y, shelf_h = [None] * len(sizes), 0.0, 0.0, 0.0
    for k in order:
        w, h = sizes[k]
        if x + w > bed:
            x, y, shelf_h = 0.0, y + shelf_h + gap, 0.0
        pos[k] = (x + w / 2, y + h / 2)
        x += w + gap
        shelf_h = max(shelf_h, h)
    total_h = y + shelf_h
    if total_h > bed:
        raise ValueError(f'parts do not fit one plate ({total_h:.0f} mm deep)')
    used_w = max(p[0] + sizes[k][0] / 2 for k, p in enumerate(pos))
    return [(px - used_w / 2 + 90, py - total_h / 2 + 90) for px, py in pos]


def yup(mesh):
    """trimesh/print space is Z-up; glTF is Y-up."""
    m = mesh.copy()
    m.apply_transform(trimesh.transformations.rotation_matrix(-math.pi / 2, (1, 0, 0)))
    return m


def material(colour):
    hexs = FILAMENT[colour].lstrip('#')
    rgb = [int(hexs[k:k + 2], 16) / 255 for k in (0, 2, 4)]
    alpha = {'ice': 0.55, 'clear': 0.55, 'milk': 0.85}.get(colour, 1.0)
    return trimesh.visual.material.PBRMaterial(
        name=colour, baseColorFactor=rgb + [alpha], metallicFactor=0.0, roughnessFactor=0.55,
        alphaMode='BLEND' if alpha < 1 else 'OPAQUE', doubleSided=False)


def build_kit(idx, kit):
    slug = kit['slug']
    out = OUT / slug
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob('*'):
        if f.suffix in ('.stl', '.3mf', '.glb', '.zip'):  # keep the rendered card image
            f.unlink()
    idx = kit['group'] - 1
    parts = kit['fn'](idx)
    scene = trimesh.Scene()
    plate, meta_parts, total_g = [], [], 0.0
    max_h = 0.0
    for p in parts:
        bodies = [(p['name'], p['mesh'], p['colour'])] + [(n, m, c) for n, m, c in p['inlays']]
        # --- assembled pose, for the viewer
        places = p['at'] if isinstance(p.get('at'), list) else ([p['at']] if p.get('at') else [None])
        if p['name'] == 'pin':
            for k, at in enumerate(places):
                m = pin_part().translate((0, 0, -PIN_L / 2))
                m = m.rotate(p.get('place_rot', (0, 0, 0))).translate(at) if at else m
                tm = yup(to_trimesh(m))
                tm.visual = trimesh.visual.TextureVisuals(material=material(p['colour']))
                scene.add_geometry(tm, node_name=f'pin-{k + 1}', geom_name=f'pin-{k + 1}')
        else:
            for n, m, c in bodies:
                tm = yup(to_trimesh(m))
                tm.visual = trimesh.visual.TextureVisuals(material=material(c))
                node = p['name'] if n == p['name'] else f"{p['name']}--{n}"
                scene.add_geometry(tm, node_name=node, geom_name=node)
        # --- print pose
        whole = union(*[m for _, m, _ in bodies])
        rotd = whole.rotate(p['rot'])
        (x0, y0, z0, x1, y1, z1) = rotd.bounding_box()
        shift = (-(x0 + x1) / 2, -(y0 + y1) / 2, -z0)
        printed = [(n, to_trimesh(m.rotate(p['rot']).translate(shift)), c) for n, m, c in bodies]
        for n, tm, c in printed:
            assert tm.is_watertight, f'{slug}/{n} is not watertight'
            stem = f"{slug}-{p['name']}" + ('' if n == p['name'] else f'-{n}')
            tm.export(out / f'{stem}.stl')
        g = sum(estimate(m) for _, m, _ in bodies)
        total_g += g * p['qty']
        for q in range(p['qty']):
            plate.append(dict(name=p['label'] if p['qty'] == 1 else f"{p['label'].split(' ×')[0]} {q + 1}",
                              bodies=printed, size=(x1 - x0, y1 - y0)))
        max_h = max(max_h, z1 - z0)
        meta_parts.append(dict(
            name=p['name'], label=p['label'], qty=p['qty'], colour=p['colour'], hex=FILAMENT[p['colour']],
            inlays=[dict(name=n, colour=c, hex=FILAMENT[c]) for n, _, c in p['inlays']],
            stl=[f"{slug}-{p['name']}" + ('' if n == p['name'] else f'-{n}') + '.stl' for n, _, _ in printed],
            size=[round(x1 - x0, 1), round(y1 - y0, 1), round(z1 - z0, 1)],
            grams=round(g * p['qty'], 1),
            explode=[p['explode'][0], p['explode'][2], -p['explode'][1]],  # to Y-up
        ))
    xy = pack([it['size'] for it in plate])
    for it, pos in zip(plate, xy):
        it['xy'] = pos
    write_3mf(out / f'{slug}-plate.3mf', plate, f"The Ten Plagues: {kit['en']} ({kit['he']})")
    scene.export(out / f'{slug}.glb')
    with zipfile.ZipFile(out / f'{slug}-stl.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(out.glob('*.stl')):
            z.write(f, f.name)
    colours = sorted({p['colour'] for p in meta_parts} | {i['colour'] for p in meta_parts for i in p['inlays']})
    layers = max_h / 0.2
    minutes = round(6 + total_g / 9.0 * 60 * 0.55 + layers * 0.05 + len(plate) * 1.5)
    return dict(
        slug=slug, he=kit['he'], en=kit['en'], verse=kit['verse'], story=kit['story'], number=idx + 1,
        opinion=kit.get('opinion'), source=kit.get('source'),
        numeral=NUMERALS[idx], parts=meta_parts, pieces=len(plate), grams=round(total_g, 1),
        metres=round(total_g / G_PER_M, 1), minutes=minutes, colours=[dict(name=c, hex=FILAMENT[c]) for c in colours],
        files=dict(plate=f'{slug}-plate.3mf', zip=f'{slug}-stl.zip', glb=f'{slug}.glb'),
    )


def main():
    only = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    data_path = OUT / 'kits.json'
    old = json.loads(data_path.read_text()) if data_path.exists() else {'kits': []}
    old_by = {k['slug']: k for k in old['kits']}
    kits = []
    for idx, kit in enumerate(KITS):
        if only and kit['slug'] not in only:
            if kit['slug'] in old_by:
                kits.append(old_by[kit['slug']])
            continue
        print('building', kit['slug'], flush=True)
        kits.append(build_kit(idx, kit))
    data_path.write_text(json.dumps(dict(kits=kits, filament=FILAMENT), ensure_ascii=False, indent=1))
    for k in kits:
        print(f"{k['number']:>2} {k['en']:<12} {k['pieces']:>2} pieces  {k['grams']:>5} g  ~{k['minutes']} min")


if __name__ == '__main__':
    main()
