#!/usr/bin/env python3
"""Build the ready-made WarmHouse prototype homes shown on /warmhouse: three house styles common in
Chicago and the North Shore, each in four colours on a lawn plate, written in the same JSON format
as model_to_json.py (millimetres x100, z up, centred, sitting on z = 0).

  python3 scripts/warmhouse/make_prototypes.py public/warmhouse/models
"""
import json, math, os, sys

IVORY, CHARCOAL, GREEN = "#F4F1EA", "#34312F", "#61C680"
G = 3.0  # top of the lawn plate


class Model:
    def __init__(self):
        self.parts = {}

    def tri(self, col, a, b, c):
        p = self.parts.setdefault(col, {"v": [], "i": []})
        n = len(p["v"]) // 3
        for q in (a, b, c):
            p["v"] += [round(q[0] * 100), round(q[1] * 100), round(q[2] * 100)]
        p["i"] += [n, n + 1, n + 2]

    def quad(self, col, a, b, c, d):
        self.tri(col, a, b, c); self.tri(col, a, c, d)

    def prism(self, col, poly, z0, z1):
        """Extrude a convex polygon (counter-clockwise x,y points) from z0 to z1."""
        n = len(poly)
        for k in range(1, n - 1):
            self.tri(col, (*poly[0], z1), (*poly[k], z1), (*poly[k + 1], z1))
            self.tri(col, (*poly[0], z0), (*poly[k + 1], z0), (*poly[k], z0))
        for k in range(n):
            a, b = poly[k], poly[(k + 1) % n]
            self.quad(col, (*a, z0), (*b, z0), (*b, z1), (*a, z1))

    def box(self, col, x0, x1, y0, y1, z0, z1):
        self.prism(col, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], z0, z1)

    def hip(self, col, x0, x1, y0, y1, z, h, ov=2.5):
        x0 -= ov; x1 += ov; y0 -= ov; y1 += ov
        c = [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]
        if x1 - x0 >= y1 - y0:
            i = (y1 - y0) / 2; a = (x0 + i, (y0 + y1) / 2, z + h); b = (x1 - i, (y0 + y1) / 2, z + h)
            self.quad(col, c[0], c[1], b, a); self.quad(col, c[2], c[3], a, b)
            self.tri(col, c[3], c[0], a); self.tri(col, c[1], c[2], b)
        else:
            i = (x1 - x0) / 2; a = ((x0 + x1) / 2, y0 + i, z + h); b = ((x0 + x1) / 2, y1 - i, z + h)
            self.quad(col, c[1], c[2], b, a); self.quad(col, c[3], c[0], a, b)
            self.tri(col, c[0], c[1], a); self.tri(col, c[2], c[3], b)
        self.quad(col, c[3], c[2], c[1], c[0])

    def gable(self, col, wall, x0, x1, y0, y1, z, h, ov=2.0):
        """Ridge runs front to back; the gable end faces the street."""
        xm = (x0 + x1) / 2
        self.tri(wall, (x0, y0, z), (x1, y0, z), (xm, y0, z + h))
        self.tri(wall, (x1, y1, z), (x0, y1, z), (xm, y1, z + h))
        s = ov * h / ((x1 - x0) / 2)
        a0, a1 = (x0 - ov, y0 - ov, z - s), (x0 - ov, y1 + ov, z - s)
        b0, b1 = (x1 + ov, y0 - ov, z - s), (x1 + ov, y1 + ov, z - s)
        r0, r1 = (xm, y0 - ov, z + h), (xm, y1 + ov, z + h)
        for t in (0.0, 1.2):  # two skins so the roof has thickness from every side
            up = lambda p: (p[0], p[1], p[2] + t)
            self.quad(col, up(a0), up(r0), up(r1), up(a1)); self.quad(col, up(b1), up(r1), up(r0), up(b0))
            self.quad(col, up(a1), up(r1), up(r0), up(a0)); self.quad(col, up(b0), up(r0), up(r1), up(b1))

    def tree(self, x, y, r, trunk=7.0, col=GREEN):
        self.box(CHARCOAL, x - 0.9, x + 0.9, y - 0.9, y + 0.9, G, G + trunk)
        z = G + trunk + r * 0.75
        ring = [(x + r * math.cos(k * math.pi / 3), y + r * math.sin(k * math.pi / 3), z) for k in range(6)]
        top, bot = (x, y, z + r * 1.05), (x, y, z - r * 0.9)
        for k in range(6):
            a, b = ring[k], ring[(k + 1) % 6]
            self.tri(col, a, b, top); self.tri(col, b, a, bot)

    def shrub(self, x, y, r, col=GREEN):
        ring = [(x + r * math.cos(k * math.pi / 3), y + r * math.sin(k * math.pi / 3), G + r * 0.5) for k in range(6)]
        for k in range(6):
            a, b = ring[k], ring[(k + 1) % 6]
            self.tri(col, a, b, (x, y, G + r * 1.3)); self.tri(col, b, a, (x, y, G))

    def window(self, x, y, z, w=6.0, h=8.0, trim=IVORY, face="front"):
        """A dark pane with a light sill, standing 0.5 mm proud of a wall at depth y (or x for side walls)."""
        if face == "front":
            self.box(CHARCOAL, x - w / 2, x + w / 2, y - 0.5, y, z, z + h)
            self.box(trim, x - w / 2 - 0.8, x + w / 2 + 0.8, y - 0.9, y, z - 1.0, z)
        else:
            self.box(CHARCOAL, x - 0.5, x, y - w / 2, y + w / 2, z, z + h)

    def save(self, path, plate=(110.0, 100.0)):
        self.box(GREEN, -plate[0] / 2, plate[0] / 2, -plate[1] / 2, plate[1] / 2, 0, G)
        zmax = max(v for p in self.parts.values() for v in p["v"][2::3]) / 100
        data = {"size": [plate[0], plate[1], round(zmax, 1)],
                "parts": [{"color": c, "v": p["v"], "i": p["i"]} for c, p in self.parts.items()]}
        with open(path, "w") as f:
            json.dump(data, f, separators=(",", ":"))
        print(os.path.basename(path), data["size"], sum(len(p["i"]) for p in data["parts"]) // 3, "triangles")


def colonial(out):
    """North Shore center-entrance colonial with an attached garage."""
    m = Model(); BRICK = "#A4513B"
    m.box(IVORY, -36, 14, -4, 24, G, G + 30)
    m.hip(CHARCOAL, -36, 14, -4, 24, G + 30, 13)
    m.box(IVORY, 14, 42, -1, 21, G, G + 15)
    m.hip(CHARCOAL, 14, 42, -1, 21, G + 15, 9, ov=2)
    m.box(BRICK, -34, -28, 6, 13, G + 30, G + 50)                        # chimney
    m.box(BRICK, -14, -8, -4.6, -4, G, G + 12)                           # front door
    m.box(IVORY, -17, -5, -10, -4, G + 13, G + 15)                       # portico
    m.gable(CHARCOAL, IVORY, -17, -5, -10, -4, G + 15, 4, ov=1)
    for x in (-16, -6):
        m.box(IVORY, x - 0.8, x + 0.8, -9.6, -8, G, G + 13)
    m.box(IVORY, -17, -5, -10, -4.6, G, G + 1.2)
    for x in (-29, -20, -2, 7):
        for z in (G + 5, G + 19):
            m.window(x, -4, z)
            for s in (-4.2, 4.2):
                m.box(BRICK, x + s - 1, x + s + 1, -4.4, -4, z, z + 8)   # shutters
    m.window(-11, -4, G + 19)
    for y in (4, 16):
        for z in (G + 5, G + 19):
            m.window(-36, y, z, face="side")
    m.box(CHARCOAL, 18, 38, -1.5, -1, G, G + 11)                         # garage door
    for z in (G + 2.7, G + 5.4, G + 8.1):
        m.box(IVORY, 18, 38, -1.8, -1.5, z, z + 0.5)
    m.box(CHARCOAL, 17, 39, -50, -1, G, G + 0.6)                         # driveway
    m.box(IVORY, -13, -9, -50, -10, G, G + 0.6)                          # front walk
    m.box(BRICK, -34, -19, -8, -4.6, G, G + 1.6); m.box(BRICK, -3, 12, -8, -4.6, G, G + 1.6)
    for x in (-31, -26, -21, 0, 5, 10):
        m.shrub(x, -6.3, 2.2)
    m.tree(-38, -30, 8, 9); m.tree(3, -34, 6.5, 7); m.tree(-45, 36, 9, 10); m.tree(46, 36, 7, 8)
    m.save(os.path.join(out, "north-shore-colonial.json"))


def greystone(out):
    """Chicago greystone: three storeys, a bay front, a stoop and an iron fence."""
    m = Model(); STONE = "#B7B0A2"
    top = G + 50
    m.box(STONE, -20, 20, -8, 38, G, top)
    bay = [(-18, -8), (-14, -15), (-2, -15), (2, -8)]
    m.prism(STONE, bay, G, top)
    m.box(CHARCOAL, -21.5, 21.5, -9.5, 39, top, top + 1.2)               # roof deck
    m.box(IVORY, -22, 22, -10.5, -8, top - 3, top + 2.6)                 # cornice
    m.prism(IVORY, [(-19.5, -8), (-14.8, -16.5), (-1.2, -16.5), (3.5, -8)], top - 3, top + 2.6)
    for z in (G + 16, G + 32):                                           # belt courses
        m.prism(IVORY, [(-18.6, -8), (-14.3, -15.6), (-1.7, -15.6), (2.6, -8)], z, z + 1.2)
        m.box(IVORY, 2, 20.5, -8.6, -8, z, z + 1.2)
    for z in (G + 5, G + 20, G + 36):
        m.window(-8, -15, z, w=7, h=9, trim=IVORY)
        if z > G + 6:
            m.window(11, -8, z, w=7, h=9, trim=IVORY)
    for z in (G + 5, G + 20, G + 36):                                    # the bay's angled panes
        for (ax, ay), (bx, by) in ((bay[0], bay[1]), (bay[2], bay[3])):
            mx, my = (ax + bx) / 2, (ay + by) / 2
            dx, dy = (bx - ax), (by - ay); L = math.hypot(dx, dy); dx, dy = dx / L, dy / L
            nx, ny = dy, -dx
            p = [(mx - dx * 2.2, my - dy * 2.2), (mx + dx * 2.2, my + dy * 2.2)]
            m.prism(CHARCOAL, [p[0], p[1], (p[1][0] + nx * 0.5, p[1][1] + ny * 0.5), (p[0][0] + nx * 0.5, p[0][1] + ny * 0.5)], z, z + 9)
    DOOR = CHARCOAL
    m.box(DOOR, 7.5, 14.5, -8.6, -8, G + 6, G + 17)                      # raised front door
    m.box(IVORY, 6.5, 15.5, -9, -8, G + 17, G + 18.5)
    for k in range(5):                                                   # stoop
        m.box(IVORY, 6, 16, -8 - 2.4 * (k + 1), -8 - 2.4 * k, G, G + 6 - 1.2 * k)
    for x in (5.4, 16.6):
        m.box(CHARCOAL, x - 0.4, x + 0.4, -20, -8, G + 6, G + 9.5)
    for y in (0, 12, 24):
        for z in (G + 5, G + 20, G + 36):
            m.window(-20, y, z, w=5, h=8, face="side")
    m.box(IVORY, -55, 55, -50, -38, G, G + 0.6)                          # sidewalk
    m.box(IVORY, 8, 14, -38, -20, G, G + 0.6)
    m.box(CHARCOAL, -40, 5, -26.4, -25.6, G + 5.5, G + 6.3); m.box(CHARCOAL, 17, 40, -26.4, -25.6, G + 5.5, G + 6.3)
    for x in list(range(-40, 6, 5)) + list(range(17, 41, 5)) + [40]:     # fence posts
        m.box(CHARCOAL, x - 0.4, x + 0.4, -26.4, -25.6, G, G + 7.5)
    m.box(DOOR, -16, 0, -20, -16.5, G, G + 1.6)                          # planting bed
    for x in (-13, -8, -3):
        m.shrub(x, -18.2, 2.3)
    m.tree(-36, -32, 8, 12); m.tree(33, -32, 7, 11); m.tree(-38, 30, 9, 10)
    m.box(CHARCOAL, 26, 46, 14, 40, G, G + 13); m.box(STONE, 25, 47, 13, 41, G + 13, G + 14.5)  # coach garage
    m.save(os.path.join(out, "chicago-greystone.json"))


def modern(out):
    """Lakefront modern: stacked flat-roofed volumes, wood cladding and walls of glass."""
    m = Model(); WOOD = "#B27A45"
    m.box(IVORY, -42, 26, -4, 28, G, G + 15)
    m.box(CHARCOAL, -43, 27, -5, 29, G + 15, G + 16.2)
    m.box(WOOD, -18, 44, 0, 26, G + 16.2, G + 31)                        # cantilevered upper floor
    m.box(CHARCOAL, -19.5, 45.5, -1.5, 27.5, G + 31, G + 32.4)
    m.box(CHARCOAL, 40, 42, 10, 12, G, G + 16.2)                         # post under the cantilever
    m.box(CHARCOAL, -14, 22, -4.5, -4, G + 2, G + 13.5)                  # ground-floor glass wall
    for x in (-5, 4, 13):
        m.box(IVORY, x - 0.4, x + 0.4, -4.8, -4.5, G + 2, G + 13.5)
    m.box(CHARCOAL, -12, 38, -0.5, 0, G + 19, G + 29)                    # upper glass band
    for x in (-2, 8, 18, 28):
        m.box(WOOD, x - 0.4, x + 0.4, -0.8, -0.5, G + 19, G + 29)
    m.box(CHARCOAL, 44, 44.5, 4, 22, G + 19, G + 29)
    m.box(WOOD, -22, -16, -4.6, -4, G, G + 12.5)                         # front door
    m.box(CHARCOAL, -39, -25, -4.5, -4, G, G + 11)                       # garage door
    for z in (G + 2.7, G + 5.4, G + 8.1):
        m.box(IVORY, -39, -25, -4.8, -4.5, z, z + 0.4)
    m.box(CHARCOAL, -40, -24, -50, -4, G, G + 0.6)                       # driveway
    m.box(WOOD, -14, 30, -18, -4.5, G, G + 1.4)                          # deck
    m.box(IVORY, -22, -16, -50, -4.6, G, G + 0.6)                        # entry walk
    m.box(IVORY, -14, 30, -19.5, -18, G, G + 3)                          # low garden wall
    for x in (-8, 2, 12, 22):
        m.shrub(x, -22.5, 2.6)
    m.box(CHARCOAL, 34, 50, -40, -24, G, G + 0.8); m.box(IVORY, 35.5, 48.5, -38.5, -25.5, G + 0.8, G + 1.1)  # reflecting pool
    m.tree(8, -38, 7.5, 9); m.tree(-47, 38, 8.5, 10); m.tree(48, 38, 7, 9); m.tree(-48, -34, 5.5, 7)
    m.save(os.path.join(out, "lakefront-modern.json"))


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "public/warmhouse/models"
    colonial(out); greystone(out); modern(out)
