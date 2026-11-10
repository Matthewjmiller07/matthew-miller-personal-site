#!/usr/bin/env python3
"""Build a WarmHouse model from a house spec: a short JSON description of one home (its volumes,
roofs, windows, doors, drive and planting) written from listing photos.

  python3 scripts/warmhouse/build_house.py src/data/warmhouse/specs/<id>.json
      -> public/warmhouse/models/<id>.json   (same format as model_to_json.py)

The spec format is documented in .claude/skills/warmhouse-listing/SKILL.md, with a worked example
in scripts/warmhouse/spec.example.json. Units are millimetres on a 110 x 100 plate centred on 0,0:
x runs left to right as seen from the street, the street is at y = -50, the back at y = +50.
Every surface is one of four colour roles (walls, dark, accent, lawn) so the model stays printable
in four filaments.
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_prototypes  # noqa: E402
from make_prototypes import Model, G  # noqa: E402

FLOOR = 14.0
ROLES = ("walls", "dark", "accent", "lawn")
DEFAULTS = {"walls": "#F4F1EA", "dark": "#34312F", "accent": "#A4513B", "lawn": "#61C680"}


def build(spec):
    m = Model()
    colours = {**DEFAULTS, **{k: v for k, v in spec.get("colors", {}).items() if k in ROLES}}
    trim_role = spec.get("trim", "walls")

    def col(role, default="walls"):
        role = role or default
        if role not in ROLES:
            raise SystemExit(f'Unknown colour role "{role}": use one of {", ".join(ROLES)}.')
        return colours[role]

    trim = col(trim_role)
    make_prototypes.CHARCOAL = colours["dark"]  # tree trunks
    make_prototypes.GREEN = colours["lawn"]     # the plate

    def roof(v, x0, x1, y0, y1, z, wall):
        kind = v.get("roof", "hip")
        c = col(v.get("roof_color"), "dark")
        ov = v.get("roof_overhang", 2.0)
        w, d = x1 - x0, y1 - y0
        if kind == "flat":
            m.box(c, x0 - ov / 2, x1 + ov / 2, y0 - ov / 2, y1 + ov / 2, z, z + 1.3)
            return
        if kind == "hip":
            m.hip(c, x0, x1, y0, y1, z, v.get("roof_height", min(w, d) * 0.42), ov=ov)
            return
        if kind != "gable":
            raise SystemExit(f'Unknown roof "{kind}": use hip, gable or flat.')
        # ridge "x": ridge parallel to the street (side gables). ridge "y": the gable end faces the street.
        along_x = v.get("ridge", "x") == "x"
        span = d if along_x else w
        h = v.get("roof_height", span * 0.42)
        pt = (lambda a, b, zz: (b, a, zz)) if along_x else (lambda a, b, zz: (a, b, zz))
        a0, a1 = (y0, y1) if along_x else (x0, x1)      # across the ridge
        b0, b1 = (x0, x1) if along_x else (y0, y1)      # along the ridge
        am = (a0 + a1) / 2
        for b in (b0, b1):                              # gable-end walls
            m.tri(wall, pt(a0, b, z), pt(a1, b, z), pt(am, b, z + h))
            m.tri(wall, pt(a1, b, z), pt(a0, b, z), pt(am, b, z + h))
        s = ov * h / (span / 2)
        for t in (0.0, 1.2):
            lo0, lo1 = pt(a0 - ov, b0 - ov, z - s + t), pt(a0 - ov, b1 + ov, z - s + t)
            hi0, hi1 = pt(a1 + ov, b0 - ov, z - s + t), pt(a1 + ov, b1 + ov, z - s + t)
            r0, r1 = pt(am, b0 - ov, z + h + t), pt(am, b1 + ov, z + h + t)
            m.quad(c, lo0, r0, r1, lo1); m.quad(c, hi1, r1, r0, hi0)

    def pane(x0, x1, y0, y1, z, h):
        m.box(col("dark"), x0, x1, y0, y1, z, z + h)

    for v in spec.get("volumes", []):
        x0, x1, y0, y1 = (float(v[k]) for k in ("x0", "x1", "y0", "y1"))
        if x1 <= x0 or y1 <= y0:
            raise SystemExit("A volume needs x0 < x1 and y0 < y1.")
        floors = v.get("floors", 1)
        base = G + v.get("z", 0.0)
        top = base + v.get("height", floors * FLOOR)
        wall = col(v.get("color"), "walls")
        w = x1 - x0
        m.box(wall, x0, x1, y0, y1, base, top)
        roof(v, x0, x1, y0, y1, top, wall)

        blocked = []  # spans of the ground-floor front taken by the door, garage or bay
        door = v.get("door")
        if door:
            dx = x0 + w * door.get("at", 0.5)
            dw, dh = door.get("width", 6.0), door.get("height", 11.5)
            steps = int(door.get("steps", 0))
            dz = base + steps * 1.2
            m.box(col(door.get("color"), "accent"), dx - dw / 2, dx + dw / 2, y0 - 0.6, y0, dz, dz + dh)
            for k in range(steps):
                m.box(trim, dx - dw / 2 - 1.5, dx + dw / 2 + 1.5, y0 - 2.4 * (k + 1), y0 - 2.4 * k, base, dz - 1.2 * k)
            if door.get("portico"):
                pd = max(5.0, steps * 2.4 + 1)
                m.box(trim, dx - dw / 2 - 3, dx + dw / 2 + 3, y0 - pd, y0, dz + dh + 1, dz + dh + 2.6)
                for px in (dx - dw / 2 - 2.2, dx + dw / 2 + 2.2):
                    m.box(trim, px - 0.8, px + 0.8, y0 - pd + 0.4, y0 - pd + 2, base, dz + dh + 1)
            blocked.append((dx - dw / 2 - 2, dx + dw / 2 + 2))
        garage = v.get("garage")
        if garage:
            n, gw = int(garage.get("doors", 1)), garage.get("door_width", 10.0)
            total = n * gw + (n - 1) * 1.5
            gx = x0 + w * garage.get("at", 0.5) - total / 2
            for k in range(n):
                a = gx + k * (gw + 1.5)
                m.box(col(garage.get("color"), "dark"), a, a + gw, y0 - 0.5, y0, base, base + 10.5)
                for z in (2.6, 5.2, 7.8):
                    m.box(trim, a, a + gw, y0 - 0.8, y0 - 0.5, base + z, base + z + 0.4)
            blocked.append((gx - 1, gx + total + 1))
        bay = v.get("bay")
        if bay:
            bx = x0 + w * bay.get("at", 0.3)
            bw, bd = bay.get("width", 16.0), bay.get("depth", 6.0)
            btop = base + bay.get("floors", floors) * FLOOR
            poly = [(bx - bw / 2, y0), (bx - bw / 4, y0 - bd), (bx + bw / 4, y0 - bd), (bx + bw / 2, y0)]
            m.prism(wall, poly, base, btop)
            m.prism(trim, [(p[0] * 1.0 + (p[0] - bx) * 0.08, p[1] - (0.6 if p[1] < y0 else 0)) for p in poly], btop, btop + 1.2)
            for f in range(int(bay.get("floors", floors))):
                pane(bx - bw / 4 + 1.2, bx + bw / 4 - 1.2, y0 - bd - 0.5, y0 - bd, base + f * FLOOR + 4, 8)
            blocked.append((bx - bw / 2, bx + bw / 2))

        ww, wh = v.get("window_width", 5.5), v.get("window_height", 7.5)
        n = int(v.get("front_windows", 0))
        for f in range(int(floors)):
            z = base + f * FLOOR + 4
            for k in range(n):
                x = x0 + w * (k + 0.5) / n
                if any(a < x + ww / 2 and x - ww / 2 < b for a, b in blocked) and (f == 0 or (bay and blocked[-1][0] < x < blocked[-1][1])):
                    continue
                pane(x - ww / 2, x + ww / 2, y0 - 0.5, y0, z, wh)
                m.box(trim, x - ww / 2 - 0.7, x + ww / 2 + 0.7, y0 - 0.9, y0, z - 1, z)
                if v.get("shutters"):
                    for s in (-1, 1):
                        m.box(col("accent"), x + s * (ww / 2 + 1.1) - 0.8, x + s * (ww / 2 + 1.1) + 0.8, y0 - 0.4, y0, z, z + wh)
            ns = int(v.get("side_windows", 0))
            for k in range(ns):
                y = y0 + (y1 - y0) * (k + 0.5) / ns
                pane(x0 - 0.5, x0, y - ww / 2, y + ww / 2, z, wh)
                pane(x1, x1 + 0.5, y - ww / 2, y + ww / 2, z, wh)
        for k in range(int(v.get("dormers", 0))):
            x = x0 + w * (k + 0.5) / int(v["dormers"])
            m.box(wall, x - 3, x + 3, y0 + 1, y0 + (y1 - y0) * 0.4, top, top + 6.5)
            pane(x - 1.8, x + 1.8, y0 + 0.5, y0 + 1, top + 1.5, 4)
            m.box(col(v.get("roof_color"), "dark"), x - 3.8, x + 3.8, y0 + 0.2, y0 + (y1 - y0) * 0.4, top + 6.5, top + 7.6)

    for c in spec.get("chimneys", []):
        s = c.get("width", 5.0) / 2
        m.box(col(c.get("color"), "accent"), c["x"] - s, c["x"] + s, c["y"] - s, c["y"] + s, G, G + c["top"])
    d = spec.get("driveway")
    if d:
        m.box(col(d.get("color"), "dark"), d["x0"], d["x1"], -50, d.get("y1", 0), G, G + 0.6)
    k = spec.get("walk")
    if k:
        m.box(trim, k["x"] - 2, k["x"] + 2, k.get("y0", -50), k["y1"], G, G + 0.6)
    if spec.get("sidewalk"):
        m.box(trim, -55, 55, -50, -40, G, G + 0.6)
    f = spec.get("fence")
    if f:
        y, gap = f.get("y", -28.0), f.get("gap")
        for x in range(int(f.get("x0", -50)), int(f.get("x1", 50)) + 1, 5):
            if gap and gap[0] <= x <= gap[1]:
                continue
            m.box(col("dark"), x - 0.4, x + 0.4, y - 0.4, y + 0.4, G, G + 7.5)
            if not (gap and gap[0] <= x + 5 <= gap[1]) and x + 5 <= f.get("x1", 50):
                m.box(col("dark"), x, x + 5, y - 0.4, y + 0.4, G + 5.5, G + 6.3)
    for b in spec.get("beds", []):
        m.box(col(b.get("color"), "dark"), b["x0"], b["x1"], b["y0"], b["y1"], G, G + 1.5)
        for i in range(int(b.get("shrubs", 0))):
            m.shrub(b["x0"] + (b["x1"] - b["x0"]) * (i + 0.5) / b["shrubs"], (b["y0"] + b["y1"]) / 2, b.get("shrub_size", 2.2), col(b.get("shrub_color"), "lawn"))
    for t in spec.get("trees", []):
        m.tree(t["x"], t["y"], t.get("r", 7), t.get("trunk", 8), col(t.get("color"), "lawn"))
    for s in spec.get("shrubs", []):
        m.shrub(s["x"], s["y"], s.get("r", 2.4), col(s.get("color"), "lawn"))
    for e in spec.get("extras", []):
        x0, x1, y0, y1, z0, z1 = e["box"]
        m.box(col(e.get("color")), x0, x1, y0, y1, G + z0, G + z1)

    # The lawn plate is added by save(); keep everything on it.
    lawn = colours["lawn"]
    for p in m.parts.values():
        xs, ys = p["v"][0::3], p["v"][1::3]
        if min(xs) < -5600 or max(xs) > 5600 or min(ys) < -5100 or max(ys) > 5100:
            raise SystemExit("Part of the house hangs off the 110 x 100 plate: keep x within -55..55 and y within -50..50.")
    return m, lawn


def main(spec_path, out_dir="public/warmhouse/models"):
    spec = json.load(open(spec_path))
    m, lawn = build(spec)
    ident = os.path.splitext(os.path.basename(spec_path))[0]
    m.save(os.path.join(out_dir, f"{ident}.json"))
    used = len(m.parts)
    if used > 4:
        raise SystemExit(f"{used} colours used; a WarmHouse model prints in four.")


if __name__ == "__main__":
    main(*sys.argv[1:3])
