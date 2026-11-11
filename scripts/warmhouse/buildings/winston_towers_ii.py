#!/usr/bin/env python3
"""Winston Towers II (6833 N Kedzie Ave, Chicago): a 15-storey tan-brick tower in a shallow V,
its wings angled toward the street around a fountain courtyard, bronze balcony stacks and a white
entrance canopy. Too irregular for the house-spec builder, so it is drawn here directly.

  python3 scripts/warmhouse/buildings/winston_towers_ii.py public/warmhouse/models
"""
import math, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import make_prototypes  # noqa: E402
from make_prototypes import Model, G  # noqa: E402

BRICK, BRONZE, WHITE, LAWN = "#D0B898", "#4B4038", "#F2F0EA", "#61C680"
make_prototypes.CHARCOAL = BRONZE  # tree trunks
make_prototypes.GREEN = LAWN       # the plate
FLOORS, FH = 15, 3.2
TOP = G + FLOORS * FH


def add(a, b, s=1.0):
    return (a[0] + b[0] * s, a[1] + b[1] * s)


def ccw(poly):
    area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    return poly if area > 0 else poly[::-1]


def face(m, p0, p1, out, windows=True, balconies=()):
    """Windows (and balcony slabs over the stretches in `balconies`, as 0..1 ranges) on the wall p0->p1,
    whose outward normal is `out`."""
    L = math.dist(p0, p1)
    d = ((p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L)
    n = max(1, int(L / 3.0))
    for f in range(FLOORS):
        z = G + f * FH + 1.0
        for k in range(n):
            t = (k + 0.5) / n
            if any(a <= t <= b for a, b in balconies):
                continue
            c = add(p0, d, t * L)
            a, b = add(add(c, d, -0.7), out, 0.12), add(add(c, d, 0.7), out, 0.12)
            if windows:
                m.quad(BRONZE, (*a, z), (*b, z), (*b, z + 1.6), (*a, z + 1.6))
        for a0, b0 in balconies:
            s, e = add(p0, d, a0 * L), add(p0, d, b0 * L)
            # dark recess behind the balcony, then the slab and its railing
            m.quad(BRONZE, (*add(s, out, 0.1), z - 1.0), (*add(e, out, 0.1), z - 1.0), (*add(e, out, 0.1), z + 2.2), (*add(s, out, 0.1), z - 1.0 + 3.2))
            slab = ccw([s, e, add(e, out, 2.4), add(s, out, 2.4)])
            m.prism(BRONZE, slab, z - 1.0, z - 0.4)
            rail = ccw([add(s, out, 2.0), add(e, out, 2.0), add(e, out, 2.4), add(s, out, 2.4)])
            m.prism(BRONZE, rail, z - 0.4, z + 0.6)


def main(out_dir):
    m = Model()
    cos, sin = math.cos(math.radians(30)), math.sin(math.radians(30))
    CL, CR = (-10.0, 22.0), (10.0, 22.0)
    dl, dr = (-cos, -sin), (cos, -sin)          # wings run forward and out from the centre
    nbl, nbr = (-sin, cos), (sin, cos)          # their backs, away from the courtyard
    LT, RT = add(CL, dl, 36), add(CR, dr, 36)
    W = 13.0
    left = [CL, LT, add(LT, nbl, W), add(CL, nbl, W)]
    right = [CR, add(CR, nbr, W), add(RT, nbr, W), RT]
    centre = [CL, CR, add(CR, nbr, W), add(CL, nbl, W)]
    for poly in (left, right, centre):
        m.prism(BRICK, ccw(poly), G, TOP)
        m.prism(BRONZE, ccw(poly), TOP, TOP + 0.8)          # roof
    # Walls facing the courtyard, with balcony stacks near the tips and the inner corners.
    face(m, CL, LT, (sin, -cos), balconies=((0.0, 0.16), (0.78, 0.98)))
    face(m, RT, CR, (-sin, -cos), balconies=((0.02, 0.22), (0.84, 1.0)))
    face(m, CR, CL, (0.0, -1.0))
    # Wing ends and backs.
    face(m, add(LT, nbl, W), LT, dl)
    face(m, RT, add(RT, nbr, W), dr)
    face(m, add(CL, nbl, W), add(LT, nbl, W), nbl)
    face(m, add(RT, nbr, W), add(CR, nbr, W), nbr)
    face(m, add(CR, nbr, W), add(CL, nbl, W), (0.0, 1.0))
    # Entrance canopy with its splayed white columns.
    m.box(WHITE, -7, 7, 13, 22, G + 5.0, G + 6.0)
    for x in (-5.5, 5.5):
        m.box(WHITE, x - 0.7, x + 0.7, 14, 15.4, G, G + 5.0)
    m.box(BRONZE, -3, 3, 21.6, 22, G, G + 3.6)                 # lobby doors
    # Hexagonal fountain pool in the courtyard, ringed by clipped hedges.
    cx, cy, r = 0.0, -2.0, 9.0
    hexp = [(cx + r * math.cos(k * math.pi / 3), cy + r * math.sin(k * math.pi / 3)) for k in range(6)]
    m.prism(WHITE, ccw(hexp), G, G + 0.5)
    inner = [(cx + (r - 1.2) * math.cos(k * math.pi / 3), cy + (r - 1.2) * math.sin(k * math.pi / 3)) for k in range(6)]
    for k in range(6):
        a, b, c, d = hexp[k], hexp[(k + 1) % 6], inner[(k + 1) % 6], inner[k]
        m.prism(WHITE, ccw([a, b, c, d]), G + 0.5, G + 1.4)
    m.box(WHITE, cx - 0.5, cx + 0.5, cy - 0.5, cy + 0.5, G + 0.5, G + 4.5)   # the jet
    for k in range(10):
        ang = math.pi * (0.1 + 0.8 * k / 9)
        m.shrub(cx + 13 * math.cos(ang) * 1.05, cy - 13 * math.sin(ang) * 0.75 + 1, 2.1)
    # Walks: street to fountain, fountain to canopy.
    m.box(WHITE, -2, 2, -50, -12, G, G + 0.5)
    m.box(WHITE, -2, 2, 7, 13, G, G + 0.5)
    m.box(WHITE, -55, 55, -50, -44, G, G + 0.5)                 # Kedzie Avenue sidewalk
    for x, y, rr, t in ((-26, -18, 6.5, 12), (24, -16, 6.5, 12), (-46, -36, 7, 10), (44, -34, 6, 9)):
        m.tree(x, y, rr, t)
    m.save(os.path.join(out_dir, "winston-towers-ii.json"))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "public/warmhouse/models")
