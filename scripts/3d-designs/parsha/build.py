"""A toy for every parsha, each built on one peshat of Shadal (Shmuel David Luzzatto, 1800–1865).

Same idea as the Ten Plagues kits next door: a small snap-together toy on a Ø40 mm stage, the parsha's
name sunk into the top and its number (א–נד) under it, printable on a Bambu A1 mini with no supports.
Flat figures stand in slots, round pieces sit on pegs, and a few parts join with loose Ø3 pins.

Builds into public/3d/parsha/:
  <slug>/<slug>-plate.3mf     every part laid out on one plate, coloured
  <slug>/<slug>-stl.zip       each part as an STL, already turned onto its print face
  <slug>/<slug>.glb           the assembled toy for the web viewer (parts are separate nodes)
  kits.json                   the Shadal source, parts, colours, explode vectors, grams and time

  python scripts/3d-designs/parsha/build.py [slug ...]

Needs: manifold3d trimesh shapely fonttools numpy scipy. Card images: render.mjs.
"""
import json
import math
import sys
import zipfile
from pathlib import Path

import numpy as np
import trimesh
from manifold3d import Manifold
from shapely import affinity
from shapely.geometry import LineString, Polygon

HERE = Path(__file__).parent
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location('plagues_build', HERE.parent / 'plagues' / 'build.py')
pl = importlib.util.module_from_spec(_spec)  # the plagues kit library: primitives, text, 3MF writer
sys.modules['plagues_build'] = pl
_spec.loader.exec_module(pl)

from plagues_build import (C, E, FIT, HOLE_R, L, PIN_R, R, TOP, U, above, cube, cyl, ell, extrude,  # noqa: E402
                   flat_figure, hole, mirror_x, revolve, rounded_box, sph, stand_up, text_shape, union)

ROOT = HERE.parents[2]
OUT = ROOT / 'public' / '3d' / 'parsha'
BASE_R, BASE_T = pl.BASE_R, pl.BASE_T

pl.FILAMENT.update({
    'water': '#2E7FC1', 'sky': '#8FD0EE', 'leaf': '#5FA347', 'skin': '#E0B48A', 'copper': '#B87333',
    'iron': '#4A4F55', 'stone': '#A79E8E', 'cream': '#F2E6C8', 'purple': '#6A3D8F', 'blue': '#2A55B0',
    'silver': '#C8CCD0', 'flame': '#FF8C1A', 'wheat': '#E3C16F', 'sand': '#D9C48F',
})
FILAMENT = pl.FILAMENT


# ---------------------------------------------------------------- the stage

def gematria(n):
    if n in (15, 16):
        return {15: 'טו', 16: 'טז'}[n]
    return ('יכלמנ'[n // 10 - 1] if n >= 10 else '') + ('אבגדהוזחט'[n % 10 - 1] if n % 10 else '')


def stage(name, n, cut=(), add=()):
    b = union(cyl(BASE_T - 0.8, BASE_R), cyl(0.8, BASE_R, BASE_R - 0.8, at=(0, 0, BASE_T - 0.8)))
    if add:
        b = union(b, *add)
    b = b - Manifold.extrude(text_shape(name, 5.0, 0, -13.4, max_w=27), 0.81).translate((0, 0, TOP - 0.8))
    b = b - Manifold.extrude(text_shape(gematria(n), 13, 0, 0, max_w=26), 0.61).mirror((1, 0, 0)).translate((0, 0, -0.01))
    for c in cut:
        b = b - c
    return b


def P(name, label, mesh, colour, explode=(0, 0, 20), rot=(0, 0, 0), pm=None, places=None, inlays=()):
    """A part, drawn where it sits in the finished toy. `pm` is a ready print-pose mesh (flat figures);
    otherwise `rot` turns `mesh` onto its print face. `places` [(x, y, z, rz)] repeats a part drawn at the
    origin (qty = number of places)."""
    return dict(name=name, label=label, mesh=mesh, colour=colour, explode=explode, rot=rot, pm=pm,
                places=places, qty=len(places) if places else 1, inlays=list(inlays))


def _rotxy(x, y, a):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
    return x * c - y * s, x * s + y * c


def fig(name, label, g, colour, at=(0, 0), angle=0.0, t=3.0, explode=(0, 0, 20), depth=2.4, tabs=None, z=TOP):
    """A flat silhouette `g` (drawn in x/y, standing on y = 0) stood up in slots in the stage.
    Returns (part, [stage cuts])."""
    if tabs is None:
        x0, _, x1, _ = g.intersection(R(-200, 0, 200, 1.0)).bounds
        tabs = [(x0 + 0.4, x1 - 0.4)]
    tabs = [(a, b) for a, b in tabs if b - a > 0.6]
    g2 = U(g, *[R(a, -depth, b, 0.8) for a, b in tabs])
    m = stand_up(flat_figure(g2, t), angle, (at[0], at[1], z))
    cuts = []
    for a, b in tabs:
        dx, dy = _rotxy((a + b) / 2, 0, angle)
        cuts.append(pl.slot(b - a, t, depth, (at[0] + dx, at[1] + dy), angle))
    return P(name, label, m, colour, explode, pm=extrude(g2, t)), cuts


def cross(name, label, g, colour, at=(0, 0), angle=0.0, t=2.4, explode=(0, 0, 22)):
    """Two copies of a silhouette that slot together at right angles (a 3D bush, tree or flame).
    Returns ([part a, part b], cuts)."""
    x0, y0, x1, y1 = g.bounds
    mid = (y1) * 0.5
    w = t / 2 + FIT
    ga = g.difference(R(-w, mid, w, y1 + 1))
    gb = g.difference(R(-w, -5, w, mid))
    band = g.intersection(R(-200, 0, 200, 1.0)).bounds
    pa, ca = fig(f'{name}-a', label, ga, colour, at, angle, t, explode)
    # the second half rests on the first at the middle of the slot; it only gets tabs if it reaches the ground
    pb, cb = fig(f'{name}-b', label, gb, colour, at, angle + 90, t, (explode[0], explode[1], explode[2] + 6),
                 tabs=[(band[0] + 0.4, -w - 0.3), (w + 0.3, band[2] - 0.4)])
    return [pa, pb], ca + cb


def seat(x, y, h=3.0, r=PIN_R):
    """A peg on the stage at (x, y) and the matching socket for the piece that sits on it."""
    return pl.peg((x, y, TOP), h=h, r=r), hole((x, y, TOP), h + 0.4, axis='-z', r=r + 0.15)


def zpin(length):
    """A loose Ø3 pin (prints standing)."""
    return pl.pin_part(length)


# ---------------------------------------------------------------- 2D vocabulary

def person(h=24.0, w=7.0, hands=None, hat=None, hr=2.7, robe=1.0, legs=False):
    """A robed figure facing the viewer, feet on y = 0. `hands` are two (x, y) points the arms reach to."""
    hy = h - hr
    sh = hy - hr - 1.4
    if legs:
        body = U(Polygon([(-w * 0.34, h * 0.42), (w * 0.34, h * 0.42), (w * 0.32, sh), (-w * 0.32, sh)]),
                 R(-w * 0.32, 0, -0.5, h * 0.45), R(0.5, 0, w * 0.32, h * 0.45))
    else:
        body = Polygon([(-w / 2 * robe, 0), (w / 2 * robe, 0), (w * 0.32, sh), (-w * 0.32, sh)])
    g = U(body, E(0, sh, w * 0.42, 1.5), R(-0.9, sh, 0.9, hy - hr + 0.6), C(0, hy, hr))
    hands = hands or [(-w * 0.5, h * 0.42), (w * 0.5, h * 0.42)]
    for sx, hand in zip((-1, 1), hands):
        g = U(g, L([(sx * w * 0.36, sh - 0.3), hand], 1.6), C(hand[0], hand[1], 1.0))
    if hat == 'turban':
        g = U(g, E(0, hy + hr * 0.6, hr * 1.15, hr * 0.7))
    elif hat == 'hood':
        g = U(g, Polygon([(-hr - 0.8, hy - hr), (hr + 0.8, hy - hr), (hr * 0.7, hy + hr + 0.8), (-hr * 0.7, hy + hr + 0.8)]))
    return g


def beast(kind='sheep', L_=20.0, H=8.0, leg=6.0):
    """A four-legged animal in side view facing +x, hooves on y = 0."""
    cy = leg + H / 2
    if kind in ('sheep', 'ram', 'lamb'):
        body = U(*[C(x, cy + dy, H * 0.42) for x, dy in ((-L_ * 0.3, 0), (-L_ * 0.1, 0.8), (L_ * 0.1, 0.6), (L_ * 0.3, 0), (0, -0.6))])
    else:
        body = E(0, cy, L_ / 2, H / 2)
    if kind == 'camel':
        body = U(body, E(-L_ * 0.05, cy + H * 0.55, L_ * 0.22, H * 0.45))
    g = body
    for x in (-L_ * 0.34, -L_ * 0.2, L_ * 0.2, L_ * 0.34):
        g = U(g, R(x - 0.85, 0, x + 0.85, cy))
    hx = L_ / 2 + 1.6
    hy = cy + H * 0.55
    neck_w = 2.6
    if kind in ('camel', 'deer'):
        hx, hy = L_ / 2 + 3.5, cy + H * 1.3
        neck_w = 2.2
    if kind in ('ox', 'cow', 'bull'):
        hx, hy = L_ / 2 + 1.2, cy + H * 0.3
        neck_w = 4.0
    g = U(g, L([(L_ * 0.38, cy + H * 0.15), (hx - 0.8, hy)], neck_w), E(hx + 0.6, hy, 2.8 if kind not in ('ox', 'cow', 'bull') else 3.2, 1.9, -25))
    g = U(g, L([(-L_ / 2 + 0.5, cy + H * 0.2), (-L_ / 2 - 1.4, cy - H * 0.25)], 1.1))  # tail
    if kind == 'ram':
        g = U(g, C(hx - 0.4, hy + 1.2, 2.6).difference(C(hx - 0.4, hy + 1.2, 1.2)))
    if kind == 'goat':
        g = U(g, L([(hx - 0.6, hy + 1.2), (hx - 3.2, hy + 4.2)], 1.0), Polygon([(hx + 1.6, hy - 1.2), (hx + 2.6, hy - 1.2), (hx + 2.0, hy - 3.6)]))
    if kind in ('ox', 'cow'):
        g = U(g, L([(hx - 0.2, hy + 1.6), (hx - 1.6, hy + 3.8), (hx - 0.4, hy + 5.4)], 1.2))
    if kind == 'donkey':
        g = U(g, L([(hx - 0.6, hy + 1.0), (hx - 1.6, hy + 5.0)], 1.3))
    if kind == 'deer':
        g = U(g, L([(hx - 0.4, hy + 1.4), (hx - 1.4, hy + 5.4), (hx - 3.6, hy + 7)], 0.9), L([(hx - 1.2, hy + 4.6), (hx + 0.8, hy + 6.4)], 0.9))
    if kind == 'camel':
        g = U(g, E(hx + 0.6, hy, 2.6, 1.6, -10))
    return g


def bird(L_=10.0, wing_up=False):
    g = U(E(0, 3, L_ / 2, 2.2), C(L_ / 2, 4.6, 1.6), Polygon([(L_ / 2 + 1.2, 4.9), (L_ / 2 + 3.0, 4.4), (L_ / 2 + 1.2, 4.0)]),
          Polygon([(-L_ / 2 + 0.5, 3.4), (-L_ / 2 - 2.6, 4.6), (-L_ / 2 - 2.2, 2.0)]))
    if wing_up:
        g = U(g, Polygon([(-1.5, 4), (2, 4.5), (-2.5, 9.5), (-4, 8)]))
    return U(g, R(-0.5, 0, 0.5, 1.6), R(1.0, 0, 2.0, 1.6))


def flame(h=10.0, w=5.0):
    return U(Polygon([(-w / 2, h * 0.25), (0, h), (w / 2, h * 0.25)]), C(0, h * 0.25, w / 2),
             Polygon([(w * 0.15, h * 0.35), (w * 0.55, h * 0.75), (w * 0.45, h * 0.3)]),
             Polygon([(-w * 0.15, h * 0.35), (-w * 0.6, h * 0.65), (-w * 0.45, h * 0.3)])).intersection(R(-50, 0, 50, 50))


def tree(h=22.0, r=7.0, trunk=1.8, fruit=False):
    g = U(R(-trunk / 2, 0, trunk / 2, h - r), R(-3.5, 0, 3.5, 1.2), C(0, h - r, r), C(-r * 0.7, h - r * 1.3, r * 0.6), C(r * 0.7, h - r * 1.25, r * 0.65))
    if fruit:
        g = g.difference(U(*[C(x, y, 0.9) for x, y in ((-3, h - r), (2.5, h - r * 0.6), (0.5, h - r * 1.5))]))
    return g


def bush(h=16.0, w=16.0, thorns=True):
    lines = [L([(0, 0), (dx * w / 2, h * f)], 1.2) for dx, f in ((-1, 0.75), (-0.5, 1.0), (0, 0.85), (0.5, 1.0), (1, 0.7), (0.2, 0.55), (-0.25, 0.5))]
    g = U(*lines, R(-1.2, 0, 1.2, h * 0.3), R(-3.5, 0, 3.5, 1.2))
    if thorns:
        sp = []
        for dx, f in ((-1, 0.75), (-0.5, 1.0), (0.5, 1.0), (1, 0.7)):
            for k in (0.4, 0.7):
                x, y = dx * w / 2 * k, h * f * k
                sp.append(L([(x, y), (x + 1.6 * (1 if dx > 0 else -1), y + 0.8)], 0.7))
        g = U(g, *sp)
    return g


def stalks(h=16.0, n=5, head='ear', spread=7.0):
    """A clump of grain stalks; head 'ear' (long, wheat/barley), 'bud' (a closed calyx: flax in bud)."""
    parts = []
    for k in range(n):
        x = (k - (n - 1) / 2) * spread / max(n - 1, 1)
        top = (x * 0.5, h - abs(x) * 0.4)
        parts.append(L([(x * 0.2, 0), top], 0.9))
        if head == 'ear':
            parts.append(E(top[0], top[1] + 1.8, 1.0, 2.6, -x * 3))
        else:
            parts.append(C(top[0], top[1] + 1.0, 1.4))
    return U(R(-2.5, 0, 2.5, 2), *parts)


def arc_band(r_out, r_in, feet=1.5):
    ring = C(0, 0, r_out).difference(C(0, 0, r_in)).intersection(R(-r_out - 1, 0, r_out + 1, r_out + 1))
    return ring


# ---------------------------------------------------------------- 3D vocabulary

def tent3d(w, d, h, at=(0, 0, TOP)):
    pts = [cube(0.1, 0.1, 0.1, (sx * w / 2, sy * d / 2, 0)) for sx in (-1, 1) for sy in (-1, 1)]
    pts += [cube(0.1, 0.1, 0.1, (sx * w * 0.42, 0, h - 0.1)) for sx in (-1, 1)]
    t = Manifold.batch_hull(pts)
    door = cube(w * 0.2, d, h * 0.45, (0, -d / 2, 0)).translate((0, 0, 0))
    t = t - Manifold.batch_hull([cube(0.1, 0.1, 0.1, (0, -d / 2, h * 0.6)), cube(w * 0.3, 2, 0.1, (0, -d / 2 - 0.5, 0))])
    return t.translate(at)


def house3d(w, d, h, roof=3.0, at=(0, 0, TOP), door=True, flat=True):
    m = cube(w, d, h)
    if roof and not flat:
        m = union(m, Manifold.batch_hull([cube(w + 1, d + 1, 0.1, (0, 0, h)), cube(w + 1, 0.4, 0.1, (0, 0, h + roof))]))
    elif roof:
        m = union(m, cube(w + 0.8, d + 0.8, 0.8, (0, 0, h)))
    if door:
        m = m - cube(w * 0.28, 2.0, h * 0.55, (0, -d / 2, -0.01))
    return m.translate(at)


def lamp3d(at=(0, 0, 0), a=0.0):
    """A clay oil lamp, spout toward +x, rotated `a` about z."""
    body = ell(3.2, 2.6, 1.6, (0, 0, 1.4))
    body = above(body, 0)
    spout = Manifold.batch_hull([cyl(1.6, 1.4, at=(0, 0, 0.4)), cyl(1.2, 0.9, at=(4.4, 0, 1.0))])
    m = union(body, spout) - cyl(3, 1.1, at=(0, 0, 1.6)) - cyl(3, 0.45, at=(4.3, 0, 1.2))
    return m.rotate((0, 0, a)).translate(at)


def drop_lid(r, h=1.6):
    return union(cyl(h, r), cyl(1.8, r - 1.0 - FIT, at=(0, 0, -1.8)))


def bed_shift(m):
    x0, y0, z0, x1, y1, z1 = m.bounding_box()
    return m.translate((-(x0 + x1) / 2, -(y0 + y1) / 2, -z0))


# ---------------------------------------------------------------- kits
# Each kit takes its number n and returns a list of parts.

def k_bereshit(n):
    sea = E(0, 9, 15, 6).intersection(C(0, 0, 18.4))
    sea_m = extrude(sea, 1.4, TOP - 0.6)
    posts = [(-12, 3), (12, 3), (0, 15)]
    cuts = [extrude(sea.buffer(FIT), 0.61, TOP - 0.6)] + [hole((x, y, TOP), 3.0) for x, y in posts]
    hill = above(ell(7, 5, 4, (-6, -4, TOP)), TOP)
    plate_z = TOP + 16
    plate = cyl(2.0, 19, at=(0, 0, plate_z))
    for x, y in posts:
        plate = plate - cyl(5, HOLE_R, at=(x, y, plate_z - 1), seg=32)
    upper = extrude(U(*[E(x, y, 6, 3.2) for x, y in ((-8, -6), (6, -8), (-7, 7), (8, 6), (0, 0))]).intersection(C(0, 0, 17)), 2.0, plate_z + 2.0)
    wins = ((-4, 10), (5, -2), (-10, -2))
    upper = upper - union(*[cyl(5, 1.6, at=(x, y, plate_z + 1)) for x, y in wins])
    drops = union(*[union(sph(1.1, (x, y, plate_z - 3.2)), Manifold.cylinder(2.6, 1.0, 0.15, 16).translate((x, y, plate_z - 3.0)).rotate((0, 0, 0))) for x, y in wins[:2]])
    drops = union(*[union(sph(1.1, (x, y, plate_z - 2.8), seg=24), Manifold.cylinder(2.81, 0.15, 1.0, 16).translate((x, y, plate_z - 2.8))) for x, y in wins[:2]])
    parts = [P('stage', 'Stage', stage('בראשית', n, cuts), 'stage', (0, 0, 0)),
             P('sea', 'The lower waters', sea_m, 'water', (0, 6, 8)),
             P('land', 'Dry land', hill, 'leaf', (-6, -6, 10))]
    for k, (x, y) in enumerate(posts):
        parts.append(P(f'pillar-{k + 1}', 'Pillar', cyl(plate_z + 2 - (TOP - 3), PIN_R, at=(x, y, TOP - 3), seg=32), 'white', (x * 0.6, y * 0.6, 16)))
    parts += [P('rakia', 'The firmament (rakia), with rain hanging from it', plate, 'sky', (0, 0, 34), rot=(180, 0, 0), inlays=[('rain', drops, 'ice')]),
              P('upper-waters', 'The upper waters, with windows', upper, 'water', (0, 0, 50))]
    return parts


def k_noach(n):
    parts, cuts = [], []
    for k, (r, col, y) in enumerate(((15.0, 'red', 10.0), (13.0, 'yellow', 7.0), (11.0, 'blue', 4.0))):
        ring = C(0, 0, r).difference(C(0, 0, r - 2.2)).intersection(R(-r - 1, 0, r + 1, r + 1))
        p, c = fig(f'band-{k + 1}', ['Red band', 'Yellow band', 'Blue band'][k], ring, col, (0, y), 0, 2.0,
                   (0, 6 + 4 * k, 14 + 6 * k), tabs=[(-r + 0.3, -r + 1.9), (r - 1.9, r - 0.3)])
        parts.append(p)
        cuts += c
    mx, my = -9, -3
    mount = above(ell(8, 5.5, 5, (mx, my, TOP)), TOP) - cube(3.4, 3.4, 3, (mx, my, TOP + 3.0))
    ark = union(Manifold.batch_hull([cube(12, 6, 0.1, (0, 0, 2.6)), cube(8, 4, 0.1, (0, 0, 0.6))]), cube(10, 5, 2.4, (0, 0, 2.6)),
                cube(5.5, 3.6, 2.4, (0, 0, 5.0)), Manifold.batch_hull([cube(6.5, 4.4, 0.1, (0, 0, 7.4)), cube(6.5, 0.3, 0.1, (0, 0, 9.2))]),
                cube(3.0, 3.0, 2.6, (0, 0, -2.0)))
    ark = ark.translate((mx, my, TOP + 5.0))
    dove, dc = fig('dove', 'Dove with an olive leaf', U(bird(7, True), E(5.6, 3.6, 1.3, 0.6, 20)), 'white', (11, -5), -20, 2.0, (8, -8, 16))
    stg = stage('נח', n, cuts + dc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('mountain', 'Mount Ararat', mount, 'brown', (-8, -6, 8))] + parts + [
        P('ark', 'The ark', ark, 'wood', (-8, -8, 26)), dove]


def k_lech_lecha(n):
    half = union(above(ell(3.8, 2.6, 3.2, (0, 0, 0)), 0))
    row = lambda: union(cube(24, 6, 1.2, (0, 0, 0)), *[half.translate((x, 0, 1.2)) for x in (-8, 0, 8)])
    cuts, parts = [], []
    for k, y in enumerate((11.0, -5.0)):
        parts.append(P(f'halves-{k + 1}', 'Row of halves (heifer, goat, ram)', row().translate((0, y, TOP - 0.6)), 'red', (0, 10 if k == 0 else -10, 10)))
        cuts.append(cube(24 + 2 * FIT, 6 + 2 * FIT, 0.61, (0, y, TOP - 0.6)))
    oven = revolve([(0, 0), (3.8, 0), (2.8, 8), (1.8, 8), (1.8, 7.6), (0, 7.6)]).translate((-6, 3, TOP))
    smoke = union(sph(2.4, (-6, 3, TOP + 10)), sph(2.0, (-4.4, 3, TOP + 12.2)), sph(1.7, (-6.8, 3, TOP + 13.6)), cyl(2.6, 1.6, at=(-6, 3, TOP + 7.0)))
    torch_g = U(R(-0.9, 0, 0.9, 13), affinity.translate(flame(7, 4.6), 0, 12.5))
    torch, tc = fig('torch', 'A torch of fire', torch_g, 'flame', (6, 3), 0, 2.4, (8, 0, 24))
    birds = [fig(f'bird-{k + 1}', 'Dove' if k == 0 else 'Young pigeon', bird(6), 'grey', (x, 3), 90 if x > 0 else -90, 2.0, (x * 1.4, 0, 12)) for k, x in enumerate((-15.5, 15.5))]
    stg = stage('לך לך', n, cuts + tc + birds[0][1] + birds[1][1])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0))] + parts + [
        P('oven', 'Smoking oven', oven, 'clay', (-8, 0, 12)), P('smoke', 'Smoke', smoke, 'grey', (-8, 0, 30)), torch, birds[0][0], birds[1][0]]


def k_vayera(n):
    ax, ay = -8, 8
    stones = union(*[rounded_box(5.0, 4.6, 3.4, 0.8, (x, y, z)) for x, y, z in ((-2.6, -2.2, 0), (2.6, -2.2, 0), (0, 2.2, 0), (-2.6, 2.2, 0), (2.6, 2.2, 0), (-1.3, 0, 3.2), (1.6, 0.4, 3.2))])
    pg, hl = seat(ax, ay)
    altar = stones.translate((ax, ay, TOP)) - hl
    wood = union(*[cyl(9, 0.9, at=(0, 0, -4.5)).rotate((0, 90, a)).translate((ax, ay, TOP + 7.6 + k * 1.6)) for k, a in enumerate((10, -25, 40))])
    b, bc = cross('thicket', 'Thicket (two halves)', bush(15, 15), 'olive', (8, 8), 20, 2.2, (8, 10, 22))
    ram, rc = fig('ram', 'The ram, caught by its horns', beast('ram', 13, 6, 4.5), 'white', (0, 0), 40, 3.0, (-4, -10, 14))
    stg = stage('וירא', n, bc + rc, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('altar', 'Altar of stones', altar, 'stone', (-10, 4, 10)),
            P('wood', 'Wood for the offering', wood, 'wood', (-10, 4, 26))] + b + [ram]


def k_chayei_sarah(n):
    well = revolve([(4.6, 0), (6.6, 0), (6.6, 6.0), (4.6, 6.0)]).translate((-8, 7, TOP))
    water = cyl(4.0, 4.6 - FIT).translate((-8, 7, TOP))
    rivka = U(person(22, 6.6, hands=[(-4.4, 19.5), (3.6, 9)]), E(-4.6, 22.5, 2.4, 2.6), R(-5.4, 24.5, -3.8, 26))
    r_p, r_c = fig('rivka', 'Rivka with her jar', rivka, 'purple', (5, 9), -10, 2.6, (6, 10, 16))
    camel, c_c = fig('camel', 'One of Eliezer’s camels', beast('camel', 14, 6, 6.5), 'tan', (-5, -4), 0, 3.0, (-8, -10, 14))
    a = 40
    tray = cube(13, 7, 1.4) - union(cyl(1, 2.0, at=(-4, 0, 0.6)), cyl(1, 2.7, at=(0.5, 0, 0.6)), cyl(1, 2.7, at=(5.2, 0, 0.6)))
    pg, hl = seat(11, -5, h=0.8)
    tray = tray.rotate((0, 0, a)).translate((11, -5, TOP)) - hl
    ring = lambda r, w: revolve([(r - w, 0), (r, 0), (r, w * 1.4), (r - w, w * 1.4)])
    at = lambda x: tuple(np.add(_rotxy(x, 0, a), (11, -5))) + (TOP + 0.6,)
    nezem = ring(1.8, 0.7).translate(at(-4))
    br = [ring(2.5, 0.8).translate(at(x)) for x in (0.5, 5.2)]
    stg = stage('חיי שרה', n, r_c + c_c, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('well', 'Well', well, 'stone', (-10, 10, 10)),
            P('water', 'Water', water, 'water', (-10, 10, 2)), r_p, camel, P('tray', 'Gift tray', tray, 'wood', (10, -8, 8)),
            P('nose-ring', 'Nose ring (nezem)', nezem, 'gold', (10, -10, 20)),
            P('bracelet-1', 'Bracelet', br[0], 'gold', (12, -10, 22)), P('bracelet-2', 'Bracelet', br[1], 'gold', (14, -10, 24))]


def k_toldot(n):
    pg, hl = seat(-6, 8)
    tent = tent3d(14, 10, 11, (-6, 8, TOP)) - hl
    jacob, jc = fig('yaakov', 'Yaakov the shepherd', person(22, 6.4, hands=[(-4, 9), (4.2, 18)], hat='hood'), 'blue', (-1, -2), 0, 2.6, (-4, -8, 14))
    sheep = [fig(f'sheep-{k + 1}', 'Sheep', beast('sheep', 10, 5, 3.5), 'white', at, a, 2.6, ex) for k, (at, a, ex) in enumerate((((-12, -3), 20, (-12, -6, 10)), ((-6, -7), -10, (-6, -12, 8))))]
    esau, ec = fig('esav', 'Esav the hunter, with his bow', U(person(23, 6.8, hands=[(-5.5, 14), (4, 12)], legs=True), C(-6.5, 14, 4.2).difference(C(-5.0, 14, 3.6)).intersection(R(-12, 9, -5.2, 19))), 'tan', (10, 4), -15, 2.6, (10, 4, 16))
    deer, dc = fig('deer', 'A deer in the field', beast('deer', 10, 5, 6), 'brown', (11, -5), 160, 2.6, (12, -10, 12))
    stg = stage('תולדות', n, jc + ec + dc + sheep[0][1] + sheep[1][1], add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('tent', 'The tent', tent, 'cream', (-8, 10, 14)), jacob, sheep[0][0], sheep[1][0], esau, deer]


def k_vayetze(n):
    H = 36.0
    lad = U(R(-5.5, 0, -4.1, H), R(4.1, 0, 5.5, H), *[R(-5, y, 5, y + 1.2) for y in np.arange(3, H - 1, 4.0)])
    ladder, lc = fig('ladder', 'The ladder', lad, 'wood', (0, 9), 0, 2.8, (0, 6, 22), tabs=[(-5.4, -4.2), (4.2, 5.4)])
    angel_up = U(person(13, 4.6, hands=[(-1.5, 12.6), (2, 9.5)]), Polygon([(-2.2, 9.5), (-6.5, 13), (-5.5, 7)]), Polygon([(2.2, 9.5), (6.5, 13), (5.5, 7)]), R(-2.6, 12.0, -0.6, 14.4))
    angel_dn = U(person(13, 4.6, hands=[(-2.6, 7), (2.6, 7)]), Polygon([(-2.2, 9.5), (-6.5, 13), (-5.5, 7)]), Polygon([(2.2, 9.5), (6.5, 13), (5.5, 7)]))
    parts = []
    for k, (g, zx, lab, ex) in enumerate(((angel_up, 10.0, 'Angel going up with a prayer', (-6, -6, 20)), (angel_dn, 22.0, 'Angel coming down with the answer', (6, -6, 30)))):
        g = g.difference(C(0, 6.5, HOLE_R))
        m = stand_up(flat_figure(g, 2.0), 0, (0, 9 - 1.4 - 1.0, TOP + zx))
        parts.append(P(f'angel-{k + 1}', lab, m, 'white', ex, pm=extrude(g, 2.0)))
    lad_h = lad
    for zx in (10.0, 22.0):
        lad_h = lad_h.difference(C(0, zx + 6.5, HOLE_R))
    ladder['pm'] = extrude(U(lad_h, R(-5.4, -2.4, -4.2, 0.8), R(4.2, -2.4, 5.4, 0.8)), 2.8)
    ladder['mesh'] = stand_up(flat_figure(U(lad_h, R(-5.4, -2.4, -4.2, 0.8), R(4.2, -2.4, 5.4, 0.8)), 2.8), 0, (0, 9, TOP))
    rungs_need = [R(-5, zx + 4.5, 5, zx + 8.5) for zx in (10.0, 22.0)]
    lad2 = U(lad_h, *rungs_need).difference(U(C(0, 16.5, HOLE_R), C(0, 28.5, HOLE_R)))
    g_full = U(lad2, R(-5.4, -2.4, -4.2, 0.8), R(4.2, -2.4, 5.4, 0.8))
    ladder['pm'] = extrude(g_full, 2.8)
    ladder['mesh'] = stand_up(flat_figure(g_full, 2.8), 0, (0, 9, TOP))
    pins_ = [P(f'pin-{k + 1}', 'Pin', zpin(6.4).rotate((90, 0, 0)).translate((0, 9 + 1.4 + 0.6, TOP + z)), 'white', (0, -8, 10 + 8 * k), rot=(-90, 0, 0)) for k, z in enumerate((16.5, 28.5))]
    sleeper = U(E(0, 2, 9, 2), C(10, 2.6, 2.2)).intersection(R(-20, 0, 20, 10))
    yaakov = extrude(sleeper, 4.0).rotate((90, 0, 0)).translate((-2, 0, TOP))
    yaakov = above(ell(8.5, 3.2, 2.2, (-2, -2, TOP)), TOP)
    head = sph(2.2, (8.4, -2, TOP + 2.0))
    stone = rounded_box(4.6, 4, 2.2, 0.8, (8.4, -2, TOP))
    pg, hl = seat(-2, -2, h=1.6)
    yaakov = union(yaakov, head) - hl
    stg = stage('ויצא', n, lc, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), ladder, P('yaakov', 'Yaakov asleep', yaakov, 'blue', (-6, -10, 10)),
            P('stone', 'The stone under his head', stone, 'stone', (10, -10, 6))] + parts + pins_


def k_vayishlach(n):
    river = LineString([(x, -6 + 1.5 * math.sin(x / 4)) for x in np.linspace(-22, 22, 40)]).buffer(2.8).intersection(C(0, 0, 18.8))
    water = extrude(river, 1.6, TOP - 0.8)
    cut_r = extrude(river.buffer(FIT), 0.81, TOP - 0.8)
    wr = person(22, 6.8, hands=[(-6.0, 15.5), (6.0, 15.5)], legs=True)
    gap = 1.5 + FIT
    a = wr.difference(R(-gap, 11, gap, 30))
    b = wr.difference(R(-gap, -5, gap, 11))
    pa, ca = fig('yaakov', 'Yaakov', a, 'blue', (0, 7), 0, 3.0, (-10, 0, 16))
    x0, _, x1, _ = b.intersection(R(-50, 0, 50, 1)).bounds
    pb, cb = fig('man', 'The man (an angel)', b, 'white', (0, 7), 90, 3.0, (10, 0, 22), tabs=[(x0 + 0.4, -gap - 0.3), (gap + 0.3, x1 - 0.4)])
    sun_g = U(C(0, 0, 4.6), *[L([_rotxy(0, 5.6, a_), _rotxy(0, 7.6, a_)], 1.2) for a_ in (-60, -30, 0, 30, 60)]).intersection(R(-20, 0, 20, 20))
    sp, sc = fig('dawn', 'Dawn rising', sun_g, 'yellow', (0, 16.0), 0, 2.0, (0, 10, 10))
    stg = stage('וישלח', n, [cut_r] + ca + cb + sc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('river', 'The Yabbok', water, 'water', (0, -6, 8)), pa, pb, sp]


def k_vayeshev(n):
    body = person(26, 7.0, hands=[(-4.6, 12), (4.6, 12)], legs=True)
    coat = U(Polygon([(-4.6, 0.6), (4.6, 0.6), (3.2, 19.8), (-3.2, 19.8)]), E(0, 19.6, 3.6, 1.6),
             L([(-2.6, 19), (-4.6, 12.4)], 2.6), L([(2.6, 19), (4.6, 12.4)], 2.6))
    holes = U(C(0, 6, HOLE_R), C(0, 15, HOLE_R))
    body_h = body.difference(holes)
    coat_h = coat.difference(holes)
    jos, jc = fig('yosef', 'Yosef', body_h, 'skin', (-5, 6), 0, 2.4, (-6, 0, 10))
    stripes = U(*[R(-6, y, 6, y + 1.6) for y in (2.6, 9.6, 17.0)]).intersection(coat_h)
    coat_p = P('coat', 'The ketonet passim, to the palms and the soles', stand_up(flat_figure(coat_h, 1.6), 0, (-5, 4.0, TOP)), 'red', (-6, -14, 14), pm=extrude(coat_h, 1.6))
    stripe_p = P('stripes', 'Stripes for the coat', stand_up(flat_figure(stripes, 0.6), 0, (-5, 2.9, TOP)), 'yellow', (-6, -20, 18), pm=extrude(stripes, 0.6))
    pins_ = [P(f'pin-{k + 1}', 'Pin', zpin(4.2).rotate((90, 0, 0)).translate((-5, 7.4, TOP + z)), 'white', (0, 8, 6 + 4 * k), rot=(-90, 0, 0)) for k, z in enumerate((6, 15))]
    bro, bc = fig('brother', 'A brother, in a short work tunic', U(person(24, 6.6, hands=[(-5, 18), (4, 11)], legs=True), R(-5.6, 17, -4.6, 26)), 'tan', (9, 6), -20, 2.6, (10, 4, 14))
    sh, sc = fig('sheep', 'Sheep', beast('sheep', 10, 5, 3.5), 'white', (10, -4), 160, 2.6, (12, -8, 8))
    stg = stage('וישב', n, jc + bc + sc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), jos, coat_p, stripe_p] + pins_ + [bro, sh]


def k_miketz(n):
    nile = R(-25, 10, 25, 17).intersection(C(0, 0, 18.8))
    water = extrude(nile, 1.6, TOP - 0.8)
    cut_n = extrude(nile.buffer(FIT), 0.81, TOP - 0.8)
    reeds, rc = cross('reeds', 'Marsh grass (achu)', stalks(13, 6, 'ear', 9), 'lily', (-12, 5), 15, 2.0, (-12, 6, 22))
    reeds2, rc2 = cross('reeds2', 'Marsh grass (achu)', stalks(11, 5, 'ear', 8), 'lily', (12, 5), -10, 2.0, (12, 6, 20))
    fat, fc = fig('fat-cow', 'Fat cow', beast('cow', 14, 8.5, 5), 'white', (-1, -1), 0, 3.0, (-6, -6, 14))
    lean, lc = fig('lean-cow', 'Lean cow', beast('cow', 14, 4.2, 6.5), 'brown', (3, -6.5), 180, 2.4, (6, -12, 10))
    stg = stage('מקץ', n, [cut_n] + rc + rc2 + fc + lc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('nile', 'The Nile', water, 'water', (0, 10, 6))] + reeds + reeds2 + [fat, lean]


def k_vayigash(n):
    road = extrude(U(R(-19, -4, 19, -1), R(-19, 8, 19, 11)).intersection(C(0, 0, 18.8)), 0.61, TOP - 0.6)
    bed = cube(22, 10, 5, (0, 3.5, TOP + 3.8)) - cube(20, 8, 5, (0, 3.5, TOP + 5.0))
    for x in (-7, 7):
        bed = bed - cyl(14, HOLE_R, at=(0, 0, -7), seg=32).rotate((90, 0, 0)).translate((x, 3.5, TOP + 4.6))
    wheels = []
    for k, (x, y) in enumerate(((-7, -1.7), (7, -1.7), (-7, 10.3), (7, 10.3))):
        w = (cyl(1.6, 4.4) - cyl(3, 1.85, at=(0, 0, -0.5)) - union(*[cube(1.4, 2.6, 2, (0, 0, -0.5)).translate((2.6, 0, 0)).rotate((0, 0, a)) for a in (0, 90, 180, 270)]))
        w = w.rotate((90, 0, 0)).translate((x, y, TOP + 4.6))
        wheels.append(P(f'wheel-{k + 1}', 'Wheel', w, 'wood', (x * 0.4, -8 if y < 3 else 8, 6), rot=(90, 0, 0)))
    axles = [P(f'axle-{k + 1}', 'Axle', cyl(14, PIN_R, at=(0, 0, -7), seg=32).rotate((90, 0, 0)).translate((x, 3.5, TOP + 4.6)), 'white', (x, 0, 18), rot=(90, 0, 0)) for k, x in enumerate((-7, 7))]
    sacks = union(rounded_box(5, 4, 4, 1.4, (-5, 3.5, TOP + 5)), rounded_box(5, 4, 5, 1.4, (1, 3.5, TOP + 5)), rounded_box(4, 4, 3.5, 1.2, (6, 3.5, TOP + 5)))
    stg = stage('ויגש', n, [road])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('wagon', 'The wagon (agalah)', bed, 'wood', (0, 0, 14))] + wheels + axles + [
        P('load', 'Food for the journey', sacks, 'tan', (0, 0, 30))]


def k_vayechi(n):
    yaakov = U(person(28, 9, hands=[(9.5, 12.6), (-9.5, 12.6)], hat='hood'))
    yp, yc = fig('yaakov', 'Yaakov, hands crossed', yaakov, 'navy', (0, 8), 0, 3.0, (0, 10, 20))
    boys = [fig(f'boy-{k + 1}', lab, person(h, 5.2), col, (x, 3), 0, 2.4, (x * 1.4, -6, 10)) for k, (x, h, lab, col) in
            enumerate(((-9.5, 11.0, 'Ephraim, the younger, at Yaakov’s right', 'green'), (9.5, 11.0, 'Menashe, the firstborn, at Yaakov’s left', 'orange')))]
    stg = stage('ויחי', n, yc + boys[0][1] + boys[1][1])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), yp, boys[0][0], boys[1][0]]


def k_shemot(n):
    b, bc = cross('bush', 'Thorn bush (sneh)', bush(18, 20), 'olive', (0, 6), 0, 2.4, (0, 4, 26))
    parts, cuts = list(b), list(bc)
    for k, a in enumerate((45, 135, 225, 315)):
        x, y = _rotxy(7.2, 0, a)
        p, c = fig(f'flame-{k + 1}', 'Flame', flame(9 + (k % 2) * 3, 4.6), 'flame' if k % 2 else 'orange', (x, 6 + y), a + 90, 1.8, (x * 2.4, y * 2.4, 16 + 4 * k))
        parts.append(p)
        cuts += c
    sandal = above(ell(2.0, 4.0, 0.9, (0, 0, 0)), 0)
    sand = [P(f'sandal-{k + 1}', 'Moshe’s sandal', sandal.translate((x, -6, TOP)), 'brown', (x * 2, -10, 6)) for k, x in enumerate((-12, -8))]
    stg = stage('שמות', n, cuts)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0))] + parts + sand


def k_vaera(n):
    flax, fc = cross('flax', 'Flax in bud (giv’ol)', stalks(18, 6, 'bud', 9), 'lily', (-8, 6), 10, 2.0, (-10, 6, 24))
    barley, bc = cross('barley', 'Barley in the ear (aviv)', stalks(15, 5, 'ear', 8), 'wheat', (8, 7), -15, 2.0, (10, 6, 22))
    wheat, wc = fig('wheat', 'Wheat, not yet up', stalks(5, 6, 'ear', 10), 'leaf', (0, -6), 0, 2.0, (0, -10, 10))
    hail = [P(f'hailstone-{k + 1}', 'Hailstone', sph(2.4, (x, y, TOP + 1.8)), 'ice', (x, y, 30 + 4 * k)) for k, (x, y) in enumerate(((-13, -3), (12, -4), (3, 14)))]
    dents = [cyl(1.0, 1.6, at=(x, y, TOP - 0.6)) for x, y in ((-13, -3), (12, -4), (3, 14))]
    hail = [P(h['name'], h['label'], h['mesh'].translate((0, 0, -0.6)), 'ice', h['explode']) for h in hail]
    stg = stage('וארא', n, fc + bc + wc + dents)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0))] + flax + barley + [wheat] + hail


def k_bo(n):
    post = U(R(-0.9, 0, 0.9, 14), L([(0, 13), (-2.2, 16.5)], 1.4), L([(0, 13), (2.2, 16.5)], 1.4))
    posts = [fig(f'post-{k + 1}', 'Forked post', post, 'wood', (x, 4), 90, 2.4, (x * 1.6, 0, 10)) for k, x in enumerate((-13, 13))]
    lamb = union(ell(7, 3.6, 3.4), ell(2.4, 1.8, 2.0, (8, 0, 1.6)), *[ell(1.0, 1.0, 3.0, (x, y, -3)) for x in (-4.6, 4.2) for y in (-1.6, 1.6)])
    lamb = lamb - cyl(30, HOLE_R, at=(0, 0, -15), seg=32).rotate((0, 90, 0))
    lamb = lamb.translate((0, 4, TOP + 15))
    spit = cyl(32, PIN_R, at=(0, 0, -16), seg=32).rotate((0, 90, 0)).translate((0, 4, TOP + 15))
    fire, fc = cross('fire', 'Fire', U(flame(8, 5), affinity.translate(flame(6, 4), -3.5, 0), affinity.translate(flame(6.5, 4), 3.5, 0)), 'flame', (0, 4), 0, 1.8, (0, 0, 8))
    logs = union(*[cyl(10, 1.0, at=(0, 0, -5)).rotate((0, 90, a)).translate((0, 4, TOP + 1.0)) for a in (30, -30, 90)])
    matzah = (cyl(1.0, 4.6) - union(*[cyl(2, 0.4, at=(x, y, 0.5)) for x in (-2, 0, 2) for y in (-2, 0, 2)])).translate((10, -6, TOP))
    stg = stage('בא', n, posts[0][1] + posts[1][1] + fc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), posts[0][0], posts[1][0],
            P('lamb', 'The Pesach lamb, whole', lamb, 'tan', (0, 0, 22), rot=(0, 0, 0)),
            P('spit', 'Spit', spit, 'white', (0, -8, 32), rot=(0, 90, 0)), P('logs', 'Logs', logs, 'brown', (0, 8, 4))] + fire + [
            P('matzah', 'Matzah', matzah, 'cream', (10, -10, 6))]


def k_beshalach(n):
    dew = extrude(U(*[E(x, y, 9, 5) for x, y in ((-6, 4), (6, 6), (0, 11), (-3, -4), (8, -3))]).intersection(C(0, 0, 18.5)), 1.0, TOP)
    seeds_at = [(-8, 2), (-5, 6), (-2, 1), (2, 9), (6, 4), (9, 7), (-4, 11), (7, -2), (4, 0), (-9, -3), (0, 5)]
    for x, y in seeds_at:
        dew = union(dew, sph(0.9, (x, y, TOP + 1.0), seg=16))
    pg, hl = seat(-11, 9)
    jar = revolve([(0, 0), (4.6, 0), (5.4, 4.5), (4.4, 9), (3.0, 10.5), (3.2, 12.4), (2.4, 12.4), (2.3, 10.8), (3.6, 9.2), (4.4, 4.5), (3.8, 1.6), (0, 1.6)]).translate((-11, 9, TOP + 1.0))
    jar = jar - hl.translate((0, 0, 1.0)) if False else jar
    lid = drop_lid(3.3).translate((-11, 9, TOP + 13.4))
    wafer = (cyl(1.2, 5.2) - union(*[cyl(2, 0.5, at=(x, y, 0.8)) for x, y in ((-2, 1), (1.5, -1), (0, 2.5), (2.6, 1.6), (-1, -2.4))])).translate((10, -5, TOP + 1.0))
    stg = stage('בשלח', n)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('dew', 'The layer of dew, with manna on it', dew, 'white', (0, 0, 8)),
            P('jar', 'The jar kept before God', jar, 'clay', (-12, 10, 18)), P('lid', 'Lid', lid, 'clay', (-12, 10, 34), rot=(180, 0, 0)),
            P('wafer', 'Wafer made with honey (tzapichit)', wafer, 'wheat', (12, -8, 16))]


def k_yitro(n):
    pg, hl = seat(0, 5, h=4)
    mtn = revolve([(0, 0), (13, 0), (11, 3), (8, 7), (6, 10), (3.4, 14), (1.8, 16), (0, 16)], seg=9).rotate((0, 0, 7)).translate((0, 5, TOP)) - hl
    mtn = mtn - cyl(3.1, HOLE_R, at=(0, 5, TOP + 13.0), seg=32)
    ring = (cyl(1.0, 15.3) - cyl(3, 13.7, at=(0, 0, -1))).scale((1, 0.9, 1)).translate((0, 5, 0))
    fence = union(*[cyl(5, 0.7, at=(14.5 * math.cos(a), 5 + 14.5 * math.sin(a) * 0.9, 0)) for a in np.linspace(0, 2 * math.pi, 22, endpoint=False)], ring, ring.translate((0, 0, 3.2)))
    fence = fence.trim_by_plane((0, 1, 0), -8.0).translate((0, 0, TOP))
    pts = [(math.sin(t) * 5, 0, math.cos(t) * 4) for t in np.linspace(0.2, 2.6, 10)]
    horn = union(*[Manifold.batch_hull([sph(0.6 + 0.12 * k, pts[k], seg=16), sph(0.6 + 0.12 * (k + 1), pts[k + 1], seg=16)]) for k in range(len(pts) - 1)])
    hz = horn.bounding_box()
    horn = horn.translate((-2.5, 2.2, TOP + 16.0 - hz[2] - 0.6))
    cloud = union(*[sph(r, (x, 5 + y, TOP + 22 + z)) for x, y, z, r in ((0, 0, 0, 4), (4, 1, -1, 3), (-4, -1, -0.5, 3.2), (2, -2, 1.5, 2.6))])
    cloud = cloud - cyl(6, HOLE_R, at=(0, 5, TOP + 17.5), seg=32)
    post = cyl(10, PIN_R, at=(0, 5, TOP + 13.0), seg=32)
    stg = stage('יתרו', n, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('mountain', 'Mount Sinai', mtn, 'brown', (0, 0, 12)),
            P('boundary', 'The boundary fence', fence, 'wood', (0, -6, 4)), P('post', 'Pin', post, 'white', (0, 0, 30)),
            P('shofar', 'The horn (yovel)', horn, 'cream', (-6, -4, 36), rot=(90, 0, 0)), P('cloud', 'Cloud on the mountain', cloud, 'grey', (0, 0, 46), rot=(180, 0, 0))]


def k_mishpatim(n):
    frame_g = U(R(-8, 0, -4, 22), R(4, 0, 8, 22), R(-9, 22, 9, 24.6)).difference(C(6, 13, HOLE_R))
    frame, fc = fig('doorway', 'Doorway and doorposts', frame_g, 'wood', (-2, 8), 0, 3.0, (0, 10, 18), tabs=[(-7.9, -4.1), (4.1, 7.9)])
    door_g = R(-3.7, 0.3, 7.6, 21.6).difference(C(6, 13, HOLE_R))
    door = P('door', 'Door', stand_up(flat_figure(door_g, 1.6), 0, (-2, 5.5, TOP)), 'brown', (0, -6, 12), pm=extrude(door_g, 1.6))
    awl = union(cyl(5, 1.1), cyl(5, PIN_R - 0.1, 0.4, at=(0, 0, 5)))
    awl = awl.rotate((-90, 0, 0)).translate((4, -0.3, TOP + 13))
    servant, sc = fig('servant', 'The servant', person(22, 6.4, legs=True), 'tan', (-11, -2), 20, 2.6, (-10, -8, 12))
    judges = [fig(f'judge-{k + 1}', 'Judge (elohim)', person(23, 7, hat='turban'), 'navy', (x, -4), a, 2.6, (x * 1.2, -10, 14)) for k, (x, a) in enumerate(((9, -10), (15, -25)))]
    stg = stage('משפטים', n, fc + sc + judges[0][1] + judges[1][1])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), frame, door, P('awl', 'The awl (martzea), through the door into the post', awl, 'silver', (8, -14, 14), rot=(90, 0, 0)), servant, judges[0][0], judges[1][0]]


def k_terumah(n):
    ark = cube(24, 14, 13, (0, 4, TOP)) - cube(22, 12, 13, (0, 4, TOP + 1.6))
    ring = (cyl(2.4, 2.4, at=(0, 0, -1.2)) - cyl(3, HOLE_R + 0.1, at=(0, 0, -1.5), seg=32)).rotate((0, 90, 0))
    ark = union(ark, *[ring.translate((x, y, TOP + 3.6)) for x in (-8, 8) for y in (4 - 7 - 1.3, 4 + 7 + 1.3)])
    poles = [P(f'pole-{k + 1}', 'Carrying pole', cyl(34, PIN_R, at=(0, 0, -17), seg=32).rotate((0, 90, 0)).translate((0, y, TOP + 3.6)), 'gold', (0, -12 if k == 0 else 12, 0), rot=(0, 90, 0)) for k, y in enumerate((4 - 8.3, 4 + 8.3))]
    kap = cube(24, 14, 1.8, (0, 4, TOP + 13))
    ker = U(person(12, 4.6, hands=[(5.0, 9), (5.0, 10)]), Polygon([(-1.6, 9), (8, 15.5), (9.6, 12.4), (1.4, 7)])).intersection(R(-50, 0, 50, 50))
    parts = []
    for k, (x, flip) in enumerate(((-7, False), (7, True))):
        g = affinity.scale(ker, -1, 1, origin=(0, 0)) if flip else ker
        g2 = U(g, R(-1.8, -1.4, 1.8, 0.8))
        parts.append(P(f'keruv-{k + 1}', 'Keruv', stand_up(flat_figure(g2, 2.2), 90, (x, 4, TOP + 14.8)), 'gold', (x * 1.4, 0, 26), pm=extrude(g2, 2.2)))
        kap = kap - cube(2.2 + 2 * FIT, 3.6 + 2 * FIT, 1.41, (x, 4, TOP + 13.4))
    stg = stage('תרומה', n, [cube(24 + 2 * FIT, 14 + 2 * FIT, 0.61, (0, 4, TOP - 0.6))])
    d = (0, 0, -0.6)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('ark', 'The ark', ark.translate(d), 'gold', (0, 0, 6)),
            P('kaporet', 'The kaporet (cover)', kap.translate(d), 'gold', (0, 0, 18))] + [dict(p, mesh=p['mesh'].translate(d)) for p in parts] + [
            dict(p, mesh=p['mesh'].translate(d)) for p in poles]


def k_tetzaveh(n):
    pg, hl = seat(-3, 4, h=2.4)
    stand = revolve([(0, 0), (5, 0), (4.4, 1.2), (1.6, 2.4), (1.4, 8), (3.6, 9.4), (3.6, 10.4), (0, 10.4)]).translate((-3, 4, TOP)) - hl
    lamp = lamp3d((0, 0, 0), 0).translate((-3, 4, TOP + 10.4))
    fl = extrude(flame(5.5, 3.0), 1.2).rotate((90, 0, 0)).translate((1.3, 4 + 0.6, TOP + 10.4 + 2.1))
    jug = revolve([(0, 0), (3.4, 0), (4.0, 3.5), (2.4, 7.5), (1.6, 8.5), (2.0, 10), (1.4, 10), (1.2, 8.6), (1.6, 7.5), (3.0, 3.5), (2.6, 1.2), (0, 1.2)]).translate((10, -3, TOP))
    mortar = (revolve([(0, 0), (5, 0), (5.6, 5), (0, 5)]) - revolve([(0, 1.4), (4.0, 1.4), (4.6, 5.1), (0, 5.1)])).translate((-11, -4, TOP))
    olives = union(*[ell(1.3, 1.0, 1.0, (x, y, 2.2)) for x, y in ((-1.5, 0.8), (1.2, 1.4), (0, -1.5), (2.0, -0.5))]).translate((-11, -4, TOP))
    star = Polygon([_rotxy(0, 2.4 if k % 2 == 0 else 1.0, 36 * k) for k in range(10)])
    moon_g = U(C(0, 7, 6).difference(C(2.6, 8.4, 5.4)), affinity.translate(star, 5.6, 11), R(-3.0, 0, -1.4, 3))
    mn, mc = fig('moon', 'Moon and star: it burns from evening till morning', moon_g, 'yellow', (8, 12), -15, 2.0, (10, 12, 20), tabs=[(-2.9, -1.5)])
    stg = stage('תצוה', n, mc, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('stand', 'Lamp stand', stand, 'gold', (-4, 4, 8)),
            P('lamp', 'Lamp, burning from evening to morning', lamp, 'clay', (-4, 4, 18), inlays=[('flame', fl, 'flame')]),
            P('jug', 'Jug of pure pressed oil', jug, 'clay', (12, -6, 12)),
            P('mortar', 'Mortar', mortar, 'stone', (-12, -6, 6)), P('olives', 'Crushed olives', olives, 'olive', (-12, -6, 18)), mn]


def k_ki_tisa(n):
    ped = rounded_box(16, 9, 4, 1.0, (0, 6, TOP))
    calf, cc = fig('calf', 'The calf', beast('cow', 13, 6, 5), 'gold', (0, 6), 0, 3.6, (0, 4, 18), z=TOP + 4)
    ped = ped
    for c in cc:
        ped = ped - c.translate((0, 0, 4))
    pg, hl = seat(0, 6, h=2)
    ped = ped - hl
    bag = union(ell(4.4, 4.0, 4.6, (0, 0, 4.4)), Manifold.batch_hull([cyl(0.6, 1.8, at=(0, 0, 8.0)), cyl(0.6, 2.4, at=(0, 0, 9.4))]))
    bag = above(bag, 0).translate((-10, -4, TOP))
    rings = [P(f'earring-{k + 1}', 'Gold earring', (cyl(0.9, 1.8) - cyl(2, 1.0, at=(0, 0, -0.5))).translate((x, y, TOP)), 'gold', (x, y - 6, 8)) for k, (x, y) in enumerate(((7, -5), (10.5, -3), (9, -7.5)))]
    stg = stage('כי תשא', n, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('pedestal', 'Pedestal', ped, 'stone', (0, 6, 6)), calf,
            P('bag', 'The bag (charitim) the gold was collected in', bag, 'tan', (-12, -8, 14))] + rings


def k_vayakhel(n):
    pg, hl = seat(0, 5, h=3)
    base = (revolve([(0, 0), (7, 0), (6.4, 1.6), (2.4, 3), (2.0, 8), (4, 9.4), (0, 9.4)]).translate((0, 5, TOP)) - hl)
    basin = revolve([(0, 0), (3.8, 0), (8.8, 4.6), (9.6, 6.2), (8.8, 6.2), (8.0, 5.0), (3.6, 1.4), (0, 1.4)]).translate((0, 5, TOP + 9.4))
    mirror_g = U(C(0, 8, 3.6), R(-0.8, 0, 0.8, 5))
    parts, cuts = [], []
    for k, (x, y, a) in enumerate(((-12, -3, 30), (12, -3, -30), (-13, 9, 70))):
        p, c = fig(f'mirror-{k + 1}', 'Copper mirror', mirror_g, 'copper', (x, y), a, 1.6, (x * 1.5, y - 4, 10 + 3 * k))
        parts.append(p)
        cuts += c
    spindle = union(cyl(14, 0.6, at=(0, 0, 0)), cyl(1.4, 2.4, 1.2, at=(0, 0, 1.0)), ell(1.8, 1.8, 3.0, (0, 0, 7)))
    spindle = spindle.translate((12, 10, TOP))
    stg = stage('ויקהל', n, cuts + [hole((12, 10, TOP), 1.0, r=0.8)], add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('stand', 'Stand of the laver', base, 'copper', (0, 0, 8)),
            P('laver', 'The laver (kiyor)', basin, 'copper', (0, 0, 22))] + parts + [P('spindle', 'Spindle with goats’ hair', spindle.translate((0, 0, -1)), 'brown', (14, 12, 14))]


def k_pekudei(n):
    pg, hl = seat(0, 4, h=3)
    tent = house3d(22, 13, 9, roof=1, at=(0, 4, TOP)) - hl - cyl(4, HOLE_R, at=(0, 4, TOP + 7.5), seg=32)
    post = cyl(10.8, PIN_R, at=(0, 4, TOP + 7.5), seg=32)
    fl = union(*[Manifold.cylinder(6, 1.8, 0.2, 24).translate((x, 4, TOP + 17)) for x in (-1.4, 1.4)], sph(1.9, (0, 4, TOP + 17.5)))
    fl = fl - cyl(3.0, HOLE_R, at=(0, 4, TOP + 15.5), seg=32)
    blobs = ((0, 0, 0, 7.0), (6, 0, -1.2, 5.0), (-6, 0, -1.0, 5.2), (3, 3, 2.4, 4.2), (-3, -3, 2.2, 4.2))
    shell = union(*[sph(r, (x, 4 + y, TOP + 20 + z)) for x, y, z, r in blobs]) - union(*[sph(r - 1.4, (x, 4 + y, TOP + 20 + z)) for x, y, z, r in blobs])
    skirt = cyl(8.0, 7.0, at=(0, 4, TOP + 9.8)) - cyl(9, 5.8, at=(0, 4, TOP + 9.0))
    cloud = above(union(shell - cyl(20, 6.3, at=(0, 4, TOP + 5)), skirt), TOP + 9.8)
    stg = stage('פקודי', n, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('mishkan', 'The Mishkan', tent, 'cream', (0, 0, 8)),
            P('post', 'Pin', post, 'white', (0, 0, 20)), P('fire', 'Fire inside the cloud', fl, 'flame', (0, 0, 32)),
            P('cloud', 'The cloud, by day and by night', cloud, 'milk', (0, 0, 46))]


def k_vayikra(n):
    hearth = union(*[rounded_box(4, 4, 4.2, 1.0, (x, y, TOP)) for x, y in ((-12, 2), (-4, 2), (-8, 9)) ])
    hearth2 = union(*[rounded_box(4, 4, 3.0, 1.0, (x, y, TOP)) for x, y in ((5, 6), (13, 6), (9, -1))])
    griddle = (cyl(1.6, 7.8) - cyl(1, 6.8, at=(0, 0, 0.9))).translate((-8, 4.4, TOP + 4.2))
    griddle = union(griddle, cube(2, 6, 0.9, (-8, -4.4, TOP + 4.2)).translate((0, 0, 0)))
    cakes = union(*[cyl(0.9, 2.6, at=(x, y, 0)) for x, y in ((-2.6, 0.6), (2.4, 1.6), (0, -2.8))]).translate((-8, 4.4, TOP + 5.1))
    pot = (revolve([(0, 0), (5.6, 0), (6.4, 8.5), (5.4, 8.5), (4.6, 1.4), (0, 1.4)])).translate((9, 3.6, TOP + 3.0))
    dough = union(*[sph(1.7, (x, y, 0)) for x, y in ((-1.6, 0), (1.6, 0.4), (0, 1.8), (0.2, -1.6))]).translate((9, 3.6, TOP + 5.6))
    stg = stage('ויקרא', n)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('hearth-1', 'Hearth stones', hearth, 'stone', (-8, 0, 4)),
            P('hearth-2', 'Hearth stones', hearth2, 'stone', (8, 0, 4)),
            P('griddle', 'Machavat: a flat griddle, baked ON it', griddle, 'iron', (-8, 0, 16)), P('cakes', 'Flat cakes', cakes, 'wheat', (-8, 0, 28)),
            P('pot', 'Marcheshet: a deep pan, made IN it', pot, 'iron', (8, 0, 18)), P('dough', 'Dough in oil', dough, 'wheat', (8, 0, 32))]


def k_tzav(n):
    pouch = cube(10, 10, 16, (0, 7, TOP)) - cube(6.9, 6.9, 16, (0, 7, TOP + 1.4))
    gems = union(*[sph(0.9, (x, 7 - 5, TOP + z), seg=16) for x in (-2.8, 0, 2.8) for z in (4, 7, 10, 13)])
    loop = (cyl(1.0, 2.0) - cyl(2, 1.1, at=(0, 0, -0.5))).rotate((90, 0, 0))
    chains = union(*[loop.translate((x, 7 + 0.5, TOP + 17.6)) for x in (-4.0, 4.0)], *[cube(1.2, 1.0, 0.6, (x, 7, TOP + 16)) for x in (-4.0, 4.0)])
    parts = [P('stage', 'Stage', stage('צו', n), 'stage', (0, 0, 0)),
             P('choshen', 'The choshen, folded double into a pouch', pouch, 'gold', (0, 0, 10), inlays=[('stones', gems, 'red')]),
             P('chains', 'Rings for the chains', chains, 'gold', (0, 0, 40), rot=(-90, 0, 0))]
    letters = 'אבגדהוזחטיכלמנסעפצקרשת'
    for k, ch in enumerate(letters):
        t = cube(6.4, 6.4, 1.0) - Manifold.extrude(text_shape(ch, 3.6, 0, 0, max_w=4.6), 0.41).translate((0, 0, 0.6))
        if k == 0:
            m, ex, lab = t.rotate((0, 0, 15)).translate((-9, -5, TOP)), (-10, -8, 8), 'Alef, called “ur”'
        elif k == 21:
            m, ex, lab = t.rotate((0, 0, -15)).translate((9, -5, TOP)), (10, -8, 8), 'Tav, called “tam”'
        else:
            m, ex, lab = t.translate((0, 7, TOP + 1.4 + 1.02 * (20 - k))), (0, 0, 14 + 1.4 * (20 - k)), f'Letter {ch}'
        parts.append(P(f'tile-{k + 1}', lab, m, 'cream', ex))
    return parts


def k_shemini(n):
    pg, hl = seat(0, 9, h=3)
    altar = union(rounded_box(14, 10, 9, 0.8, (0, 9, TOP)), *[cube(2, 2, 2, (x, 9 + y, TOP + 9)) for x in (-6, 6) for y in (-4, 4)]) - hl
    coals = union(*[sph(1.3, (x, 9 + y, TOP + 9.2), seg=16) for x, y in ((-2, 0), (1.5, 1), (0, -2), (3, -1.5))])
    parts = []
    for k, (x, y, a) in enumerate(((-9, -4, 200), (9, -4, -20))):
        pan = union(cyl(1.8, 4.2) - cyl(2, 3.4, at=(0, 0, 0.8)), cube(9, 1.6, 1.0, (8, 0, 0.6))).rotate((0, 0, a)).translate((x, y, TOP))
        pan = pan - pl.slot(4.4, 1.8, 0.82, (x, y), 0).translate((0, 0, 0.81))
        parts.append(P(f'firepan-{k + 1}', 'Firepan (machtah)', pan, 'copper', (x * 1.2, y - 6, 8)))
        f, _ = fig(f'strange-fire-{k + 1}', 'Strange fire, brought from outside', flame(8, 4.6), 'flame', (x, y), 0, 1.8, (x, y - 6, 22), z=TOP + 0.8, depth=0.8)
        parts.append(f)
    stg = stage('שמיני', n, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('altar', 'The altar, with fire from God', altar, 'copper', (0, 6, 6)),
            P('coals', 'Coals', coals, 'red', (0, 6, 22))] + parts


def k_tazria(n):
    pg, hl = seat(-6, 9)
    tent = tent3d(15, 11, 11, (-6, 9, TOP)) - hl
    patient, pc = fig('patient', 'The person, at home', person(18, 6, hands=[(-4.6, 9), (4.6, 9)]), 'tan', (-6, 1.5), 0, 2.4, (-8, -6, 10))
    kohen, kc = fig('kohen', 'The kohen, who goes to them', person(24, 6.8, hat='turban'), 'white', (10, -1), -40, 2.6, (12, -6, 16))
    path = extrude(U(*[E(x, y, 2.4, 1.6, 20) for x, y in ((2, -2), (5.5, -3.6), (-1.5, -0.8))]), 1.0, TOP - 0.4)
    stg = stage('תזריע', n, pc + kc + [extrude(U(*[E(x, y, 2.4 + FIT, 1.6 + FIT, 20) for x, y in ((2, -2), (5.5, -3.6), (-1.5, -0.8))]), 0.41, TOP - 0.4)], add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('tent', 'Their tent', tent, 'cream', (-8, 10, 14)), patient, kohen,
            P('path', 'Stepping stones', path, 'stone', (2, -4, 4))]


def k_metzora(n):
    W, D, Hh = 26, 14, 14
    pg, hl = seat(0, 6, h=3)
    house = cube(W, D, Hh, (0, 6, TOP)) - cube(W - 3, D - 3, Hh, (0, 6, TOP + 1.2)) - hl
    house = house - cube(5, 3, 8, (0, 6 - D / 2, TOP - 0.01))
    holes_ = [(-7.5, 7.5), (7.5, 5.0)]
    for x, z in holes_:
        house = house - cube(6 + 2 * FIT, 3, 4 + 2 * FIT, (x, 6 - D / 2 + 0.4, TOP + z))
    for z in (2.5, 7.0, 11.5):
        house = house - cube(W + 1, 0.6, 0.5, (0, 6 - D / 2, TOP + z))
    sick = cube(6, 1.5, 4, (0, 0, 0)) - union(*[ell(0.9, 0.8, 0.8, (x, -0.75, z)) for x, z in ((-1.4, 1.2), (1.2, 2.6), (0.4, 1.0))])
    sick = sick.translate((-7.5, 6 - D / 2 + 0.75, TOP + 7.5))
    gr = union(*[ell(0.9, 0.8, 0.8, (x, -0.75, z)) for x, z in ((-1.4, 1.2), (1.2, 2.6), (0.4, 1.0))])
    newst = cube(6, 1.5, 4, (7.5, 6 - D / 2 + 0.75, TOP + 5.0))
    pile = union(*[rounded_box(4.2, 3, 2.6, 0.7, (x, y, TOP)) for x, y in ((-12, -6), (-9, -7.5), (-10.5, -5.0))])
    stg = stage('מצורע', n, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('house', 'The house', house, 'stone', (0, 6, 6)),
            P('sick-stone', 'Stone with sunken hollows (sheka’arurot)', sick, 'olive', (-10, -14, 12), rot=(90, 0, 0)),
            P('new-stone', 'New stone, to put in its place', newst, 'cream', (10, -14, 10), rot=(90, 0, 0)),
            P('rubble', 'Stones taken out', pile, 'stone', (-10, -8, 4))]


def k_acharei_mot(n):
    cliff = Manifold.batch_hull([cube(14, 12, 0.1, (8, 9, TOP)), cube(11, 7, 0.1, (8.5, 10, TOP + 12))])
    pg, hl = seat(8, 9)
    goat1, g1 = fig('goat-for-god', 'The goat for God', beast('goat', 11, 5.5, 4.5), 'brown', (-8, 6), 10, 2.6, (-10, 6, 12))
    goat2, g2 = fig('goat-azazel', 'The goat sent off to Azazel', beast('goat', 10, 5.0, 4.0), 'black', (8.5, 10.5), 180, 2.6, (10, 12, 30), z=TOP + 12)
    cliff = cliff - hl
    for c in g2:
        cliff = cliff - c.translate((0, 0, 12))
    urn = revolve([(0, 0), (3.6, 0), (4.0, 6), (3.0, 7.0), (2.4, 7.0), (2.6, 6), (2.6, 1.2), (0, 1.2)]).translate((-6, -4, TOP))
    lots = []
    for k, (ch, x) in enumerate((('ה', -12), ('ע', 0))):
        t = rounded_box(4.6, 3.4, 2.2, 0.8) - Manifold.extrude(text_shape(ch, 2.4, 0, 0, max_w=3.2), 0.61).translate((0, 0, 1.6))
        lots.append(P(f'lot-{k + 1}', 'Lot stone “for God”' if k == 0 else 'Lot stone “for Azazel”', t.translate((x, -7.5, TOP)), 'stone', (x, -12, 10)))
    stg = stage('אחרי מות', n, g1, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('cliff', 'The land cut off (eretz gezerah)', cliff, 'tan', (8, 8, 8)), goat1, goat2,
            P('urn', 'Urn for the lots', urn, 'gold', (-8, -8, 14))] + lots


def k_kedoshim(n):
    path = extrude(R(-25, -6, 25, 1).intersection(C(0, 0, 18.8)), 1.0, TOP - 0.4)
    cut_p = extrude(R(-25, -6 - FIT, 25, 1 + FIT).intersection(C(0, 0, 18.8 + FIT)), 0.41, TOP - 0.4)
    path = union(path, pl.peg((3, -2.5, TOP + 0.6), h=1.0))
    stone = rounded_box(4.6, 4, 3.4, 1.1, (3, -2.5, TOP + 0.6)) - hole((3, -2.5, TOP + 0.6), 1.4, axis='-z')
    blind, bc = fig('walker', 'A blind man, feeling his way', U(person(22, 6.6, hands=[(-4, 11), (6, 9)], legs=True), L([(6, 9), (9.5, 0.3)], 1.0)), 'blue', (-9, -2.5), 0, 2.4, (-10, -8, 12))
    wall = U(R(-9, 0, 9, 12), *[R(x, 12, x + 2.2, 14) for x in (-9, -5, -1, 3, 6.8)])
    wl, wc = fig('wall', 'A wall to hide behind', wall, 'stone', (4, 9), 0, 3.0, (6, 12, 10))
    sneak, sc = fig('sneak', 'Someone who thinks no one sees', person(18, 6, hands=[(-5, 16), (4, 10)]), 'black', (8, 13.5), 0, 2.4, (10, 18, 16))
    stg = stage('קדושים', n, [cut_p] + bc + wc + sc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('path', 'The road', path, 'sand', (0, -4, 4)),
            P('stumbling-block', 'Stumbling block (michshol)', stone, 'grey', (3, -8, 16)), blind, wl, sneak]


def k_emor(n):
    ripe, rc = cross('ripe', 'The first field to ripen', stalks(15, 6, 'ear', 9), 'wheat', (-9, 8), 15, 2.0, (-10, 8, 22))
    green, gc = cross('green', 'A field not yet ripe', stalks(9, 6, 'ear', 9), 'leaf', (9, 9), -10, 2.0, (10, 8, 16))
    pg, hl = seat(0, -4, h=1.6)
    tray = (rounded_box(16, 9, 1.6, 0.6, (0, -4, TOP)) - hl)
    loaves = [P(f'loaf-{k + 1}', 'One of the two loaves', union(rounded_box(6.8, 5.2, 3.0, 1.6, (x, -4, TOP + 1.6))), 'wheat', (x * 1.2, -8, 12 + 4 * k)) for k, x in enumerate((-3.8, 3.8))]
    stg = stage('אמור', n, rc + gc, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0))] + ripe + green + [P('tray', 'Tray', tray, 'wood', (0, -6, 6))] + loaves


def k_behar(n):
    field = extrude(U(*[R(x, y, x + 7.6, y + 7.6) for x in (-14, -6, 2) for y in (0, 8)]).intersection(C(0, 0, 18.6)), 1.2, TOP - 0.4)
    furrows = union(*[cube(22, 0.6, 0.5, (-2, y, TOP + 0.8)) for y in (1.8, 3.6, 5.4, 9.8, 11.6, 13.4)])
    field = field - furrows
    cut_f = extrude(U(*[R(x - FIT, y - FIT, x + 7.6 + FIT, y + 7.6 + FIT) for x in (-14, -6, 2) for y in (0, 8)]).intersection(C(0, 0, 18.6)), 0.41, TOP - 0.4)
    marker, mc = fig('boundary-stone', 'Boundary stone: the field goes home', U(R(-2, 0, 2, 8), C(0, 8, 2)), 'stone', (13, 6), 90, 2.6, (14, 6, 10))
    pts = [(math.sin(t) * 6 - 3, 0, 1.6 + math.cos(t) * 3 + 3) for t in np.linspace(-0.3, 2.4, 12)]
    horn = union(*[Manifold.batch_hull([sph(0.6 + 0.14 * k, pts[k], seg=16), sph(0.6 + 0.14 * (k + 1), pts[k + 1], seg=16)]) for k in range(len(pts) - 1)])
    horn = horn.translate((0, -5, TOP + 3))
    hb = horn.bounding_box()
    horn = above(horn, TOP + 3.0)
    stand = rounded_box(4, 3, 4.6, 0.8, (-3.4, -5, TOP))
    shackle = (cyl(1.4, 3.2) - cyl(2, 2.0, at=(0, 0, -0.5)) - cube(3, 3, 3, (2.8, 0, -0.5))).translate((11, -6, TOP))
    shackle2 = (cyl(1.4, 3.2) - cyl(2, 2.0, at=(0, 0, -0.5))).translate((7, -7.5, TOP))
    stg = stage('בהר', n, [cut_f] + mc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('field', 'The family’s field', field, 'leaf', (0, 6, 8)), marker,
            P('horn-stand', 'Stand', stand, 'wood', (-4, -8, 4)), P('horn', 'The horn of the yovel', horn, 'cream', (-4, -8, 16)),
            P('open-shackle', 'An opened shackle', shackle, 'iron', (12, -10, 8)), P('link', 'A link set free', shackle2, 'iron', (8, -12, 12))]


def k_bechukotai(n):
    pg, hl = seat(0, 5, h=3)
    oven = revolve([(0, 0), (8.0, 0), (5.6, 12), (4.4, 12), (6.6, 1.4), (0, 1.4)]).translate((0, 5, TOP)) - hl
    lid = drop_lid(4.4 - FIT).translate((0, 5, TOP + 12))
    loaf = above(ell(2.4, 2.4, 1.2), 0)
    places = []
    for k in range(10):
        a = math.radians(18 + 36 * k)
        places.append((13.5 * math.cos(a), 3 + 12.5 * math.sin(a) * 0.95 if math.sin(a) > -0.2 else 3 + 9 * math.sin(a), TOP, 0))
    places = [(13.5 * math.cos(math.radians(a)), 4 + 11.5 * math.sin(math.radians(a)), TOP, 0) for a in np.linspace(-20, 200, 10)]
    stg = stage('בחקתי', n, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('oven', 'One oven (tanur)', oven, 'clay', (0, 0, 8)),
            P('oven-lid', 'Oven lid', lid, 'clay', (0, 0, 26), rot=(180, 0, 0)),
            P('loaf', 'Loaf ×10 (one family’s bread each)', loaf, 'wheat', (0, 0, 14), places=places)]


def k_bamidbar(n):
    pg, hl = seat(0, 2, h=3)
    mishkan = house3d(9, 5, 5, roof=0.8, at=(0, 2, TOP)) - hl
    levi = cyl(1.4, 9.6) - cyl(3, 7.6, at=(0, 0, -1))
    levi = levi.translate((0, 2, TOP))
    tents = union(*[Manifold.batch_hull([cube(2.4, 2.4, 0.1, (8.6 * math.cos(a), 2 + 8.6 * math.sin(a), TOP + 1.4)), cube(0.2, 0.2, 2.2, (8.6 * math.cos(a), 2 + 8.6 * math.sin(a), TOP + 1.4))]) for a in np.linspace(0, 2 * math.pi, 12, endpoint=False)])
    levi = union(levi, tents)
    flags, cuts = [], []
    for k, (a, col, nm) in enumerate(((90, 'green', 'Yehudah’s camp, east'), (0, 'red', 'Reuven’s camp, south'), (270, 'blue', 'Ephraim’s camp, west'), (180, 'yellow', 'Dan’s camp, north'))):
        x, y = 14.5 * math.cos(math.radians(a)), 2 + 14.5 * math.sin(math.radians(a)) * (0.75 if a == 270 else 1)
        g = U(R(-0.6, 0, 0.6, 15), Polygon([(0.6, 15), (7, 13.5), (0.6, 10.5)]))
        p, c = fig(f'flag-{k + 1}', nm, g, col, (x, y), 0, 1.6, (x * 0.8, (y - 2) * 0.8, 18))
        flags.append(p)
        cuts += c
    stg = stage('במדבר', n, cuts, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('levites', 'The Levites’ camp, carrying the Mishkan in the middle', levi, 'cream', (0, 0, 8)),
            P('mishkan', 'The Mishkan', mishkan, 'gold', (0, 0, 22))] + flags


def k_naso(n):
    cluster = union(cyl(5, 0.7, at=(0, 0, 14)), *[sph(2.0, (x, y, z), seg=24) for x, y, z in
                                                     ((0, 0, 2.2), (-1.8, 1, 5.2), (1.8, -1, 5.2), (0, 1.8, 5.4), (-3.2, 0, 8.4), (3.2, 0, 8.4), (0, -2, 8.4), (0, 2, 8.6), (-2, 1.8, 11.4), (2, -1.8, 11.4), (2, 2, 11.4), (-2, -2, 11.4))])
    cluster = cluster.translate((-9, 7, TOP))
    leaf = extrude(U(C(0, 0, 4), C(-3, 3, 3), C(3, 3, 3)).difference(U(C(-4, 6, 1.6), C(4, 6, 1.6))), 1.0).rotate((60, 0, 0)).translate((-9, 7, TOP + 17))
    half = above(sph(5.0, seg=36) - sph(4.2, seg=36), 0)
    seeds = union(*[ell(0.9, 0.6, 0.6, (x, y, 0.6)) for x, y in ((-1.4, 0), (1.4, 0.3), (0, 1.6))])
    g1 = half.rotate((180, 0, 0)).translate((7, 9, TOP + 5.0))
    g1 = half.translate((7, 9, TOP))
    g2 = half.translate((9, -3, TOP))
    zag = [P('seeds', 'Seeds (zag)', seeds.translate((7, 9, TOP + 0.8)), 'brown', (8, 10, 18))]
    skins = union(*[above(ell(2.6, 2.2, 1.0, (x, y, 0)), 0) for x, y in ((-2, 0), (1.5, 1.2), (0.6, -1.8))]).translate((-4, -5, TOP))
    cup = revolve([(0, 0), (2.6, 0), (2.2, 0.8), (0.8, 1.6), (0.8, 4), (3.4, 6), (3.6, 9), (3.0, 9), (2.8, 6.4), (0, 6.0)]).translate((13, 1, TOP))
    stg = stage('נשא', n)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('cluster', 'A cluster of grapes', cluster, 'purple', (-10, 8, 10)),
            P('leaf', 'Vine leaf', leaf, 'leaf', (-10, 8, 30)), P('grape-half', 'A grape opened: skin and pip', g1, 'purple', (8, 10, 8)),
            P('grape-skin', 'Another grape skin', g2, 'purple', (10, -4, 8))] + zag + [
            P('pressed', 'Pressed skins (chartzanim)', skins, 'purple', (-4, -8, 12)), P('cup', 'Wine cup', cup, 'silver', (14, 0, 14))]


def k_behaalotecha(n):
    stem = U(R(-0.9, 0, 0.9, 22), C(0, 22, 1.5))
    arms_ = []
    for r in (4.0, 8.0, 12.0):
        arc = C(0, 22, r).difference(C(0, 22, r - 1.6)).intersection(R(-r - 1, 0, r + 1, 22))
        arms_.append(U(arc, C(-r + 0.8, 22, 1.5), C(r - 0.8, 22, 1.5)))
    men = U(stem, Polygon([(-5, 0), (5, 0), (1.5, 3), (-1.5, 3)]), *arms_)
    mp, mc = fig('menorah', 'The menorah', men, 'gold', (0, 8), 0, 2.4, (0, 10, 12))
    tx, ty = 13, -5
    places = [(x, 8, TOP + 23.5 - 1.4, math.degrees(math.atan2(ty - 8, tx - x))) for x in (-11.2, -7.2, -3.2, 0, 3.2, 7.2, 11.2)]
    lamp = lamp3d() - cyl(1.41, 1.85, at=(0, 0, -0.01), seg=24)
    table = union(cube(10, 7, 1.2, (tx, ty, TOP + 7)), *[cube(1.2, 1.2, 7, (tx + x, ty + y, TOP)) for x in (-4, 4) for y in (-2.8, 2.8)])
    bread = union(*[rounded_box(3.6, 2.4, 1.2, 0.5, (tx + x, ty, TOP + 8.2 + 1.2 * k)) for x in (-2.4, 2.4) for k in range(3)])
    stg = stage('בהעלתך', n, mc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), mp,
            P('lamp', 'Lamp ×7, wicks turned toward the table', lamp, 'clay', (0, 0, 16), places=places),
            P('table', 'The table (shulchan)', table, 'wood', (12, -10, 8)), P('bread', 'Show-bread', bread, 'wheat', (12, -10, 22))]


def k_shelach(n):
    cx, cy = -6, 6
    pg, hl = seat(cx, cy, h=3)
    wall = cyl(7, 9.0, seg=36) - cyl(9, 7.6, at=(0, 0, -1), seg=36)
    wall = union(wall, *[cyl(9, 1.9, at=(9 * math.cos(a), 9 * math.sin(a), 0), seg=20) for a in np.linspace(0, 2 * math.pi, 6, endpoint=False)])
    wall = (wall - union(*[cube(1.4, 30, 1.4, (0, 0, 6.2)).rotate((0, 0, a)) for a in (0, 60, 120)])).translate((cx, cy, TOP))
    houses = union(cyl(1.0, 7.0), *[house3d(3.4, 3.4, 3 + k % 3 * 1.2, roof=0.5, at=(x, y, 1.0), door=False) for k, (x, y) in enumerate(((-2.4, -2.4), (2.4, -2.0), (0, 2.6), (-3, 2), (3.2, 2.6)))])
    houses = houses.translate((cx, cy, TOP)) - hl
    tents = [P(f'tent-{k + 1}', 'Tent of an open town', tent3d(6, 5, 5, (x, y, TOP)), 'cream', (x * 1.4, y * 1.2, 10)) for k, (x, y) in enumerate(((9, 12), (13, 5), (7, 5)))]
    spy, sc = fig('spy', 'A spy, looking', person(17, 5.6, hands=[(-2, 15.5), (4, 8)], legs=True), 'green', (13, -4), -20, 2.4, (14, -8, 12))
    pole = U(R(-9, 12, 9, 13), *[C(x, 10.5 + y, 1.1) for x, y in ((0, 0), (-1, -1.8), (1, -1.8), (0, -3.4), (-1.6, 0.2), (1.6, 0.2))], R(-9, 0, -8, 13), R(8, 0, 9, 13))
    grapes, gc = fig('pole', 'The pole with a cluster', pole, 'purple', (-2, -7), 0, 2.0, (-2, -12, 18), tabs=[(-8.9, -8.1), (8.1, 8.9)])
    stg = stage('שלח', n, sc + gc, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('walls', 'Walls of a fortified city', wall, 'stone', (-8, 8, 6)),
            P('houses', 'Houses inside the walls', houses, 'tan', (-8, 8, 24))] + tents + [spy, grapes]


def k_korach(n):
    pg, hl = seat(-6, 8, h=3)
    altar = rounded_box(13, 11, 10, 0.8, (-6, 8, TOP)) - hl
    altar = union(altar, *[cube(2, 2, 2, (-6 + x, 8 + y, TOP + 10)) for x in (-5.5, 5.5) for y in (-4.5, 4.5)])
    plating = (cube(14.6, 12.6, 6.6, (-6, 8, TOP + 1.6)) - cube(13 + 2 * FIT, 11 + 2 * FIT, 7, (-6, 8, TOP + 1.0)))
    plating = plating - union(*[cube(16, 0.4, 0.4, (-6, 8 - 6.3, TOP + z)) for z in (3.4, 5.6)])
    pans = []
    for k, (x, y, a) in enumerate(((7, 8, 30), (10, -2, -20))):
        pan = union(cyl(1.4, 3.8) - cyl(2, 3.0, at=(0, 0, 0.8)), cube(8, 1.4, 0.9, (7, 0, 0.5)))
        pans.append(P(f'firepan-{k + 1}', 'Firepan from the burnt ones', pan.rotate((0, 0, a)).translate((x, y, TOP)), 'copper', (x, y - 4, 10 + 4 * k)))
    coals = [P('scattered-fire', 'The fire, scattered away (zereh)', union(*[sph(1.2, (x, y, TOP + 0.6), seg=16) for x, y in ((-14, -4), (-11, -7), (-8, -5), (-15, 0), (-5, -7.5))]), 'red', (-10, -10, 8))]
    el, ec = fig('elazar', 'Elazar the kohen', person(22, 6.6, hat='turban', hands=[(-5, 10), (5, 14)]), 'white', (13, 7), -60, 2.6, (16, 8, 14))
    stg = stage('קרח', n, ec, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('altar', 'The altar', altar, 'wood', (-8, 8, 6)),
            P('plating', 'Plating hammered from the firepans', plating, 'copper', (-8, 8, 26))] + pans + coals + [el]


def k_chukat(n):
    pg, hl = seat(-3, 4, h=2)
    well = revolve([(5.0, 0), (7.6, 0), (7.6, 7), (5.0, 7)]).translate((-3, 4, TOP))
    stones = union(*[rounded_box(3.0, 2.0, 1.6, 0.6, (0, 0, 0)).rotate((0, 0, a)).translate((-3 + 6.3 * math.cos(math.radians(a + 90)), 4 + 6.3 * math.sin(math.radians(a + 90)), TOP + 7)) for a in range(0, 360, 30)])
    well = union(well, stones)
    water = union(cyl(8.6, 4.8 - FIT), ell(4.8, 4.8, 3.0, (0, 0, 8.6)), *[sph(1.4, (x, y, 11.2)) for x, y in ((-2, 1), (1.6, -1), (0.4, 2.2))]).translate((-3, 4, TOP)) - hl
    staffs, cuts = [], []
    for k, (x, y, a) in enumerate(((10, 10, 0), (12, 0, 30))):
        g = U(R(-0.7, 0, 0.7, 24), C(0, 24, 1.4))
        p, c = fig(f'staff-{k + 1}', 'A prince’s staff that dug the well', g, 'wood', (x, y), a, 1.8, (x * 1.2, y, 22 + 4 * k))
        staffs.append(p)
        cuts += c
    singer, sc = fig('singer', 'Singing “Rise up, O well”', person(19, 6, hands=[(-5.5, 19), (5.5, 19)]), 'blue', (-10, -6), 10, 2.4, (-12, -10, 14))
    stg = stage('חקת', n, cuts + sc, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('well', 'The well', well, 'stone', (0, 6, 6)),
            P('water', 'Water rising', water, 'water', (0, 0, 28))] + staffs + [singer]


def k_balak(n):
    def wall_g(Lw):
        g = R(-Lw / 2, 0, Lw / 2, 9)
        for r in range(3):
            for k in range(-6, 7):
                x = k * 4 + (2 if r % 2 else 0)
                g = g.difference(R(x - 0.2, r * 3 + 0.4, x + 0.2, r * 3 + 2.8))
            if r:
                g = g.difference(R(-Lw, r * 3 - 0.2, Lw, r * 3 + 0.2))
        return g
    parts, cuts = [], []
    for k, y in enumerate((9.0, -3.0)):
        p, c = fig(f'wall-{k + 1}', 'Stone wall (gader)', wall_g(30), 'stone', (0, y), 0, 2.4, (0, y + (8 if k == 0 else -8), 6), tabs=[(-14, -6), (6, 14)])
        parts.append(p)
        cuts += c
    vine = U(R(-0.6, 0, 0.6, 9), *[C(x, y, 1.6) for x, y in ((0, 11), (-3, 9.5), (3, 9.5), (-1.6, 13), (1.6, 13))], L([(-6, 9), (6, 9)], 0.8))
    for k, (x, y) in enumerate(((-6, 14.0), (6, -7.0))):
        p, c = fig(f'vine-{k + 1}', 'Vineyard behind the wall', vine, 'leaf', (x, y), 0, 2.0, (x, y + (8 if k == 0 else -8), 14))
        parts.append(p)
        cuts += c
    don, dc = fig('donkey', 'Bilam’s donkey, pressing against the wall', beast('donkey', 11, 5, 5), 'grey', (-6, 3), 0, 2.6, (-6, 0, 14))
    angel = U(person(20, 6.4, hands=[(-5, 18), (5, 12)]), L([(-5, 16), (-5, 26)], 1.0), R(-7, 16.5, -3, 17.3), Polygon([(-2.4, 14), (-8, 18), (-7, 11)]), Polygon([(2.4, 14), (8, 18), (7, 11)]))
    an, ac = fig('angel', 'The angel in the lane', angel, 'white', (10, 3), 0, 2.4, (14, 0, 18))
    stg = stage('בלק', n, cuts + dc + ac)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0))] + parts + [don, an]


def k_pinchas(n):
    pen = U(R(-14, 0, -3, 7), R(3, 0, 14, 7)).difference(U(*[R(x, 1, x + 1.6, 6) for x in (-12, -9, -6, 4.4, 7.4, 10.4)]))
    pp, pc = fig('fold', 'The fold they go out of', pen, 'wood', (0, 13), 0, 2.4, (0, 12, 6), tabs=[(-13.5, -3.5), (3.5, 13.5)])
    sh = U(person(22, 6.6, hands=[(-4.5, 10), (5.0, 13)], hat='hood', legs=True), R(4.4, 0, 5.6, 22), C(5.8, 22, 1.4).difference(C(5.8, 22, 0.7)))
    shp, shc = fig('shepherd', 'A shepherd who leads them out and brings them in', sh, 'green', (0, -6), 0, 2.6, (0, -12, 14))
    sheep = [fig(f'sheep-{k + 1}', 'Sheep', beast('sheep', 9, 4.6, 3.3), 'white', (x, y), -90, 2.4, (x * 1.4, y, 8 + 3 * k)) for k, (x, y) in enumerate(((-4, 1), (4, 3), (0, 8)))]
    stg = stage('פינחס', n, pc + shc + sum([s[1] for s in sheep], []))
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), pp, shp] + [s[0] for s in sheep]


def k_matot(n):
    fold = cyl(5, 11.5, seg=40) - cyl(6, 9.6, at=(0, 0, -1), seg=40) - cube(6, 6, 6, (0, -11, -0.5))
    for z in (1.6, 3.3):
        fold = fold - (cyl(0.4, 12, seg=40) - cyl(0.4, 11.2, seg=40)).translate((0, 0, z))
    fold = fold.translate((-2, 4, TOP))
    sheep = [fig(f'sheep-{k + 1}', 'Sheep', beast('sheep', 8, 4.2, 3.0), 'white', (x, y), a, 2.4, (x, y, 14 + 4 * k)) for k, (x, y, a) in enumerate(((-6, 6, 20), (2, 9, -30), (1, 1, 200)))]
    city = union(*[house3d(3.6, 3.6, 3 + (k % 2) * 1.6, roof=0.5, at=(x, y, 0), door=False) for k, (x, y) in enumerate(((0, 0), (4, 0.6), (2, 4), (-2, 3.6)))])
    pg, hl = seat(12, 12, h=2)
    city = city.translate((10, 10, TOP)) - hl
    stg = stage('מטות', n, sum([s[1] for s in sheep], []), add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('sheepfold', 'Stone sheepfolds (gidrot tzon), built first', fold, 'stone', (-2, 4, 6))] + [s[0] for s in sheep] + [
        P('town', 'Towns for the little ones, second', city, 'tan', (12, 12, 12))]


def k_masei(n):
    outer = cyl(1.4, 18.6, seg=64) - cyl(3, 13.6 + FIT, at=(0, 0, -1), seg=64)
    wall = union(cyl(5.0, 13.6, seg=64) - cyl(6, 12.0, at=(0, 0, -1), seg=64), *[cyl(6.4, 1.8, at=(12.8 * math.cos(a), 12.8 * math.sin(a), 0), seg=16) for a in np.linspace(0, 2 * math.pi, 8, endpoint=False)])
    wall = wall - cube(3.2, 6, 4, (0, -13, -0.01))
    plaza = cyl(1.2, 12.0 - FIT, seg=64)
    houses = union(*[house3d(3.2, 3.2, 2.6 + (k % 3) * 0.9, roof=0.4, at=(x, y, 0), door=False) for k, (x, y) in enumerate(((-2.6, -2.2), (1.2, -2.6), (3.6, 0.6), (0, 1.6), (-3.4, 1.8), (1.2, 4.6), (-1.2, -5.4)))])
    houses = union(houses, cyl(0.6, 6.4))
    pg, hl = seat(0, 0, h=1.6)
    return [P('stage', 'Stage', stage('מסעי', n, add=[pg.translate((0, 0, 2.6))] if False else []), 'stage', (0, 0, 0)),
            P('migrash', 'Open land outside the wall: a thousand cubits', outer.translate((0, 0, TOP)), 'leaf', (0, 0, 6)),
            P('wall', 'The city wall', wall.translate((0, 0, TOP)), 'stone', (0, 0, 16)),
            P('open-ground', 'Open ground inside the wall, before the houses', plaza.translate((0, 0, TOP)), 'sand', (0, 0, 26)),
            P('houses', 'The houses', houses.translate((0, 0, TOP + 1.2)), 'tan', (0, 0, 38))]


def k_devarim(n):
    bed = union(cube(26, 12, 1.6, (0, 4, TOP + 4)), *[cube(1.8, 1.8, 7.6, (x, 4 + y, TOP)) for x in (-12, 12) for y in (-5, 5)],
                cube(1.6, 12, 4, (-12.2, 4, TOP + 7.6)), cube(1.6, 12, 2, (12.2, 4, TOP + 7.6)))
    pillow = rounded_box(5, 8, 2, 0.9, (-8, 4, TOP + 5.6))
    man, mc = fig('person', 'An ordinary man, for scale', person(13, 4.4, legs=True), 'blue', (4, -6), 0, 2.0, (6, -10, 10))
    plaque = U(R(-5, 0, 5, 7))
    plq, pc = fig('plaque', 'Kept in Rabbat Ammon as a trophy', plaque, 'tan', (-10, -6), 20, 1.6, (-12, -10, 8))
    stg = stage('דברים', n, mc + pc + [cube(1.8 + 2 * FIT, 1.8 + 2 * FIT, 1.01, (x, 4 + y, TOP - 1)) for x in (-12, 12) for y in (-5, 5)])
    bed = union(bed, *[cube(1.8, 1.8, 1.0, (x, 4 + y, TOP - 1)) for x in (-12, 12) for y in (-5, 5)])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('bed', 'Og’s bed of iron', bed, 'iron', (0, 4, 10)),
            P('pillow', 'Pillow', pillow, 'red', (-8, 4, 22)), man, plq]


def k_vaetchanan(n):
    frame_g = U(R(-8, 0, -6, 23), R(6, 0, 8, 23), R(-9, 23, 9, 25.6))
    fp, fc = fig('doorway', 'Doorway', frame_g, 'wood', (-4, 9), 0, 3.0, (-4, 12, 14), tabs=[(-7.9, -6.1), (6.1, 7.9)])
    mez = union(rounded_box(1.6, 1.4, 7, 0.5), cube(1.0, 0.4, 1.2, (0, -0.8, 5)))
    mez = mez.rotate((0, -18, 0)).translate((-4 + 7, 9 - 1.5 - 0.7, TOP + 13))
    box = union(cube(6, 6, 6, (0, 0, 1.2)), cube(9, 9, 1.2, (0, 0, 0)), cube(4, 2, 2, (0, 4.4, 0)))
    box = (box - Manifold.extrude(text_shape('ש', 3.6, 0, 0), 0.5).rotate((90, 0, 0)).translate((0, -3.01 + 0.49, 4.2))).translate((7, -4, TOP))
    strap = (cyl(1.0, 7.0) - cyl(2, 6.0, at=(0, 0, -0.5))).translate((-9, -5, TOP))
    strap = union(strap, cube(8, 1.6, 1.0, (-9 + 6.5, -5, TOP)))
    stg = stage('ואתחנן', n, fc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), fp, P('mezuzah', 'Mezuzah, written on the doorpost', mez, 'silver', (6, -10, 14), rot=(0, 90, 0)),
            P('tefillin', 'Tefillin, bound on the arm', box, 'black', (8, -8, 12)), P('strap', 'Strap', strap, 'black', (-10, -8, 8))]


def k_ekev(n):
    walker, wc = fig('walker', 'An Israelite in the desert', person(24, 7.4, hands=[(-5, 11), (5, 11)], legs=True, hat='hood'), 'blue', (-8, 4), 10, 2.6, (-10, 4, 12))
    rack_g = U(R(-0.8, 0, 0.8, 20), R(-6, 18.4, 6, 20), C(-5.4, 17.6, 1.0), C(5.4, 17.6, 1.0))
    rk, rc = fig('rack', 'A peg for the spare clothes', rack_g, 'wood', (7, 9), 0, 2.4, (8, 12, 10))
    cloak_g = U(Polygon([(-5, 0), (5, 0), (3, 12), (-3, 12)]), C(0, 12.4, 2.0)).difference(C(0, 12.6, 1.1))
    ck = P('cloak', 'A cloak to change into', stand_up(flat_figure(cloak_g, 1.2), 0, (7 + 5.4, 9 - 1.2 - 0.7, TOP + 5.0)), 'red', (10, 2, 22), pm=extrude(cloak_g, 1.2))
    sandal = above(ell(2.2, 4.4, 0.9), 0) + union(cube(3.6, 0.6, 1.4, (0, 1.2, 0)), cube(3.6, 0.6, 1.4, (0, -1.4, 0)))
    s = [P(f'sandal-{k + 1}', 'Spare sandal', sandal.rotate((0, 0, a)).translate((x, y, TOP)), 'brown', (x, y - 8, 8)) for k, (x, y, a) in enumerate(((2, -6, 10), (6.5, -6.5, -10), (11, -3, 30), (14.5, -1, 20)))]
    stg = stage('עקב', n, wc + rc)
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), walker, rk, ck] + s


def k_reeh(n):
    pg1, hl1 = seat(-9, 5)
    pg2, hl2 = seat(9, 5)
    ger = revolve([(0, 0), (9, 0), (7, 4), (4, 8), (0, 10)], seg=40).scale((1, 1.1, 1)).translate((-9, 5, TOP)) - hl1
    eiv = revolve([(0, 0), (9, 0), (8, 3), (5, 6), (3.6, 9.5), (1.2, 12), (0, 12)], seg=7).translate((9, 5, TOP)) - hl2
    trees = []
    for k, (x, y) in enumerate(((-12, 2), (-6, 2.5), (-9, 8.5))):
        t = union(cyl(2.6, 0.6), sph(1.9, (0, 0, 3.6), seg=16)).translate((0, 0, 0))
        r_ = math.hypot(x + 9, (y - 5) / 1.1)
        z = TOP + max(0, 10 * (1 - r_ / 9.0)) - 0.6
        trees.append((x, y, z))
    tr = union(*[union(cyl(2.6, 0.6, at=(x, y, z)), sph(1.9, (x, y, z + 3.4), seg=16)) for x, y, z in trees])
    ark = union(cube(5, 3, 3), cube(5.6, 3.4, 0.6, (0, 0, 3))).translate((0, -4, TOP))
    poles = cube(10, 0.8, 0.8, (0, -4 - 0.9, TOP + 1.6))
    stg = stage('ראה', n, add=[pg1, pg2])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('gerizim', 'Mount Gerizim: green pasture', ger, 'leaf', (-12, 6, 8)),
            P('trees', 'Orchards on Gerizim', tr, 'green', (-12, 6, 22)), P('eival', 'Mount Eival: bare rock', eiv, 'grey', (12, 6, 8)),
            P('ark', 'The ark, between them, where the Levites stand', union(ark, poles), 'gold', (0, -8, 12))]


def k_shoftim(n):
    wall = U(R(-17, 0, 17, 13), *[R(x, 13, x + 3, 16) for x in (-17, -11, -5, 1, 7, 13)]).difference(R(-3, 0, 3, 8))
    wp, wc = fig('city-wall', 'The besieged city', wall, 'stone', (0, 13), 0, 3.0, (0, 14, 8), tabs=[(-15, -4), (4, 15)])
    t, tc = cross('tree', 'Fruit tree', tree(21, 6.5, 1.8, fruit=False), 'green', (-4, 1), 20, 2.4, (-6, -2, 20))
    fruits = [P(f'fruit-{k + 1}', 'Fruit', sph(1.4, (x, y, TOP + 1.2)), 'orange', (x, y - 6, 10)) for k, (x, y) in enumerate(((-10, -5), (-7, -7), (2, -6)))]
    axe = union(cube(12, 1.2, 1.4, (0, 0, 0)), Manifold.batch_hull([cube(1.6, 1.4, 1.4, (5, 0, 0)), cube(0.4, 5, 1.4, (7.6, 0, 0))])).rotate((0, 0, 20)).translate((10, -5, TOP))
    dents = [cyl(1.2, 1.0, at=(x, y, TOP - 0.6), seg=16) for x, y in ((-10, -5), (-7, -7), (2, -6))]
    stg = stage('שופטים', n, wc + tc + dents)
    fruits = [dict(f, mesh=f['mesh'].translate((0, 0, -0.6))) for f in fruits]
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), wp] + t + fruits + [P('axe', 'The axe, put down', axe, 'iron', (12, -8, 8))]


def k_ki_teitzei(n):
    pg, hl = seat(0, 3, h=2)
    nest = revolve([(0, 0), (6, 0), (8.6, 4.6), (7.4, 4.8), (5.4, 1.6), (0, 1.6)]).translate((0, 3, TOP)) - hl
    mother = union(ell(4.4, 3.0, 3.0, (0, 0, 3.0)), sph(2.2, (3.8, 0, 5.4)), Manifold.batch_hull([sph(0.5, (5.6, 0, 5.4)), sph(0.2, (7.2, 0, 5.0))]),
                   ell(3, 1.0, 0.8, (-4.6, 0, 3.8)), ell(3.6, 0.8, 2.0, (-0.6, 2.6, 3.4)), ell(3.6, 0.8, 2.0, (-0.6, -2.6, 3.4)))
    mother = above(mother, 0.6).translate((0, 0, -0.6)).translate((-1, 3, TOP + 3.4))
    chicks = [P(f'chick-{k + 1}', 'Chick', union(sph(1.6, (0, 0, 1.6)), sph(1.1, (1.4, 0, 3.0))).translate((x, y, TOP + 1.6)), 'yellow', (x * 2.6, (y - 3) * 2.6, 14)) for k, (x, y) in enumerate(((4.6, 6.4), (-4.4, -0.4)))]
    eggs = [P(f'egg-{k + 1}', 'Egg', ell(1.3, 1.3, 1.7, (x, y, TOP + 1.6 + 1.6)), 'white', (x * 2, (y - 3) * 2, 18)) for k, (x, y) in enumerate(((4.4, 0.0), (-3.4, 6.6)))]
    stg = stage('כי תצא', n, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('nest', 'The nest', nest, 'brown', (0, 0, 6)),
            P('mother', 'The mother bird, staying to guard them', mother, 'tan', (0, 0, 26))] + chicks + eggs


def k_ki_tavo(n):
    parts, cuts = [], []
    for k, x in enumerate((-7.5, 7.5)):
        st = rounded_box(12, 6, 20, 1.2, (x, 6, TOP - 2))
        cuts.append(cube(12 + 2 * FIT, 6 + 2 * FIT, 2.01, (x, 6, TOP - 2)))
        parts.append(P(f'stone-{k + 1}', 'Great stone', st, 'stone', (x * 0.6, 6, 6)))
        sleeve = cube(13.6, 7.6, 19.2, (x, 6, TOP + 0.6)) - rounded_box(12 + 2 * FIT, 6 + 2 * FIT, 19, 1.2, (x, 6, TOP + 0.59))
        sleeve = sleeve - Manifold.extrude(text_shape('שמע' if k == 0 else 'ברית', 2.6, 0, 0, max_w=10), 0.5).rotate((90, 0, 0)).translate((x, 6 - 3.8 + 0.49, TOP + 14))
        for z in (9.5, 5.5):
            sleeve = sleeve - cube(9, 1, 0.6, (x, 6 - 3.8, TOP + z))
        parts.append(P(f'plaster-{k + 1}', 'Coat of lime plaster, written on', sleeve, 'white', (x * 1.6, -4, 28), rot=(180, 0, 0)))
    altar = union(*[rounded_box(3.6, 3.4, 2.6, 0.7, (x, y, TOP + z)) for x, y, z in ((-2, -5, 0), (2, -5, 0), (0, -5, 2.4))]).translate((10, -1, 0))
    return [P('stage', 'Stage', stage('כי תבוא', n, cuts), 'stage', (0, 0, 0))] + parts + [P('altar', 'Altar of whole stones', altar, 'stone', (12, -8, 8))]


def k_nitzavim(n):
    floor = cube(22, 16, 1.6, (0, 5, TOP))
    yf, yb = -1.2, 11.2
    floor = floor - cube(20.4, 1.6 + 2 * FIT, 1.0, (0, yf, TOP + 0.61)) - cube(20.4, 1.6 + 2 * FIT, 1.0, (0, yb, TOP + 0.61))
    front_g = U(R(-10, 0, 10, 12).difference(R(-2.4, 0, 2.4, 7)), R(-10, -1, -2.4, 0), R(2.4, -1, 10, 0))
    back_g = U(R(-10, 0, 10, 12), R(-10, -1, 10, 0))
    side_g = R(-5.3, 0, 5.3, 12).difference(R(-2, 4, 2, 8))
    zf = TOP + 1.6
    roof = Manifold.batch_hull([cube(24, 18, 0.1, (0, 5, 0)), cube(24, 0.6, 0.1, (0, 5, 5))]) - cube(20.4 + 2 * FIT, 14.4 + 2 * FIT, 1.0, (0, 5, -0.01))
    return [P('stage', 'Stage', stage('נצבים', n), 'stage', (0, 0, 0)), P('floor', 'Foundation', floor, 'stone', (0, 0, 4)),
            P('front', 'Front wall', stand_up(flat_figure(front_g, 1.6), 0, (0, yf, zf)), 'tan', (0, -14, 12), pm=extrude(front_g, 1.6)),
            P('back', 'Back wall', stand_up(flat_figure(back_g, 1.6), 0, (0, yb, zf)), 'tan', (0, 14, 12), pm=extrude(back_g, 1.6)),
            P('side-1', 'Side wall', stand_up(flat_figure(side_g, 1.6), 90, (-9.2, 5, zf)), 'tan', (-14, 0, 12), pm=extrude(side_g, 1.6)),
            P('side-2', 'Side wall', stand_up(flat_figure(side_g, 1.6), 90, (9.2, 5, zf)), 'tan', (14, 0, 12), pm=extrude(side_g, 1.6)),
            P('roof', 'Roof', roof.translate((0, 0, zf + 12)), 'red', (0, 0, 30))]


def k_vayelech(n):
    pg, hl = seat(0, 7, h=2)
    lect = Manifold.batch_hull([cube(12, 3, 0.1, (0, 7, TOP)), cube(14, 6, 0.1, (0, 7.6, TOP + 11)), cube(14, 2, 0.1, (0, 4.6, TOP + 9.4))]) - hl
    sheet = cube(12, 1.0, 9, (0, 0, -4.5))
    scroll = union(sheet, cyl(12, 1.4, at=(0, 0, -6)).translate((-7, 0, 0)), cyl(12, 1.4, at=(0, 0, -6)).translate((7, 0, 0)))
    scroll = (scroll - Manifold.extrude(text_shape('האזינו', 2.2, 0, 1.0, max_w=10), 0.4).rotate((90, 0, 0)).translate((0, -0.5 + 0.39, 0)))
    scroll = scroll.rotate((-28, 0, 0)).translate((0, 6.0, TOP + 15.2))
    reader, rc = fig('listener', 'Israel, to whom the song bears witness', person(20, 6.4, hands=[(-4.5, 10), (4.5, 10)]), 'blue', (-1, -6), 0, 2.4, (0, -12, 12))
    moshe, mc = fig('moshe', 'Moshe', person(24, 7, hat='hood', hands=[(-5, 20), (5, 12)]), 'navy', (12, 5), -50, 2.6, (14, 6, 14))
    stg = stage('וילך', n, rc + mc, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('lectern', 'Stand', lect, 'wood', (0, 6, 6)),
            P('scroll', 'The song, written down', scroll, 'cream', (0, 6, 24), rot=(28, 0, 0)), reader, moshe]


def k_haazinu(n):
    cx, cy = -4, 6
    pg, hl = seat(cx, cy, h=3)
    rock = Manifold.batch_hull([cube(18, 14, 0.1, (cx, cy, TOP)), cube(11, 9, 0.1, (cx, cy, TOP + 12))]) - hl - cyl(3.2, HOLE_R, at=(cx, cy, TOP + 9.0), seg=32)
    nest = revolve([(0, 0), (4.6, 0), (6.2, 3.0), (5.2, 3.0), (3.8, 1.2), (0, 1.2)]).translate((cx, cy, TOP + 12)) - cyl(3, HOLE_R, at=(cx, cy, TOP + 11.9), seg=32)
    chicks = union(*[union(sph(1.3, (x, y, 1.3)), sph(0.9, (x + 0.6, y, 2.6))) for x, y in ((-2.8, 0.8), (2.8, -0.6))]).translate((cx, cy, TOP + 13.2))
    eagle = U(E(0, 0, 2.4, 6), C(0, 7, 2.2), Polygon([(0.8, 7.4), (3.4, 6.6), (0.8, 6.0)]),
              Polygon([(-2, 3), (-15, 7), (-17, 3), (-12, 1.4), (-14, -0.6), (-2, -2)]), Polygon([(2, 3), (15, 7), (17, 3), (12, 1.4), (14, -0.6), (2, -2)]),
              Polygon([(-2, -5), (2, -5), (3.2, -9), (-3.2, -9)])).difference(C(0, 0, HOLE_R))
    ez = TOP + 26
    em = extrude(eagle, 2.0).rotate((0, 0, 90)).translate((cx, cy, ez))
    post = cyl(ez + 2 - (TOP + 9.0), PIN_R, at=(cx, cy, TOP + 9.0), seg=32)
    stg = stage('האזינו', n, add=[pg])
    return [P('stage', 'Stage', stg, 'stage', (0, 0, 0)), P('crag', 'The crag', rock, 'stone', (0, 0, 6)), P('nest', 'Nest', nest, 'brown', (0, 0, 18)),
            P('chicks', 'Chicks', chicks, 'white', (0, 0, 24)), P('post', 'Pin', post, 'white', (0, 0, 30)),
            P('eagle', 'The eagle, hovering over its young', em, 'brown', (0, 0, 42))]


def k_vezot(n):
    g = beast('bull', 22, 10, 7)
    hx, hy = 12.6, 15.4
    x0, _, x1, _ = g.intersection(R(-200, 0, 200, 1)).bounds
    g = U(g, R(x0 + 0.4, -2.4, x1 - 0.4, 0.8)).difference(C(hx, hy, HOLE_R))
    ox = P('ox', 'The firstborn ox: Yosef', stand_up(flat_figure(g, 5.0), 0, (-2, 4, TOP)), 'brown', (0, 4, 10), pm=extrude(g, 5.0))
    cut = pl.slot(x1 - x0 - 0.8, 5.0, 2.4, (-2 + (x0 + x1) / 2, 4), 0)
    horn = U(L([(0, 0), (1.2, 4), (3.4, 7.4), (6.4, 9.4)], 1.8), C(0, 0, 1.6)).difference(C(0, 0, HOLE_R))
    parts = []
    for k, (dy, lab) in enumerate(((-3.35, 'Horn: the myriads of Ephraim'), (3.35, 'Horn: the thousands of Menashe'))):
        m = stand_up(flat_figure(horn, 1.6), 0, (-2 + hx, 4 + dy, TOP + hy))
        parts.append(P(f'horn-{k + 1}', lab, m, 'cream', (6, dy * 3, 20), pm=extrude(horn, 1.6)))
    pin = P('pin', 'Pin', cyl(9.2, PIN_R, at=(0, 0, -4.6), seg=32).rotate((90, 0, 0)).translate((-2 + hx, 4, TOP + hy)), 'white', (6, 0, 30), rot=(90, 0, 0))
    return [P('stage', 'Stage', stage('וזאת הברכה', n, [cut]), 'stage', (0, 0, 0)), ox] + parts + [pin]


def S(book, ref):
    return f'Shadal on {book} {ref}'


KITS = [
    dict(slug='bereshit', he='בְּרֵאשִׁית', en='Bereshit', ref=S('Genesis', '1:6'), verse='Bereshit 1:6', fn=k_bereshit,
         quote='רקיע: גוף מתוח כמין טס… וכאן צייר את האויר שבין הארץ והעננים כגוף מרוקע… והוא סובל המים עליו',
         idea='The firmament is pictured as a beaten sheet holding up the upper waters',
         story='Shadal reads rakia from “beaten out, like a plate”: the verse pictures the air between earth and clouds as a sheet that holds the upper waters, with windows that let the rain through. That was how people thought of the sky, he says, and the Torah spoke in their language. What it means is still true: God made water rise and come down again. The toy is a sky-blue plate on three pillars, the upper waters on top with their windows open, and the sea and dry land below.'),
    dict(slug='noach', he='נֹחַ', en='Noach', ref=S('Genesis', '9:13'), verse='Bereshit 9:13', fn=k_noach,
         quote='ידוע כי הקשת דבר טבעי… והתורה מכזבת השיבושים האלה באמרה כי הקשת אות ברית שלום',
         idea='The rainbow is natural; the Torah turns it from a pagan omen into a sign of peace',
         story='The rainbow is a natural thing, Shadal says, and God needs no reminder. But it comes at no fixed time, so the ancients took it for a messenger of the gods, and Homer calls it a sign of war or storm. The Torah takes the same bow and makes it a sign of a covenant of peace. Three arcs stand one behind the other over Ararat, with the ark on the peak and the dove flying in.'),
    dict(slug='lech-lecha', he='לֶךְ לְךָ', en='Lech Lecha', ref=S('Genesis', '15:17'), verse='Bereshit 15:17', fn=k_lech_lecha,
         quote='השכינה עברה בין הבתרים לכרות ברית עם אברם, ונדמתה לו כאש ועשן. תנור עשן: עשן כעשן התנור',
         idea='God passes between the pieces, seen as smoke like an oven’s and fire like a torch’s',
         story='The covenant between the pieces. Shadal says plainly that the Presence passed between the halves to make the covenant, and Avram saw it as fire and smoke: smoke like the smoke of an oven, fire like a torch’s flame. Two rows of halves lie on either side of a path, with the smoking oven and the torch between them and the two birds that were not cut.'),
    dict(slug='vayera', he='וַיֵּרָא', en='Vayera', ref=S('Genesis', '22:13'), verse='Bereshit 22:13', fn=k_vayera,
         quote='ראה איל, והאיל ההוא אחר שראהו אברהם נאחז בסבך בקרניו… ומילת אחר ענינה ואח״כ',
         idea='Avraham sees the ram first, and only afterwards it is caught in the thicket',
         story='“And behold, a ram, after, caught in the thicket by its horns.” Shadal reads achar as “afterwards”: Avraham saw a ram, and after he saw it, it got caught by its horns. The ram is placed by the altar with its horns tangled in a thicket that slots together from two halves.'),
    dict(slug='chayei-sarah', he='חַיֵּי שָׂרָה', en='Chayei Sarah', ref=S('Genesis', '24:22'), verse='Bereshit 24:22', fn=k_chayei_sarah,
         quote='נזם: יש נזם של אף, ויש נזם של אזנים, וכאן הוא של אף… ואני אומר כי הנתינה והדיבור היו כאחד',
         idea='A nose ring and two bracelets, given while he asked her name',
         story='The nezem here is a nose ring. Shadal cites travellers who saw Arab women wear them through a pierced nose. The commentators argue about whether Eliezer asked whose daughter she was first or gave the gifts first. Shadal says both happened together: he came close and handed her the gifts while he asked, so she would know he was rich and generous before he asked for room for all his camels. Rivka with her jar, a camel, the well, and a tray holding the nose ring and two bracelets.'),
    dict(slug='toldot', he='תּוֹלְדֹת', en='Toldot', ref=S('Genesis', '25:27'), verse='Bereshit 25:27', fn=k_toldot,
         quote='ויעקב היה יושב אהלים ורועה צאן (כטעם יושב אהל ומקנה)… בערך אל עשו שהיה אוהב מלאכת הציד, שכולה נכלים',
         idea='“Dwelling in tents” means a shepherd, as against a hunter whose whole trade is trickery',
         story='“Yoshev ohalim”, Shadal says, is a shepherd’s life, as when Yaval is “father of those who dwell in tents and keep cattle”, not a scholar’s. Yaakov is tam beside Esav because hunting is a trade made of tricks. An honest man may use a trick to save himself, but not as his living. Yaakov’s tent and sheep on one side, Esav with his bow and a deer on the other.'),
    dict(slug='vayetze', he='וַיֵּצֵא', en='Vayetze', ref=S('Genesis', '28:12'), verse='Bereshit 28:12', fn=k_vayetze,
         quote='עולים ומביאים לפניו ית׳ תפלות התחתונים, ויורדים במצות האל למלא משאלות המתפללים, וזהו… וזה שער השמים',
         idea='The angels carry prayers up and bring the answers down: the gate of heaven',
         story='With Abravanel, Shadal says the angels go up carrying the prayers of people below and come down at God’s command to fulfil them. That is why Yaakov calls the place “the gate of heaven”: from here prayers go up. The ladder stands over the sleeping Yaakov, with one angel going up holding a scroll and one coming down. Each angel pins to a rung.'),
    dict(slug='vayishlach', he='וַיִּשְׁלַח', en='Vayishlach', ref=S('Genesis', '32:25'), verse='Bereshit 32:25', fn=k_vayishlach,
         quote='ורש״י פירש מל׳ חבוק… ולזה דעתי נוטה… והתחבק עמו לא להזיקו אלא מלחמת כבוד… כדרך האתליטים',
         idea='Vaye’avek means “embraced”: a wrestle for honour, like athletes, not to harm',
         story='Vaye’avek, Shadal agrees with Rashi, means “clasped”, as the Aramaic avik. The angel took hold of Yaakov not to hurt him but in a contest of honour, as athletes wrestle, trying to throw him. Then he let himself seem unable to win, to strengthen Yaakov’s heart. The two figures slot into each other in a clinch by the Yabbok, with dawn coming up behind.'),
    dict(slug='vayeshev', he='וַיֵּשֶׁב', en='Vayeshev', ref=S('Genesis', '37:3'), verse='Bereshit 37:3', fn=k_vayeshev,
         quote='כתנת פסים: שהיתה מגעת עד פס ידו ועד פס רגלו… ואורך הבגדים הוא סימן שחרור וגדולה, שאינו צריך לעשות מלאכה',
         idea='A coat down to the palms and the soles: long clothes mean you don’t do work',
         story='The ketonet passim reached to the pas, the palm of the hand and the sole of the foot. Shadal explains that a long garment was a sign of freedom and rank, someone who doesn’t have to work. Yosef wears a striped coat that pins on over him and reaches his wrists and ankles. His brother is in a short work tunic with a shepherd’s stick.'),
    dict(slug='miketz', he='מִקֵּץ', en='Miketz', ref=S('Genesis', '41:2'), verse='Bereshit 41:2', fn=k_miketz,
         quote='באחו: מלה מצרית, ענינה העשב הגדל באגם',
         idea='Achu is an Egyptian word: the grass that grows in the marsh',
         story='The cows in Pharaoh’s dream come up from the Nile and graze ba’achu. Shadal says it is an Egyptian word, the grass that grows in the marsh. A Nile channel runs along the back with clumps of marsh grass, a fat cow and a lean one.'),
    dict(slug='vayigash', he='וַיִּגַּשׁ', en='Vayigash', ref=S('Genesis', '45:19'), verse='Bereshit 45:19', fn=k_vayigash,
         quote='תחלה אמר לו אמור אל אחיך זאת עשו טענו את בעירכם, וזה היה בידם לעשות, ועכשו מוסיף וזה אני מצוה אותך ואותם יחדו',
         idea='Loading their own animals they could do alone; the wagons needed Pharaoh’s order',
         story='First Pharaoh tells the brothers to load their own animals, which was in their power. Then he adds, “and you are commanded, do this: take wagons from Egypt”. Shadal explains that the wagons were not up to them, so Pharaoh commands Yosef and the brothers together. An Egyptian wagon whose wheels turn on real axles, loaded with food, on a road across the stage.'),
    dict(slug='vayechi', he='וַיְחִי', en='Vayechi', ref=S('Genesis', '48:14'), verse='Bereshit 48:14', fn=k_vayechi,
         quote='והנכון… עשה ידיו סְכָלוֹת נתן אותם באופן שהרואים יחשבו שאין בהן דעת, כי אמנם מנשה היה הבכור',
         idea='Sikel et yadav: he made his hands look foolish, as if they did not know',
         story='Onkelos and Rashi read sikel as “wisely”. Rashbam reads it as “crosswise”. With his student Yitzchak Pardo, Shadal takes it from sachal, foolish: Yaakov made his hands look foolish, set them so onlookers would think they didn’t know what they were doing, since Menashe was the firstborn and the right hand was his. Yaakov sits with his arms crossed over Ephraim and Menashe.'),
    dict(slug='shemot', he='שְׁמוֹת', en='Shemot', ref=S('Exodus', '3:2'), verse='Shemot 3:2', fn=k_shemot,
         quote='והנה הסנה בוער באש, לא בוער ממש, אלא מוקף להבה… כי האש היתה לוהטת בין הקוצים, אך לא היתה נאחזת בהם',
         idea='The fire blazes among the thorns but never takes hold of them',
         story='The seneh is a thorn bush that grew on that mountain, which is why it is called Sinai. Shadal says the bush “burned” only in the sense of being wrapped in flame. The fire leapt between the thorns but did not catch on them, and only on a second look did Moshe see the bush wasn’t burning up. A thorn bush that slots together, with four flames standing in the gaps between its branches, and Moshe’s sandals left at the side.'),
    dict(slug='vaera', he='וָאֵרָא', en='Va’era', ref=S('Exodus', '9:31'), verse='Shemot 9:31', fn=k_vaera,
         quote='גבעל: מל׳ גביע, והוא הנקרא בפרחים calix… כל שהפרח מונח בתוך כיסו קודם שיפתח',
         idea='Giv’ol is the calyx: the flax was in closed bud when the hail came',
         story='Why did the hail break the flax and barley but not the wheat? The barley was in the ear, and the flax was giv’ol. With Gesenius and the Bartenura, Shadal derives the word from gavia, a cup: the calyx, the flower still closed in its cup before it opens. Flax with closed round buds, barley in the ear, wheat barely up, and hailstones on the ground.'),
    dict(slug='bo', he='בֹּא', en='Bo', ref=S('Exodus', '12:9'), verse='Shemot 12:9', fn=k_bo,
         quote='נא: בערבי חי, ובלתי מבושל כל צרכו… ובשל מבושל במים: נ״ל… כי בשל הוא שם התאר, ומבשל במים הוא פירושו',
         idea='Not raw, not boiled: na is “raw” as in Arabic, and the lamb is roasted whole',
         story='“Do not eat it na, or boiled in water, only roasted over fire, its head with its legs.” Shadal glosses na from Arabic as raw or underdone, and reads “boiled in water” as explaining the word before it. The Pesach lamb roasts whole on a spit between two forked posts, over a fire that slots together, with a matzah at the side.'),
    dict(slug='beshalach', he='בְּשַׁלַּח', en='Beshalach', ref=S('Exodus', '16:31'), verse='Shemot 16:31', fn=k_beshalach,
         quote='כזרע גד: בצורתו, ולבן במראהו… כצפיחית בדבש: בצק הנילוש בדבש… בצק שטוח ודק',
         idea='Coriander-seed shaped, white, and tasting like a thin honey wafer when eaten raw',
         story='The manna was like coriander seed in its shape and white in colour. Shadal notes that the Carthaginians called coriander goid. Tzapichit is dough kneaded with honey and spread thin. Eaten as it was, it tasted like that; ground, it tasted like oil cake, which squares the two verses. A layer of dew dotted with seeds, the jar that was kept before God, and a thin wafer.'),
    dict(slug='yitro', he='יִתְרוֹ', en='Yitro', ref=S('Exodus', '19:13'), verse='Shemot 19:13', fn=k_yitro,
         quote='הנוגע בהר מות יומת, אך לא ילכו אחריו… ובשעת מעשה פירש מי הם אשר יעלו, ואצילי העם עומדים במקום העם כלו',
         idea='When the horn sounds “they” may go up: said of the people, carried out by their leaders',
         story='No one may follow a person who touches the mountain; he is stoned or shot from a distance. Then “when the yovel sounds long, they may go up the mountain”. Shadal disagrees with the Gaon that “they” means only Aharon and the elders. It means the people, and when the time came it was spelled out who would go up, with the leaders standing in for everyone. Sinai inside its boundary fence, with the horn and the cloud on top.'),
    dict(slug='mishpatim', he='מִשְׁפָּטִים', en='Mishpatim', ref=S('Exodus', '21:6'), verse='Shemot 21:6', fn=k_mishpatim,
         quote='אל האלהים: אל השופטים… כדי שאם העבד ינחם אח״כ… לא יוכל להכחיש כי ברצונו נתעכב אצלו',
         idea='Before the judges, so the servant can’t later deny he chose to stay',
         story='“His master brings him to elohim”: to the judges. Shadal explains that the piercing is done in front of them so that if the servant regrets it and tires of serving, he cannot deny that he stayed by choice. Shadal also suggests that ear-piercing was made a mark of servitude to keep Israel from a custom, found among the Persians and Indians, of piercing children’s ears to dedicate them to idols. The doorway, a door on a pin, the awl, the servant and two judges.'),
    dict(slug='terumah', he='תְּרוּמָה', en='Terumah', ref=S('Exodus', '25:18'), verse='Shemot 25:18', fn=k_terumah,
         quote='כרובים: כמו הפוך רכוב… נקראו כן מפני שהם רכב אלהים… מקשה: מענין קשה, שלא יהיו חלולים',
         idea='Keruv is rechuv turned around: God’s chariot. Mikshah means solid, not hollow',
         story='Keruvim, Shadal says, is rechuv with the letters swapped: they are God’s chariot, as in “He rode on a keruv”. Mikshah comes from kasheh, hard: solid, not hollow, cut from one block of gold rather than hammered, so they must have been small. Shlomo’s ten-cubit keruvim were wood covered in gold for that reason. The ark with its carrying poles in their rings, the kaporet, and two solid gold keruvim facing each other.'),
    dict(slug='tetzaveh', he='תְּצַוֶּה', en='Tetzaveh', ref=S('Exodus', '27:20'), verse='Shemot 27:20', fn=k_tetzaveh,
         quote='כתית: תאר לשמן, וכן זך, ולא לזית. תמיד: כל ערב וערב, ולא היה דולק אלא מערב עד בקר',
         idea='“Crushed” describes the oil, not the olives; “always” means every evening, till morning',
         story='Two small readings in one verse. Katit, crushed, describes the oil, like zach, pure, and not the olives. Tamid does not mean the lamp burned day and night: it means every single evening, and it burned from evening until morning, as the next verse says. A lamp on its stand, olives crushed in a mortar, a jug of oil, and a moon and star behind.'),
    dict(slug='ki-tisa', he='כִּי תִשָּׂא', en='Ki Tisa', ref=S('Exodus', '32:4'), verse='Shemot 32:4', fn=k_ki_tisa,
         quote='העגל לא היה לע״ז… אלא שיהיה כלי מקבל שפע האל, ויעמוד להם למנהיג במקום משה… בחרט: ל׳ החריטים',
         idea='The calf was meant as a leader in Moshe’s place, and cheret is a bag',
         story='The calf was not meant to be a god, Shadal says, with the Kuzari, Ibn Ezra and Ramban. It was meant to receive God’s flow and lead them in place of Moshe, since Aharon was only a man. And Aharon “bound it bacheret”: in a bag, as with the charitim, purses, in Isaiah. The calf on its pedestal, the bag the gold was gathered in, and earrings.'),
    dict(slug='vayakhel', he='וַיַּקְהֵל', en='Vayakhel', ref=S('Exodus', '38:8'), verse='Shemot 38:8', fn=k_vayakhel,
         quote='קצת הנשים קבעו לעצמן חק ללכת פתח אהל משה… לעשות מלאכה בתרומת הקדש, כגון לטוות את העזים… והן נתנו מראותיהן',
         idea='Women who kept regular shifts of work at the tent gave their copper mirrors for the laver',
         story='Mirrors were polished copper, the most refined and smoothest copper, so they suited the laver. Who were “the women who gathered”? Tzava is a fixed term of service, Shadal says: some women set themselves regular times to come to Moshe’s tent, where the donations were brought, and work on them, spinning the goats’ hair. They gave their mirrors. The laver on its stand, three copper hand mirrors and a spindle.'),
    dict(slug='pekudei', he='פְקוּדֵי', en='Pekudei', ref=S('Exodus', '40:38'), verse='Shemot 40:38', fn=k_pekudei,
         quote='בלילה היה אש בתוך הענן, הענן היה תמיד ביום ובלילה, אלא שבלילה היה אש בתוכו',
         idea='The cloud was there day and night; at night there was fire inside it',
         story='Not a cloud by day that turned into fire by night: Shadal reads “fire would be in it by night” as fire inside the cloud. The cloud was always there, and at night fire glowed within it. The Mishkan with a translucent cloud that lifts off to show the fire inside.'),
    dict(slug='vayikra', he='וַיִּקְרָא', en='Vayikra', ref=S('Leviticus', '2:7'), verse='Vayikra 2:7', fn=k_vayikra,
         quote='מרחשת: עמוקה, לא כן מחבת… וראיה לזה וכל נעשה במרחשת (בתוכה) ועל המחבת (עליה)',
         idea='The marcheshet is deep and the machavat flat: made in one, made on the other',
         story='Two of the meal-offering pans. The marcheshet is deep and the machavat is not, and Shadal’s proof is the grammar of 7:9: “made in the marcheshet” but “on the machavat”. A flat griddle with flat cakes on it and a deep pot with the dough inside, each on its own hearth stones.'),
    dict(slug='tzav', he='צַו', en='Tzav', ref=S('Leviticus', '8:8'), verse='Vayikra 8:8', fn=k_tzav,
         quote='ואולי היו כ״ב אותיות חקוקות על כ״ב תחיכות קטנות… האל״ף היתה נקראת אוּר, והת״ו היתה נקראת תם',
         idea='The Urim and Tumim were 22 letter tiles, from alef (“ur”) to tav (“tam”)',
         story='Moshe put the Urim and Tumim into the choshen when Aharon dressed, so they were not fixed in it. Shadal suggests they were twenty-two small tiles carved with the letters, which the kohen drew out one by one, God guiding the answer. Alef was called ur and tav was called tam, and the whole set, alef to tav, was the Urim and Tumim. That fits the tradition that the answer came from letters. A choshen pouch with its twelve stones, and twenty-two letter tiles to draw out of it.'),
    dict(slug='shemini', he='שְּׁמִינִי', en='Shemini', ref=S('Leviticus', '10:1'), verse='Vayikra 10:1', fn=k_shemini,
         quote='בחרו הם לעצמם עבודה יקרה… ובהיותם בלתי בטוחים שתצא אש ה׳ לאכול את קטרת אשר לא צוה, הוצרכו להביא אש זרה',
         idea='Not sure God’s fire would come for an offering no one asked for, they brought their own',
         story='Shadal gave up his own earlier view that Nadav and Avihu were offering the morning incense. Why would that need two pans? Their sin was pride. Not content to assist their father, they chose a grand service for themselves. Because they weren’t sure God’s fire would come down for incense He hadn’t asked for, they had to bring fire of their own: the incense wasn’t strange, the fire was. The altar with God’s fire, and two firepans with fire brought from outside.'),
    dict(slug='tazria', he='תַזְרִיעַ', en='Tazria', ref=S('Leviticus', '13:2'), verse='Vayikra 13:2', fn=k_tazria,
         quote='אין הכוונה שהאיש עצמו יבא אל הכהן, כי הכהן הוא ההולך אליו אבל הכוונה שיוגד הדבר אל הכהן',
         idea='“He is brought to the kohen”: the matter is reported, and the kohen goes to the person',
         story='“He shall be brought to Aharon the kohen” doesn’t mean the person comes to the kohen, Shadal says. The kohen is the one who goes. It means the matter is brought to him, as in “when they have a matter, it comes to me”. The person sits at home by their tent, and the kohen walks to them over stepping stones.'),
    dict(slug='metzora', he='מְּצֹרָע', en='Metzora', ref=S('Leviticus', '14:37'), verse='Vayikra 14:37', fn=k_metzora,
         quote='שקערורות: אנקלוס פַחְתָן, ענין גומות… נגעי הבתים היו נקראים כך להיותם כעין גומות',
         idea='Sheka’arurot are hollows: a house’s mark looks like pits sunk into the wall',
         story='Sheka’arurot, from ka’ar, are hollows (Onkelos: pachtan, pits). A mark in a house is named for how it looks, sunk below the wall, as the verse goes on to say. If the stones are pulled out and the mark breaks out again in the new ones, that is what “spreading” means here. A stone house with two stones that come out: one green and pitted, one new to put in its place, and a pile of stones taken out.'),
    dict(slug='acharei-mot', he='אַחֲרֵי מוֹת', en='Acharei Mot', ref=S('Leviticus', '16:8'), verse='Vayikra 16:8', fn=k_acharei_mot,
         quote='גורלות: גרלון בערבי אבן. עזאזל… והשעיר היה משתלח לאבדון במדבר… על דרך ותשליך במצולות ים כל חטאתם',
         idea='The lots were stones, and the goat carried the sins off to a land cut off',
         story='Goralot, lots, were stones: Shadal points to the Arabic word for a stone. Azazel, Shadal suggests, was once a name for an evil power, kept by believers in one God only as a word for utter ruin. The goat was sent off into a land cut off to die, carrying the people’s sins with it, as in “You will cast all their sins into the depths of the sea.” Only later, when the land was settled and there was no more empty country, was it pushed off a cliff. Two goats, two lot stones and their urn, and the rocky land.'),
    dict(slug='kedoshim', he='קְדֹשִׁים', en='Kedoshim', ref=S('Leviticus', '19:14'), verse='Vayikra 19:14', fn=k_kedoshim,
         quote='לא תקלל חרש וגו׳: אזהרה למזיק בסתר ואומר לא יראני אדם',
         idea='Don’t curse the deaf or trip the blind: a warning to whoever harms in secret',
         story='Shadal’s whole comment is one line. Cursing the deaf and putting a stumbling block before the blind are a warning to anyone who does harm in secret and says to himself “no one will see me”. A road with a stumbling block that lifts out, a blind man feeling his way, and a figure hiding behind a wall.'),
    dict(slug='emor', he='אֱמֹר', en='Emor', ref=S('Leviticus', '23:17'), verse='Vayikra 23:17', fn=k_emor,
         quote='ממושבותיכם תביאו: מכל מקום שיהיה בארצכם, כלו׳ ממקום שיבכר תחלה, משם תביאו לחם הבכורים',
         idea='“From your dwellings”: from wherever in the land ripens first',
         story='The two loaves of Shavuot come “from your dwellings”, from anywhere in your land. Shadal adds that this means from the place that ripens first. Bring the first bread from there. A field that has ripened gold beside one still green, and two loaves on a tray.'),
    dict(slug='behar', he='בְּהַר', en='Behar', ref=S('Leviticus', '25:10'), verse='Vayikra 25:10', fn=k_behar,
         quote='יו-בֵל… הוא קול של שמחה… והתורה קדשה השמחה, וצותה שיהיה הזמן ההוא זמן גאולה ודרור לעניים',
         idea='Yovel was a pagan shout of joy; the Torah made the joy a release for the poor',
         story='The word yovel was known before the Torah, Shadal suggests: yo, a shout of joy, plus bel, a god’s name, like the Greek Io Paean. The Torah made that joy holy and turned it into a year of release for the poor: fields go home, servants go free, and rich and poor share the crops. The keren hayovel, he says, isn’t a ram’s horn, just the horn blown for that joy. A family field with its boundary stone, the horn on its stand, and an opened shackle.'),
    dict(slug='bechukotai', he='בְּחֻקֹּתַי', en='Bechukotai', ref=S('Leviticus', '26:26'), verse='Vayikra 26:26', fn=k_bechukotai,
         quote='עשר נשים: מעשר משפחות',
         idea='Ten women baking in one oven: ten whole households sharing one oven’s bread',
         story='In the curse of famine, “ten women will bake your bread in one oven.” With Ibn Ezra, Shadal reads it as ten families: what used to fill ten households’ ovens now fits in one. A single tanur with its lid, and ten small loaves set round it.'),
    dict(slug='bamidbar', he='בְּמִדְבַּר', en='Bamidbar', ref=S('Numbers', '2:17'), verse='Bamidbar 2:17', fn=k_bamidbar,
         quote='ונסע אהל מועד: כלומר יסע מחנה הלוים ועמו אהל מועד',
         idea='The Ohel Moed travels inside the Levites’ camp, in the middle of the march',
         story='“Then the Ohel Moed shall set out, the camp of the Levites in the middle of the camps.” Shadal: the Levites’ camp travels and the Mishkan travels with it. A ring of Levite tents carrying the Mishkan in the middle, with the four tribal flags, one on each side.'),
    dict(slug='naso', he='נָשֹׂא', en='Naso', ref=S('Numbers', '6:4'), verse='Bamidbar 6:4', fn=k_naso,
         quote='חרצנים הוא לדעתי שם לענבים שכבר נדרכו… והוא כולל הקליפה והגרעינים… ואמנם זג הוא לדעתי שם גרעינים שבתוך הקליפה',
         idea='Chartzanim are the pressed grapes, skin and all; zag is the pip inside',
         story='The nazir may not eat anything from the vine, “from chartzanim to zag”. Shadal sides with R’ Yehuda and the Jerusalem Targum. Chartzanim are grapes already trodden for wine, skins and pips together, the stuff that was sold for cheap wine when grapes were scarce, and zag is the pip inside. He explains why Onkelos, following R’ Yosi of Tzippori, reads it the other way. A cluster with its leaf, a grape opened to show its pips, pressed skins, and a cup.'),
    dict(slug='behaalotecha', he='בְּהַעֲלֹתְךָ', en='Beha’alotecha', ref=S('Numbers', '8:2'), verse='Bamidbar 8:2', fn=k_behaalotecha,
         quote='היה מטה ראשי הפתילות של כל שבעת הנרות להאיר אל השלחן',
         idea='All seven wicks were turned to shine toward the table',
         story='“The seven lamps shall give light toward the face of the menorah.” With Rashbam, Shadal says Aharon tilted the wick-ends of all seven lamps to shine toward the table. The menorah with seven clay lamps, each spout turned toward the table and its bread.'),
    dict(slug='shelach', he='שְׁלַח־לְךָ', en='Shelach', ref=S('Numbers', '13:19'), verse='Bamidbar 13:19', fn=k_shelach,
         quote='הבמחנים: ערי פרזי הדומות למחנה, כי אין להם חומה סביב',
         idea='Machanim are open towns that look like a camp, with no wall around them',
         story='Moshe asks the spies whether the towns are “bemachanim or bemivtzarim”. Shadal: machanim are open towns with no wall, which look like a camp. A walled city with towers and houses inside, a few tents of an open town, a spy, and the pole carrying the great cluster.'),
    dict(slug='korach', he='קֹרַח', en='Korach', ref=S('Numbers', '17:2'), verse='Bamidbar 17:2', fn=k_korach,
         quote='השרפה: שם מופשט, במקום השרופים. זְרֵה: כמשמעו, אמור אליו זרה הלאה את האש',
         idea='Pull the pans from among the burnt, and scatter the fire away',
         story='Elazar is told to lift the firepans “from amid the burning”: an abstract noun, Shadal says, meaning from among the burnt men. Then “scatter the fire away”, in its plain sense. The pans were hammered into plating for the altar. The altar with its copper plating, two firepans, the scattered coals, and Elazar.'),
    dict(slug='chukat', he='חֻקַּת', en='Chukat', ref=S('Numbers', '21:17'), verse='Bamidbar 21:17', fn=k_chukat,
         quote='ענו לה: ואמרו לה בשיריכם עלי באר עלי באר',
         idea='“Sing to it”: say to the well in your songs, Rise, O well!',
         story='The song of the well: “Rise up, O well, sing to it.” Shadal reads anu lah as addressing the well, saying to it in your songs, “Rise, well! Rise, well!” A stone well with its water rising, the princes’ staffs that dug it, and a singer with arms raised.'),
    dict(slug='balak', he='בָּלָק', en='Balak', ref=S('Numbers', '22:24'), verse='Bamidbar 22:24', fn=k_balak,
         quote='גדר מזה וגדר מזה: מכאן ומכאן היה גדר, והוא קיר, ואחר הקיר כרם',
         idea='A wall on each side of the lane, and behind each wall a vineyard',
         story='The angel stands in “the lane of the vineyards, a fence on this side and a fence on that side”. Shadal draws the picture: on each side a wall of stone, and behind each wall a vineyard. So the donkey had nowhere to go but against the wall. Two stone walls with vines behind them, the donkey and the angel.'),
    dict(slug='pinchas', he='פִּינְחָס', en='Pinchas', ref=S('Numbers', '27:17'), verse='Bamidbar 27:17', fn=k_pinchas,
         quote='יש במשמע אפילו אדם כל שהוא, אשר יותן כתר מלכות בראשו… בלי שיהיה כדאי להנהיגם, לפיכך הוסיף ואשר יוציאם ואשר יביאם',
         idea='Not just a figure at the head: one who actually leads them out and brings them in',
         story='Moshe asks for someone “who will go out before them and come in before them, who will lead them out and bring them in.” Why both? Shadal: the first half could mean anyone with a crown on his head who marches at the front without being fit to lead. So Moshe adds that he must actually lead them out and bring them in. A shepherd leading three sheep out of the fold.'),
    dict(slug='matot', he='מַטּוֹת', en='Matot', ref=S('Numbers', '32:16'), verse='Bamidbar 32:16', fn=k_matot,
         quote='גדרות צאן: הזכירו תחלה הצאן והמקנה, כי עיקר שאלתם היה בשביל המקנה',
         idea='They named the sheepfolds first because the livestock was what they cared about',
         story='Reuven and Gad offer to build “sheepfolds for our cattle here, and towns for our children”. Shadal notes, crediting Yehuda Luzzatto, that they put the flocks first because the livestock was the whole point of their request. (Rashi brings the midrash that Moshe corrects the order.) A stone sheepfold with sheep inside, and a small town behind it.'),
    dict(slug='masei', he='מַסְעֵי', en='Masei', ref=S('Numbers', '35:4'), verse='Bamidbar 35:4', fn=k_masei,
         quote='המגרש היה נמשך אלף אמה חוץ לחומה, אבל מחוץ לעיר כלומר מחוץ לבתים, היה אלפים אמה… והמנהג הזה מצאנוהו אצל הרומיים… (Pomerium)',
         idea='A thousand cubits from the wall, two thousand from the houses: open ground inside the wall too',
         story='The Levites’ open land is “a thousand cubits from the wall” and then “two thousand cubits outside the city”. Shadal rejects the Septuagint’s fix and the theories of Ramban, Clericus and Rosenmüller. One verse measures from the wall and the other from the houses: there was open ground inside the wall as well as outside, like the pomerium Romulus left when he founded Rome. A stacking toy: open land, the wall, the empty band inside it, then the houses.'),
    dict(slug='devarim', he='דְּבָרִים', en='Devarim', ref=S('Deuteronomy', '3:11'), verse='Devarim 3:11', fn=k_devarim,
         quote='העמונים קיימו מטתו לזכרון גבורתם שנצחוהו ולקחו את ארצו; כל זה לחזק ציור הישועה',
         idea='Og’s iron bed was kept in Rabbah as a trophy, and Moshe mentions it to give them courage',
         story='Why mention Og’s bed? Moshe is telling how great the victory over Sichon and Og was, so the people will trust God with Canaan too. Og was the last of the giant Rephaim, and his iron bed was famous. Following Ramban, Shadal says the Ammonites kept it in Rabbah as a memorial of having beaten him. He argues at length that the verse is no later addition. A nine-cubit iron bed, with an ordinary man beside it for scale.'),
    dict(slug='vaetchanan', he='וָאֶתְחַנַּן', en='Va’etchanan', ref=S('Deuteronomy', '6:8'), verse='Devarim 6:8', fn=k_vaetchanan,
         quote='כדרך שוכתבתם על מזוזות וגו׳ אינו דרך משל, וגם הישמעאלים כותבים פסוקי הקוראן על פתחיהם, כן א״א שיהיה משל וקשרתם',
         idea='Writing on doorposts is literal, so binding on the arm can’t be a metaphor either',
         story='Some read “bind them as a sign on your hand” as a figure of speech. Shadal answers from the next verse. “Write them on the doorposts of your house” is plainly literal; Muslims, he notes, write verses of the Quran over their doorways. So “bind them” can’t be a metaphor either. A doorway with a mezuzah on the post, and tefillin with their strap.'),
    dict(slug='ekev', he='עֵקֶב', en='Ekev', ref=S('Deuteronomy', '8:4'), verse='Devarim 8:4', fn=k_ekev,
         quote='לא חסרת חליפות שמלות עד שתבלה שמלתך על בשרך… שהיו לך נעלים להחליף… לא אמר שהיה בזה נס, אלא שלא חסרו דבר',
         idea='No miracle: God gave them spare clothes and shoes to change into',
         story='“Your clothes did not wear out on you, and your feet did not swell these forty years.” Shadal, with Clericus, reads it without a miracle: you always had clothes to change into, so none wore out while you were wearing it, and shoes to change, so you never went barefoot and got calluses (batzek is a hard callus, not swelling). Nechemiah says the same: they lacked nothing. A traveller, a peg with a spare cloak, and spare sandals.'),
    dict(slug='reeh', he='רְאֵה', en='Re’eh', ref=S('Deuteronomy', '11:29'), verse='Devarim 11:29', fn=k_reeh,
         quote='הר גריזים הוא מקום מרעה טוב ושדות ופרדסים, והר עיבל הוא סלע קשה ובלתי מצמיח, והנה בכל עת שיראו אותם יזכרו הברכה והקללה',
         idea='Green Gerizim and bare Eival: every time they see them, they remember',
         story='“Put the blessing on Gerizim and the curse on Eival” is done with words, Shadal says. The ark and the Levites stood between the mountains and turned to Gerizim for the blessings and to Eival for the curses. And the choice of mountains is no accident: Gerizim is good pasture, fields and orchards, and Eival is hard rock where nothing grows, so whenever they see them they remember. A green mountain with orchards, a bare grey one, and the ark between.'),
    dict(slug='shoftim', he='שֹׁפְטִים', en='Shoftim', ref=S('Deuteronomy', '20:19'), verse='Devarim 20:19', fn=k_shoftim,
         quote='עיקר המצוה הוא שלא יכרות העץ אחר שאכל מפירותיו, וזה אמנם כדי להרחיק את האדם ממדת כפוי טובה… בירא דשתית מניה מיא לא תשדי ביה קלא',
         idea='Don’t cut down a tree you have eaten from: a lesson against ingratitude',
         story='Others explain the law by self-interest: you may need the fruit later. “That is not why the Torah was given,” Shadal says, “to teach people to calculate their own gain.” The heart of it is not to cut down a tree after you have eaten its fruit, so as not to be an ingrate, like the Talmud’s “don’t throw a stone into the well you drank from.” Then the verse asks, “Is the tree of the field a man, to retreat from you into the siege?” A besieged city’s wall, a fruit tree, its fruit on the ground, and the axe put down.'),
    dict(slug='ki-teitzei', he='כִּי תֵצֵא', en='Ki Teitzei', ref=S('Deuteronomy', '22:6'), verse='Devarim 22:6', fn=k_ki_teitzei,
         quote='היא מאהבתה את בניה תשליך את נפשה מנגד ותעמוד שם להצילם… שאם היה מותר לקחת האם… היה מתרשם בלב האדם כי החמלה ענין גרוע',
         idea='She stays because she loves them; taking her would teach that compassion doesn’t pay',
         story='When someone approaches a nest, the mother could fly off and save herself. She stays to protect her young. If we were allowed to take her, Shadal says, her love would be the very thing that got her caught, and people would learn that compassion is foolishness that harms whoever has it. Because it is forbidden, the worth of compassion is engraved in our hearts. A nest with the mother bird guarding her chicks and eggs.'),
    dict(slug='ki-tavo', he='כִּי תָבוֹא', en='Ki Tavo', ref=S('Deuteronomy', '27:2'), verse='Devarim 27:2', fn=k_ki_tavo,
         quote='הכתיבה היתה… על גבי הסיד, ולא חקקוה בגוף האבנים, כי לא היתה הכתיבה לדורות, אלא לשעה',
         idea='The Torah was written on the plaster, not carved in the stone: it was for that day',
         story='The great stones were coated with lime and the Torah was written on the plaster, as R’ Shimon says in Sotah. It wasn’t carved into the stone itself, Shadal explains, because it wasn’t meant to last for generations. It was there for the moment, so the Torah would be in front of them while they took on the blessing and the curse. Two great stones with plaster coats that slide on and off, and a small altar of whole stones.'),
    dict(slug='nitzavim', he='נִצָּבִים', en='Nitzavim', ref=S('Deuteronomy', '30:3'), verse='Devarim 30:3', fn=k_nitzavim,
         quote='מלת שבות… איננה מלשון שביה וגלות, אלא משרש שוב… החזרת האדם או הגוי למעמדו הראשון; וראיה לזה וה׳ שב את שבות איוב',
         idea='Shevut is from shuv, not shevi: putting someone back as they were',
         story='“God will restore your shevut” is usually read “bring back your captivity”. Shadal says shevut comes from shuv, return, not shevi, captivity: it means restoring a person or a nation to its former state. His proof is that God “restored the shevut of Iyov”, who was never captive, and of Sodom, which never went into exile. A little house that comes apart and goes back together just as it was.'),
    dict(slug='vayelech', he='וַיֵּלֶךְ', en='Vayelech', ref=S('Deuteronomy', '31:21'), verse='Devarim 31:21', fn=k_vayelech,
         quote='השירה תעיד לפניו, להזכירו כי בחטאתו נענש, ושכבר התרה בו האל… לפי עקר הוראת המלה שהוא: מזכיר, מזהיר ומַתְרֶה',
         idea='The song testifies before them: a witness here means a reminder that they were warned',
         story='“This song will answer before him as a witness.” Shadal points out it says before him, not against him. The song won’t testify to judges. It will remind Israel, when trouble comes, that they were warned what would happen, which is what the root ‘ed means at bottom: to remind and warn. The song written on a scroll on its stand, facing a listener, with Moshe beside it.'),
    dict(slug='haazinu', he='הַאֲזִינוּ', en='Ha’azinu', ref=S('Deuteronomy', '32:11'), verse='Devarim 32:11', fn=k_haazinu,
         quote='כנשר יעיר קנו… שהיה משגיח בעין פקוחה עליהם כנשר על בניו… יעיר: הנכון כפי׳ רש״י יעיר את קינו בנחת להביאו אל מקום אחר',
         idea='The eagle stirs its nest gently to move it, and keeps hovering over its young',
         story='“Like an eagle that stirs its nest, hovering over its young.” Shadal follows Rashi: the eagle rouses its nest gently to carry it somewhere else. Yerachef means moving, and the intensive form means it keeps it up. So God watched over Israel with open eyes. A crag with a nest of chicks, and the eagle hovering over them on a pin.'),
    dict(slug='vezot-haberachah', he='וְזֹאת הַבְּרָכָה', en='Vezot Haberachah', ref=S('Deuteronomy', '33:17'), verse='Devarim 33:17', fn=k_vezot,
         quote='בכור שורו איננו יהושע… הוא יוסף שהוא דומה לבכור שור… והקרנים הם רבבות אפרים ואלפי מנשה',
         idea='The firstborn ox is not Yehoshua but Yosef himself, and his horns are Ephraim and Menashe',
         story='“His firstborn ox, majesty is his.” Many read the ox as Yehoshua. Shadal says no: the horns are “the myriads of Ephraim and the thousands of Menashe”, the whole tribe of Yosef, and Yehoshua fought with all of Israel. The ox is Yosef, strong as a firstborn bull. It is like saying “his majesty” and meaning the king. An ox with two great horns that pin on: Ephraim and Menashe.'),
]


# ---------------------------------------------------------------- export

def to_tm(m):
    return pl.to_trimesh(m)


def build_kit(n, kit):
    slug = kit['slug']
    out = OUT / slug
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob('*'):
        if f.suffix in ('.stl', '.3mf', '.glb', '.zip'):
            f.unlink()
    parts = kit['fn'](n)
    scene = trimesh.Scene()
    plate, meta, total_g, max_h, stls = [], [], 0.0, 0.0, []
    for p in parts:
        bodies = [(p['name'], p['mesh'], p['colour'])] + [(nm, m, c) for nm, m, c in p['inlays']]
        places = p['places'] or [None]
        for k, pl_ in enumerate(places):
            for nm, m, c in bodies:
                mm = m.rotate((0, 0, pl_[3])).translate(pl_[:3]) if pl_ else m
                tm = pl.yup(to_tm(mm))
                tm.visual = trimesh.visual.TextureVisuals(material=pl.material(c))
                node = p['name'] if nm == p['name'] else f"{p['name']}--{nm}"
                if pl_:
                    node = f"{node}--{k + 1}"
                scene.add_geometry(tm, node_name=node, geom_name=node)
        # print pose
        if p['pm'] is not None and not p['inlays']:
            printed = [(p['name'], to_tm(pl.on_bed(p['pm'], (0, 0, 0))), p['colour'])]
            gm = [p['pm']]
        else:
            whole = union(*[m for _, m, _ in bodies])
            rotd = whole.rotate(p['rot'])
            x0, y0, z0, x1, y1, z1 = rotd.bounding_box()
            sh = (-(x0 + x1) / 2, -(y0 + y1) / 2, -z0)
            printed = [(nm, to_tm(m.rotate(p['rot']).translate(sh)), c) for nm, m, c in bodies]
            gm = [m for _, m, _ in bodies]
        for nm, t, _ in printed:
            assert len(t.faces), f'{slug}/{nm} is empty'
        bb = np.vstack([t.bounds for _, t, _ in printed])
        sx, sy, sz = bb.max(axis=0) - bb.min(axis=0)
        for nm, tm, c in printed:
            assert tm.is_watertight, f'{slug}/{nm} is not watertight'
            stem = f"{slug}-{p['name']}" + ('' if nm == p['name'] else f'-{nm}')
            stls.append((f'{stem}.stl', tm.export(file_type='stl')))
        g = sum(pl.estimate(m) for m in gm)
        total_g += g * p['qty']
        for q in range(p['qty']):
            plate.append(dict(name=p['label'] if p['qty'] == 1 else f"{p['label'].split(' ×')[0]} {q + 1}", bodies=printed, size=(sx, sy)))
        max_h = max(max_h, sz)
        ex = p['explode']
        meta.append(dict(name=p['name'], label=p['label'], qty=p['qty'], colour=p['colour'], hex=FILAMENT[p['colour']],
                         inlays=[dict(name=nm, colour=c, hex=FILAMENT[c]) for nm, _, c in p['inlays']],
                         size=[round(sx, 1), round(sy, 1), round(sz, 1)], grams=round(g * p['qty'], 1),
                         explode=[ex[0], ex[2], -ex[1]]))
    try:
        xy = pl.pack([it['size'] for it in plate])
    except ValueError:
        xy = pl.pack([it['size'] for it in plate], bed=250)
        print(f'  ! {slug}: parts need more than one A1 mini plate', flush=True)
    for it, pos in zip(plate, xy):
        it['xy'] = pos
    pl.write_3mf(out / f'{slug}-plate.3mf', plate, f"Parsha toys: {kit['en']} ({kit['he']})")
    scene.export(out / f'{slug}.glb')
    with zipfile.ZipFile(out / f'{slug}-stl.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in stls:
            z.writestr(name, data)
    layers = max_h / 0.2
    minutes = round(6 + total_g / 9.0 * 60 * 0.55 + layers * 0.05 + len(plate) * 1.5)
    book = kit['ref'].split(' on ')[1].rsplit(' ', 1)[0]
    return dict(slug=slug, number=n, he=kit['he'], en=kit['en'], book=book, verse=kit['verse'], ref=kit['ref'],
                sefaria='https://www.sefaria.org/' + kit['ref'].replace(' ', '_').replace(':', '.'),
                quote=kit['quote'], idea=kit['idea'], story=kit['story'], numeral=gematria(n),
                parts=meta, pieces=len(plate), grams=round(total_g, 1), metres=round(total_g / pl.G_PER_M, 1), minutes=minutes,
                colours=sorted({p['hex'] for p in meta}),
                files=dict(plate=f'{slug}-plate.3mf', zip=f'{slug}-stl.zip', glb=f'{slug}.glb', img=f'{slug}.webp'))


def main():
    only = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    data_path = OUT / 'kits.json'
    old = json.loads(data_path.read_text()) if data_path.exists() else {'kits': []}
    old_by = {k['slug']: k for k in old['kits']}
    kits = []
    for n, kit in enumerate(KITS, 1):
        if only and kit['slug'] not in only:
            if kit['slug'] in old_by:
                kits.append(old_by[kit['slug']])
            continue
        print('building', n, kit['slug'], flush=True)
        kits.append(build_kit(n, kit))
    data_path.write_text(json.dumps(dict(kits=kits), ensure_ascii=False, indent=1))
    for k in kits:
        print(f"{k['number']:>2} {k['en']:<18} {k['pieces']:>2} pieces  {k['grams']:>5} g  ~{k['minutes']} min")


if __name__ == '__main__':
    main()
