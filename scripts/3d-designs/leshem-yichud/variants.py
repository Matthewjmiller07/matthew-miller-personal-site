"""More Leshem Yichud designs, each with its own stand style.

  python scripts/3d-designs/leshem-yichud/variants.py [key ...]

Writes public/3d/leshem-yichud/<key>/: a 3-part 3MF, one STL per colour, a stand STL, a GLB of
the card on its stand (for the page and for spin.py's GIF), a flat PNG, and variants.json
next to stats.json. Shares the text, fonts, logo trace and estimates with build.py.

  heichal   arched like the doors of an aron kodesh; burgundy, ivory, gold; a stepped pedestal
  bookmark  a slim siddur bookmark with a ribbon hole; black, ivory, gold; a round disc base
  luchot    two tablets, the text in two columns; Jerusalem stone, brown, bronze; an easel
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageDraw
from shapely import affinity
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

sys.path.insert(0, str(Path(__file__).parent))
import build as B  # noqa: E402

OUT = B.OUT


def hexrgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


VARIANTS = {
    'heichal': dict(
        label='Heichal', he='הֵיכָל', w=80, h=125, base=1.6, mirror=True, stand='steps', tilt=10.0,
        colors={'body': '#5E1A26', 'text': '#F4ECD8', 'accent': '#D9A441'},
        names={'body': 'Burgundy', 'text': 'Ivory', 'accent': 'Gold'},
        blurb='Arched like the doors of an aron kodesh, with a keystone over the logo. '
              'It stands on a stepped pedestal, like the steps up to the ark.'),
    'bookmark': dict(
        label='Siddur bookmark', he='סִימָנִיָּה', w=50, h=170, base=1.4, mirror=False, stand='disc', tilt=6.0,
        colors={'body': '#17181C', 'text': '#F1EAD9', 'accent': '#CDA349'},
        names={'body': 'Black', 'text': 'Ivory', 'accent': 'Gold'},
        blurb='A slim bookmark that lives in the siddur, with a hole at the top for a ribbon or tassel. '
              'Its stand is a round disc with a slot, so it can stand on the shelf too.'),
    'luchot': dict(
        label='Luchot', he='לוּחוֹת', w=112, h=124, base=1.8, mirror=True, stand='easel', tilt=15.0,
        colors={'body': '#D6C49B', 'text': '#3B2A1E', 'accent': '#9C5B2A'},
        names={'body': 'Jerusalem stone', 'text': 'Dark brown', 'accent': 'Bronze'},
        blurb='Shaped like the two tablets, the text in two columns, right to left. '
              'Sand-coloured "stone" with brown letters and a bronze frame, on a little easel.'),
}

RELIEF = {'text': B.RELIEF['white'], 'accent': B.RELIEF['gold']}
MINW = 0.6


# ---------------------------------------------------------------- outlines

def smooth(g, convex=0.0, concave=0.0):
    if concave:
        g = g.buffer(concave, quad_segs=16).buffer(-concave, quad_segs=16)
    if convex:
        g = g.buffer(-convex, quad_segs=16).buffer(convex, quad_segs=16)
    return g


def ring(g, inset, width):
    a = g.buffer(-inset, join_style=1)
    return a.difference(a.buffer(-width, join_style=1))


def outline(key, W, H):
    if key == 'heichal':
        r = W / 2
        g = box(0, 0, W, H - r).union(Point(W / 2, H - r).buffer(r, quad_segs=48))
        return smooth(g, convex=5), H - r
    if key == 'luchot':
        r = W / 4
        g = unary_union([box(0, 0, W, H - r),
                         Point(W / 4, H - r).buffer(r, quad_segs=48),
                         Point(3 * W / 4, H - r).buffer(r, quad_segs=48)])
        return smooth(g, convex=5, concave=2.5), H - r
    return B.rounded_rect(0, 0, W, H, 5), H


# ---------------------------------------------------------------- layout

def place_logo(cx, top, width):
    lg, lw, (w, h) = B.trace_logo(B.HERE / 'scp-logo.png', width)
    x, y = cx - w / 2, top - h
    return affinity.translate(lg, x, y), affinity.translate(lw, x, y), y


def title_at(face, text, em, cx, top):
    w = face.width(text, em)
    g = face.render(text, em, cx - w / 2, top - em * 0.72)
    return g


def shin_box(face, cx, y0, eb, s):
    bx = B.rounded_rect(cx - eb / 2, y0, cx + eb / 2, y0 + eb, 1.6 * s)
    em = eb * 0.92
    sw = face.width('ש', em)
    return [bx.difference(bx.buffer(-max(0.8 * s, MINW))), face.render('ש', em, cx - sw / 2, y0 + eb * 0.2)]


def split_words(words):
    """Split the prayer for two columns at the word nearest half the letters."""
    total = sum(len(w) for w in words)
    acc = 0
    for i, w in enumerate(words):
        acc += len(w)
        if acc >= total / 2:
            return words[:i + 1], words[i + 1:]
    return words, []


def design(key, v, body_face, title_face, words):
    W, H = v['w'], v['h']
    base, spring = outline(key, W, H)
    accent, text, holes = [], [], []

    if key == 'heichal':
        s = W / 105
        accent += [ring(base, 2.0 * s, max(1.2 * s, MINW)), ring(base, 4.4 * s, MINW)]
        accent.append(B.diamond(W / 2, H - 4.4 * s, 2.0 * s, 2.4 * s))  # keystone
        for x in (4.4 * s, W - 4.4 * s):  # capitals where the arch springs
            accent.append(B.diamond(x, spring, 1.5 * s, 1.5 * s))
        lg, lw, y = place_logo(W / 2, H - 10.5 * s, 26 * s)
        t = title_at(title_face, 'הֲנָחַת תְּפִלִּין', 6.2 * s, W / 2, y - 2.6 * s)
        y = t.bounds[1] - 2.4 * s
        dv = B.divider(W / 2, y, W * 0.56, max(0.55 * s, MINW), s)
        # keep the body below where the arch starts to narrow; drop the header to sit on it
        cap = spring + 0.15 * (W / 2)
        drop = max(0.0, (y - 2.6 * s) - cap)
        lg, lw, t, dv = (affinity.translate(g, 0, -drop) for g in (lg, lw, t, dv))
        accent += [lg, t, dv]
        text.append(lw)
        body_top = y - drop - 2.6 * s
        m = 7.5 * s
        ey0 = m + 0.2 * s
        eb = 9.0 * s
        accent += shin_box(title_face, W / 2, ey0, eb, s)
        for sgn in (-1, 1):
            x_in, x_out = W / 2 + sgn * (eb / 2 + 2.2 * s), W / 2 + sgn * (W / 2 - m - 1 * s)
            accent.append(box(min(x_in, x_out), ey0 + eb / 2 - MINW / 2, max(x_in, x_out), ey0 + eb / 2 + MINW / 2))
        boxes = [(m + 0.5 * s, ey0 + eb + 2.6 * s, W - m - 0.5 * s, body_top)]
        glass_top = spring

    elif key == 'bookmark':
        s = 0.62
        accent += [ring(base, 1.6, 1.0), ring(base, 3.4, MINW)]
        hole_c = (W / 2, H - 7.0)
        holes.append(Point(*hole_c).buffer(2.6, quad_segs=24))
        accent.append(Point(*hole_c).buffer(4.4, quad_segs=24).difference(Point(*hole_c).buffer(3.4, quad_segs=24)))
        lg, lw, y = place_logo(W / 2, H - 14.0, 22)
        accent.append(lg)
        text.append(lw)
        for word, em in (('לְשֵׁם', 6.0), ('יִחוּד', 6.0)):
            t = title_at(title_face, word, em, W / 2, y - 2.2)
            accent.append(t)
            y = t.bounds[1] - 0.6
        y -= 1.4
        accent.append(B.divider(W / 2, y, W * 0.62, MINW, s))
        body_top = y - 2.2
        eb = 7.0
        ey0 = 6.0
        accent += shin_box(title_face, W / 2, ey0, eb, s)
        boxes = [(5.2, ey0 + eb + 2.4, W - 5.2, body_top)]
        glass_top = None

    else:  # luchot
        s = W / 2 / 70
        r = W / 4
        accent += [ring(base, 2.2 * s, max(1.2 * s, MINW)), ring(base, 4.4 * s, MINW)]
        m = 7.0 * s
        # the logo sits at the foot, between the columns' bases
        lg, lw, ly = place_logo(W / 2, 9.0 * s + 12 * s, 24 * s)
        accent.append(lg)
        text.append(lw)
        col_bot = ly + 12 * s + 2.2 * s
        accent.append(box(W / 2 - MINW / 2, col_bot, W / 2 + MINW / 2, spring - 1.0 * s))  # between the tablets
        boxes = []
        for cx, word in ((3 * W / 4, 'הֲנָחַת'), (W / 4, 'תְּפִלִּין')):  # right tablet first
            t = title_at(title_face, word, 6.4 * s, cx, H - r * 0.62)
            accent.append(t)
            y = t.bounds[1] - 2.0 * s
            accent.append(B.divider(cx, y, W / 2 * 0.62, max(0.55 * s, MINW), s * 0.8))
            top = y - 2.4 * s
            boxes.append((cx - W / 4 + m, col_bot, cx + W / 4 - m, top))
        glass_top = spring

    # body text: one box, or two columns (right column first) with a shared size
    lh_ratio = 1.55
    dil = 0.05
    if len(boxes) == 1:
        bx = boxes[0]
        em = B.fit_paragraph(body_face, words, bx[2] - bx[0], bx[3] - bx[1], lh_ratio) * 0.995
        g, n = B.render_paragraph(body_face, words, em, bx, lh_ratio, dil)
        text.append(g)
    else:
        halves = split_words(words)
        em = min(B.fit_paragraph(body_face, h, b[2] - b[0], b[3] - b[1], lh_ratio) for h, b in zip(halves, boxes)) * 0.995
        n = 0
        for h, b in zip(halves, boxes):
            g, k = B.render_paragraph(body_face, h, em, b, lh_ratio, dil)
            text.append(g)
            n += k

    to_mp = lambda parts: unary_union([p for p in parts if not p.is_empty])
    hole = to_mp(holes) if holes else Polygon()
    base = base.difference(hole)
    accent_g = to_mp(accent).buffer(0.03, join_style=2).buffer(-0.03, join_style=2).intersection(base)
    text_g = to_mp(text).difference(accent_g.buffer(0.1)).intersection(base)
    return dict(base=base, white=text_g, gold=accent_g, body_em=em, lines=n, glass_top=glass_top)


def mirror(v, d):
    if not v['mirror']:
        return None, None, None
    i = B.MIRROR['inset']
    glass = B.rounded_rect(i, i, v['w'] - i, d['glass_top'], B.MIRROR['radius'])
    groove = glass.buffer(B.MIRROR['groove_w'], join_style=1).difference(glass)
    gx0, gy0, gx1, gy1 = glass.bounds
    return glass, groove, (round(gx1 - gx0, 1), round(gy1 - gy0, 1))


# ---------------------------------------------------------------- stands

def prism(profile, x0, x1):
    """Extrude a side profile (y, z) across x0..x1."""
    m = trimesh.creation.extrude_polygon(profile, x1 - x0)
    m.apply_transform([[0, 0, 1, x0], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1]])
    return m


def slab(shape, z0, z1):
    m = trimesh.creation.extrude_polygon(shape, z1 - z0)
    m.apply_translation([0, 0, z0])
    return m


def stand(v):
    """Card-holding stand in the variant's style. Returns mesh, card placement, dims."""
    W, H = v['w'], v['h']
    k = W / 105 if v['stand'] != 'disc' else 0.62
    t = math.radians(v['tilt'])
    card_t = v['base'] + RELIEF['accent']
    sw = card_t + (B.MIRROR['t'] if v['mirror'] else 0) + B.STAND['clearance']
    L = W + 0.8
    zf = 2.5
    tan = math.tan(t)
    front_at = lambda y0, z: y0 + (z - zf) * tan + 1.0  # 1 mm inside the slot so it's cut away
    parts = []

    if v['stand'] == 'steps':
        Ws, D = W + 16 * k, 42 * k
        h1, h2 = 3.2 * k + 1.5, 6.4 * k + 2.0
        hb = zf + 14 * k * math.cos(t)
        y0 = 0.46 * D
        parts.append(slab(B.rounded_rect(0, 0, Ws, D, 2.0 * k), 0, h1))
        parts.append(slab(B.rounded_rect(4 * k, 4 * k, Ws - 4 * k, D - 4 * k, 1.6 * k), 0, h2))
        back_top = y0 + sw / math.cos(t) + (hb - zf) * tan + 3.5 * k
        spine = Polygon([(front_at(y0, h2), h2), (front_at(y0, hb), hb), (back_top, hb), (D - 4 * k, h2)])
        parts.append(prism(spine, 7 * k, Ws - 7 * k))
        dims = dict(w=Ws, d=D, h=hb)

    elif v['stand'] == 'disc':
        R = (L + 10) / 2
        Ws, D = 2 * R, 2 * R
        y0 = R - sw / 2
        hb = zf + 11.0 * math.cos(t)
        disc = Point(R, R).buffer(R, quad_segs=48)
        parts.append(slab(disc, 0, 2.2))
        parts.append(slab(disc.buffer(-1.2), 0, 3.4))  # a little bevel step
        boss = B.rounded_rect(R - L / 2 - 3, y0 - 3.5, R + L / 2 + 3, y0 + sw + (hb - zf) * tan + 3.5, 2.5)
        parts.append(slab(boss, 0, hb))
        dims = dict(w=Ws, d=D, h=hb)

    else:  # easel: a slotted ledge across the front, two legs that rise to the card's back
        Ws = W + 8 * k
        ledge_d = 14 * k
        y0 = 4 * k
        hl = zf + 4.5 * k  # front lip
        zc = 0.55 * H * math.cos(t)  # where the legs meet the card
        y_touch = y0 + sw / math.cos(t) + (zc - zf) * tan
        D = y_touch + zc * 0.42
        lw = 6 * k
        parts.append(prism(Polygon([(0, 0), (ledge_d, 0), (ledge_d, hl), (1.2 * k, hl), (0, hl - 1.2 * k)]), 0, Ws))
        leg = Polygon([(ledge_d - 2, 0), (D, 0), (D - 0.5, 3.0), (y_touch + 4.5 * k, zc + 2), (y_touch - 1.0, zc + 2),
                       (y_touch - 1.0, zc - 3), (ledge_d - 2, 3.0)])
        for x0 in (0, Ws - lw):
            parts.append(prism(leg, x0, x0 + lw))
        hb = zc + 2
        dims = dict(w=Ws, d=D, h=hb)

    body = trimesh.boolean.union(parts, engine='manifold') if len(parts) > 1 else parts[0]
    place = trimesh.transformations.translation_matrix([dims['w'] / 2, y0, zf]) @ \
        trimesh.transformations.rotation_matrix(-t, [1, 0, 0])
    slot = trimesh.creation.box([L, sw, 1.2 * H])
    slot.apply_translation([0, sw / 2, 0.6 * H])
    slot.apply_transform(place)
    mesh = trimesh.boolean.difference([body, slot], engine='manifold')
    to_slot = np.array([[1, 0, 0, -W / 2], [0, 0, -1, card_t + 0.1], [0, 1, 0, 0], [0, 0, 0, 1]], dtype=float)
    dims = {k2: round(x, 1) for k2, x in dims.items()}
    dims.update(slot=round(sw, 1), tilt=v['tilt'], style=v['stand'])
    return mesh, place @ to_slot, dims


# ---------------------------------------------------------------- output

def pbr(hexcolor, metallic=0.0, rough=0.55):
    return trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
        baseColorFactor=[*hexrgb(hexcolor), 255], roughnessFactor=rough, metallicFactor=metallic))


def flat_png(path, v, d, px_per_mm=8):
    """Top-down render: each colour layer rasterised as its own mask, then stacked."""
    W, H = v['w'], v['h']
    size = (int(W * px_per_mm), int(H * px_per_mm))
    img = Image.new('RGB', size, (12, 14, 20))
    pts = lambda ring_: [(x * px_per_mm, (H - y) * px_per_mm) for x, y in ring_.coords]
    for role, g in (('body', d['base']), ('text', d['white']), ('accent', d['gold'])):
        mask = Image.new('L', size, 0)
        dr = ImageDraw.Draw(mask)
        for p in B.polys_of(g):
            dr.polygon(pts(p.exterior), fill=255)
            for hole in p.interiors:
                dr.polygon(pts(hole), fill=0)
        img.paste(Image.new('RGB', size, tuple(hexrgb(v['colors'][role]))), (0, 0), mask)
    img.save(path)


def main(keys):
    words = B.clean_text((B.HERE / 'text.he.txt').read_text()).split(' ')
    body_face, title_face = B.Face(780), B.Face(900)
    manifest_path = OUT / 'variants.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for key in keys:
        v = VARIANTS[key]
        out = OUT / key
        out.mkdir(parents=True, exist_ok=True)
        d = design(key, v, body_face, title_face, words)
        T, G = v['base'], B.MIRROR['groove_d']
        glass, groove, glass_wh = mirror(v, d)
        if groove is not None:
            body = trimesh.boolean.union([B.extrude(d['base'].difference(groove), 0, G + 0.01),
                                          B.extrude(d['base'], G, T - G)], engine='manifold')
        else:
            body = B.extrude(d['base'], 0, T)
        meshes = {'body': body, 'text': B.extrude(d['white'], T, RELIEF['text']),
                  'accent': B.extrude(d['gold'], T, RELIEF['accent'])}
        stem = f'leshem-yichud-{key}'
        for role, m in meshes.items():
            m.export(out / f'{stem}-{role}.stl')
        B.write_3mf(out / f'{stem}.3mf', list(meshes.items()), f"Leshem Yichud — {v['label']}", colors=v['colors'])
        stand_mesh, card_in_slot, sdims = stand(v)
        stand_mesh.export(out / f'{stem}-stand.stl')

        scene = trimesh.Scene()
        for role, m in meshes.items():
            mm = m.copy()
            mm.visual = pbr(v['colors'][role], metallic=0.6 if role == 'accent' else 0.0, rough=0.3 if role == 'accent' else 0.55)
            scene.add_geometry(mm.apply_transform(card_in_slot), node_name=role)
        if glass is not None:
            gm = B.extrude(glass, -B.MIRROR['t'], B.MIRROR['t'])
            gm.visual = pbr('#EBF0F5', metallic=1.0, rough=0.04)
            scene.add_geometry(gm.apply_transform(card_in_slot), node_name='mirror')
        sm = stand_mesh.copy()
        sm.visual = pbr(v['colors']['accent' if v['stand'] == 'easel' else 'body'],
                        metallic=0.6 if v['stand'] == 'easel' else 0.0, rough=0.35)
        scene.add_geometry(sm, node_name='stand')
        scene.export(out / f'{stem}-stand-preview.glb')
        flat_png(out / f'{stem}-flat.png', v, d)

        est = B.estimate(d, T)
        rename = {'navy': 'body', 'white': 'text', 'gold': 'accent'}
        est['grams'] = {rename[c]: g for c, g in est['grams'].items()}
        manifest[key] = dict(
            label=v['label'], he=v['he'], blurb=v['blurb'], w=v['w'], h=v['h'],
            thickness=round(T + RELIEF['accent'], 1), base=T,
            colors=[dict(role=r, name=v['names'][r], hex=v['colors'][r]) for r in ('body', 'text', 'accent')],
            mirror=dict(w=glass_wh[0], h=glass_wh[1]) if glass_wh else None,
            body_em_mm=round(d['body_em'], 2), lines=d['lines'],
            watertight=all(m.is_watertight for m in [*meshes.values(), stand_mesh]),
            stand=dict(**sdims, **B.stand_estimate(stand_mesh)), **est)
        print(key, json.dumps(manifest[key], ensure_ascii=False)[:400])
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main(sys.argv[1:] or list(VARIANTS))
