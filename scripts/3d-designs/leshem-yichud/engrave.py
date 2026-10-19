"""Leshem Yichud card as flat artwork for a laser, a vinyl cutter or a printer.

Writes one SVG per size into public/3d/leshem-yichud/engrave/, in millimetres:
  leshem-yichud-<size>.svg         black fill = engrave (text, frame, logo), red hairline = cut outline
  leshem-yichud-<size>-mirror.svg  the same, mirrored, for engraving the back of clear acrylic

Glowforge and Epilog both read black fills as engrave and a thin red stroke as a cut. Cricut and
Silhouette import the same file: hide the red outline and cut the black as vinyl.

Also writes public/3d/leshem-yichud/leshem-yichud-<size>-one-colour.stl (the three colour STLs
merged), for print services that take one file and print it in one colour. Run build.py first.

  python scripts/3d-designs/leshem-yichud/engrave.py
"""
import trimesh
from shapely import affinity
from shapely.ops import unary_union

from build import OUT, SIZES, HERE, Face, clean_text, design, polys_of

DEST = OUT / 'engrave'


def path_d(g, H):
    """SVG path data for a shapely geometry, flipping y so the card reads upright."""
    out = []
    for p in polys_of(g):
        for ring in [p.exterior, *p.interiors]:
            pts = [f'{x:.3f} {H - y:.3f}' for x, y in ring.coords[:-1]]
            out.append('M' + ' L'.join(pts) + 'Z')
    return ''.join(out)


def svg(d, W, H, title):
    art = unary_union([d['white'], d['gold']]).simplify(0.01)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">
  <title>{title}</title>
  <g id="engrave"><path fill="#000" fill-rule="evenodd" d="{path_d(art, H)}"/></g>
  <g id="cut"><path fill="none" stroke="#f00" stroke-width="0.01" d="{path_d(d['base'], H)}"/></g>
</svg>
'''


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    words = clean_text((HERE / 'text.he.txt').read_text()).split(' ')
    body_face, title_face = Face(780), Face(900)
    for size in SIZES:
        W, H = size['w'], size['h']
        d = design(size, body_face, title_face, words)
        stem = f"leshem-yichud-{size['key']}"
        (DEST / f'{stem}.svg').write_text(svg(d, W, H, f"Leshem Yichud ({size['label']}, {W} x {H} mm)"))
        flip = lambda g: affinity.scale(g, xfact=-1, origin=(W / 2, H / 2))
        m = dict(base=flip(d['base']), white=flip(d['white']), gold=flip(d['gold']))
        (DEST / f'{stem}-mirror.svg').write_text(svg(m, W, H, f"Leshem Yichud ({size['label']}, mirrored)"))
        # One STL with all three parts, for print services that take a single file in one colour
        one = trimesh.util.concatenate([trimesh.load(OUT / f'{stem}-{c}.stl') for c in ('navy', 'white', 'gold')])
        one.export(OUT / f'{stem}-one-colour.stl')
        print(stem, W, H)


if __name__ == '__main__':
    main()
