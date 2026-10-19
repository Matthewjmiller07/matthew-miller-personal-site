"""Preview images for "Other things to make with it" on the Leshem Yichud page.

Renders the card's real geometry onto procedural materials (wood, acrylic, leather, slate, vinyl,
embroidery, a one-colour PLA print, a laminated card), so the Hebrew in every preview is the actual
text. Writes public/3d/leshem-yichud/make/<idea>.jpg.

  python scripts/3d-designs/leshem-yichud/previews.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from build import OUT, SIZES, HERE, Face, clean_text, design, polys_of

DEST = OUT / 'make'
CANVAS = 800
SS = 2  # supersampling
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- rasterising
def mask_of(g, W, H, px):
    """Even-odd rasterise a shapely geometry (mm, y up) to a float mask [0,1] of size (H*px, W*px)."""
    w, h = round(W * px * SS), round(H * px * SS)
    m = np.zeros((h, w), bool)
    for p in polys_of(g):
        for ring in [p.exterior, *p.interiors]:
            xy = [(x * px * SS, (H - y) * px * SS) for x, y in ring.coords]
            xs, ys = [a for a, _ in xy], [b for _, b in xy]
            x0, y0 = max(int(min(xs)) - 1, 0), max(int(min(ys)) - 1, 0)
            x1, y1 = min(int(max(xs)) + 2, w), min(int(max(ys)) + 2, h)
            tile = Image.new('1', (x1 - x0, y1 - y0), 0)
            ImageDraw.Draw(tile).polygon([(x - x0, y - y0) for x, y in xy], fill=1)
            m[y0:y1, x0:x1] ^= np.array(tile)
    img = Image.fromarray((m * 255).astype(np.uint8)).resize((w // SS, h // SS), Image.LANCZOS)
    return np.asarray(img, np.float32) / 255


def noise(h, w, scale, octaves=4):
    """Smooth fractal noise in [0,1]."""
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        s = max(int(scale / 2 ** o), 1)
        small = rng.random((h // s + 2, w // s + 2)).astype(np.float32)
        big = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((w + s * 2, h + s * 2), Image.BICUBIC), np.float32)[:h, :w] / 255
        out += amp * big
        tot += amp
        amp *= 0.5
    out /= tot
    return (out - out.min()) / (np.ptp(out) + 1e-6)


def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


def mix(a, b, t):
    t = t[..., None] if t.ndim == 2 else t
    return a * (1 - t) + b * t


def col(rgb, h, w):
    return np.broadcast_to(np.array(rgb, np.float32) / 255, (h, w, 3)).copy()


def shade(height, strength, light=(-1, -1.4)):
    """Lambert-ish shading from a heightmap: >0 lit, <0 shadow."""
    gy, gx = np.gradient(height)
    return np.clip(-(gx * light[0] + gy * light[1]) * strength, -1, 1)


# ---------------------------------------------------------------- staging
def background(kind):
    n = CANVAS
    yy, xx = np.mgrid[0:n, 0:n] / n
    if kind == 'desk':  # warm grey linen
        bg = mix(col((214, 208, 198), n, n), col((178, 170, 158), n, n), (yy * 0.6 + xx * 0.4))
        bg *= (0.94 + 0.06 * noise(n, n, 6, 2))[..., None]
    elif kind == 'dark':  # walnut
        g = np.sin(xx * 60 + noise(n, n, 120) * 9) * 0.5 + 0.5
        bg = mix(col((62, 40, 26), n, n), col((92, 62, 40), n, n), g * 0.7 + noise(n, n, 20) * 0.3)
    elif kind == 'window':  # soft daylight blur behind acrylic
        bg = mix(col((150, 172, 190), n, n), col((236, 230, 214), n, n), blur(noise(n, n, 200, 2), 40) * 0.6 + yy * 0.4)
    return bg


def place(bg, rgb, alpha, angle=-3, shadow=0.45, offset=(14, 18), soft=14):
    """Composite an object (rgb HxWx3, alpha HxW) centred on bg, rotated, with a drop shadow."""
    n = CANVAS
    h, w = alpha.shape
    k = min(n * 0.86 / h, n * 0.86 / w)
    size = (round(w * k), round(h * k))
    o = Image.fromarray(np.clip(rgb * 255, 0, 255).astype(np.uint8)).resize(size, Image.LANCZOS)
    a = Image.fromarray(np.clip(alpha * 255, 0, 255).astype(np.uint8)).resize(size, Image.LANCZOS)
    o, a = o.rotate(angle, Image.BICUBIC, expand=True), a.rotate(angle, Image.BICUBIC, expand=True)
    x, y = (n - o.width) // 2, (n - o.height) // 2
    out = Image.fromarray(np.clip(bg * 255, 0, 255).astype(np.uint8))
    if shadow:
        sh = Image.new('L', (n, n), 0)
        sh.paste(a, (x + offset[0], y + offset[1]))
        sh = sh.filter(ImageFilter.GaussianBlur(soft)).point(lambda v: int(v * shadow))
        out = Image.composite(Image.new('RGB', (n, n), (20, 16, 12)), out, sh)
    out.paste(o, (x, y), a)
    return out


def save(img, name):
    DEST.mkdir(parents=True, exist_ok=True)
    img.save(DEST / f'{name}.jpg', quality=84, optimize=True, progressive=True)
    print(name)


# ---------------------------------------------------------------- materials
def wood(card, art):
    h, w = card.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rings = np.sin(xx / w * 38 + noise(h, w, 160) * 7 + yy / h * 1.5) * 0.5 + 0.5
    base = mix(col((232, 199, 152), h, w), col((205, 160, 108), h, w), rings ** 2.2 * 0.55 + noise(h, w, 4, 2) * 0.12)
    burn = blur(art, 0.8)
    engr = mix(col((120, 72, 38), h, w), col((70, 40, 22), h, w), noise(h, w, 3, 2))
    rgb = mix(base, engr, burn)
    rgb *= (1 + shade(blur(card, 2) - burn * 0.3, 2.5) * 0.25)[..., None]
    return rgb


def acrylic(card, art, bgcrop):
    h, w = card.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    glass = bgcrop * 0.88 + 0.06
    edge = np.clip(1 - blur(card, 3) * 1.0, 0, 1) + (card - blur(card, 1.2)).clip(0, 1) * 3
    frost = art * (0.78 + 0.22 * noise(h, w, 2, 2))
    gold = mix(col((250, 250, 250), h, w), col((246, 196, 92), h, w), np.ones((h, w), np.float32) * 0.0)
    rgb = mix(glass, gold, frost * 0.9)
    gloss = np.clip(1 - np.abs((xx / w - yy / h * 0.6) - 0.15) * 7, 0, 1) * 0.22
    rgb = rgb + gloss[..., None] + edge[..., None] * 0.35
    return rgb


def leather(card, art):
    h, w = card.shape
    pebble = noise(h, w, 3, 3)
    base = mix(col((176, 112, 62), h, w), col((140, 84, 44), h, w), pebble * 0.5 + noise(h, w, 90, 2) * 0.5)
    burnish = np.clip(1 - blur(card, 10), 0, 1) * 2.2
    engr = col((78, 42, 22), h, w)
    rgb = mix(base, engr, blur(art, 0.7) * 0.92)
    rgb *= (1 - np.clip(burnish, 0, 0.55))[..., None]
    rgb *= (1 + shade(pebble, 1.5) * 0.08)[..., None]
    return rgb


def slate(card, art):
    h, w = card.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    layers = np.sin(yy / h * 90 + noise(h, w, 200) * 14) * 0.5 + 0.5
    base = mix(col((44, 48, 54), h, w), col((70, 75, 82), h, w), layers * 0.35 + noise(h, w, 30, 3) * 0.4)
    engr = mix(col((150, 155, 160), h, w), col((196, 199, 202), h, w), noise(h, w, 2, 2))
    rgb = mix(base, engr, art * 0.95)
    rgb *= (1 + shade(noise(h, w, 40, 3), 4) * 0.12)[..., None]
    return rgb


def metallic_gold(h, w):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.sin((xx / w * 1.2 + yy / h) * 6) * 0.5 + 0.5
    return mix(col((176, 128, 40), h, w), col((252, 214, 120), h, w), t * 0.8 + noise(h, w, 50, 2) * 0.2)


def canvas_texture(h, w, rgb, scale=3):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    weave = (np.sin(xx * np.pi / scale) * np.sin(yy * np.pi / scale)) * 0.5 + 0.5
    base = col(rgb, h, w) * (0.86 + 0.14 * weave + 0.06 * (noise(h, w, 80, 2) - 0.5))[..., None]
    return base


def vinyl(art):
    h, w = art.shape
    pad = int(w * 0.16)
    H2, W2 = h + pad * 2, w + pad * 2
    bag = canvas_texture(H2, W2, (34, 44, 82))
    a = np.zeros((H2, W2), np.float32)
    a[pad:pad + h, pad:pad + w] = art
    shadow = np.roll(np.roll(blur(a, 1.5), 2, 0), 2, 1) * 0.5
    rgb = bag * (1 - shadow)[..., None]
    gold = metallic_gold(H2, W2) * (0.92 + 0.08 * canvas_texture(H2, W2, (255, 255, 255))[..., :1])
    rgb = mix(rgb, gold, a)
    # bag seam and drawstring channel across the top
    rgb[: int(H2 * 0.06)] *= 0.72
    return rgb


def embroidery(art, card, s):
    """Title + shin box only, satin-stitched in gold on burgundy felt."""
    h, w = art.shape
    top = art.copy()
    top[int(h * 0.228):int(h * 0.865)] = 0  # drop the body paragraph, keep logo/title and the shin
    top[: int(h * 0.04)] = top[int(h * 0.96):] = 0  # and the frame
    top[:, : int(w * 0.065)] = top[:, int(w * 0.935):] = 0
    H2, W2 = int(w * 1.15), int(w * 1.15)
    felt = col((112, 22, 38), H2, W2) * (0.85 + 0.15 * noise(H2, W2, 2, 3))[..., None]
    a = np.zeros((H2, W2), np.float32)
    head = top[: int(h * 0.228)]
    foot = top[int(h * 0.865):]
    y0 = int(H2 * 0.12)
    a[y0:y0 + head.shape[0], (W2 - w) // 2:(W2 - w) // 2 + w] = head
    y1 = int(H2 * 0.88) - foot.shape[0]
    a[y1:y1 + foot.shape[0], (W2 - w) // 2:(W2 - w) // 2 + w] = np.maximum(a[y1:y1 + foot.shape[0], (W2 - w) // 2:(W2 - w) // 2 + w], foot)
    yy, xx = np.mgrid[0:H2, 0:W2].astype(np.float32)
    satin = np.sin((xx + yy * 0.6) * 1.6) * 0.5 + 0.5
    thread = mix(col((190, 140, 50), H2, W2), col((255, 222, 140), H2, W2), satin * 0.8)
    puff = blur(a, 2.5)
    thread *= (1 + shade(puff, 6) * 0.35)[..., None]
    rgb = mix(felt * (1 - blur(a, 3) * 0.35)[..., None], thread, np.clip(a * 1.2, 0, 1))
    # running-stitch border
    border = np.zeros((H2, W2), np.float32)
    m = int(W2 * 0.05)
    dash = ((xx + yy) // 14 % 2 == 0)
    for sl in [(slice(m, m + 3), slice(m, W2 - m)), (slice(H2 - m - 3, H2 - m), slice(m, W2 - m)),
               (slice(m, H2 - m), slice(m, m + 3)), (slice(m, H2 - m), slice(W2 - m - 3, W2 - m))]:
        border[sl] = dash[sl]
    rgb = mix(rgb, col((230, 190, 110), H2, W2), border * 0.9)
    return rgb, np.ones((H2, W2), np.float32)


def pla(card, white, gold):
    h, w = card.shape
    height = blur(card, 1) * 2 + blur(white, 0.8) * 0.6 + blur(gold, 0.8) * 1.0
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    lines = (np.sin((xx + yy) * 1.1) * 0.5 + 0.5) * 0.05  # top-surface infill direction
    base = col((236, 112, 46), h, w)  # whatever colour the library has loaded; orange here
    light = 1 + shade(height, 9) * 0.5 - lines
    rgb = base * light[..., None]
    return rgb


def laminated(card, art):
    h, w = card.shape
    paper = col((246, 238, 220), h, w) * (0.97 + 0.03 * noise(h, w, 2, 2))[..., None]
    ink = col((22, 22, 26), h, w)
    rgb = mix(paper, ink, art)
    return rgb


# ---------------------------------------------------------------- main
def main():
    words = clean_text((HERE / 'text.he.txt').read_text()).split(' ')
    body_face, title_face = Face(780), Face(900)
    by_key = {s['key']: s for s in SIZES}
    cache = {}

    def get(key, px):
        if (key, px) not in cache:
            s = by_key[key]
            d = design(s, body_face, title_face, words)
            W, H = s['w'], s['h']
            cache[key, px] = dict(card=mask_of(d['base'], W, H, px), white=mask_of(d['white'], W, H, px),
                                  gold=mask_of(d['gold'], W, H, px))
            cache[key, px]['art'] = np.maximum(cache[key, px]['white'], cache[key, px]['gold'])
        return cache[key, px]

    std = get('standard', 7)
    card, art = std['card'], std['art']
    save(place(background('desk'), wood(card, art), card), 'wood')

    bg = background('window')
    crop = np.asarray(Image.fromarray((bg * 255).astype(np.uint8)).resize(card.shape[::-1]), np.float32) / 255
    save(place(bg, acrylic(card, art, crop), card, shadow=0.18), 'acrylic')

    pocket = get('pocket', 9)
    save(place(background('dark'), leather(pocket['card'], pocket['art']), pocket['card'], angle=4), 'leather')

    disp = get('display', 4.6)
    save(place(background('desk'), slate(disp['card'], disp['art']), disp['card'], angle=-2, shadow=0.6), 'slate')

    rgb = vinyl(disp['art'])
    save(place(background('desk'), rgb, np.ones(rgb.shape[:2], np.float32), angle=0, shadow=0.0), 'vinyl')

    rgb, a = embroidery(std['art'], card, 1)
    save(place(background('desk'), rgb, a, angle=0, shadow=0.0), 'embroidery')

    save(place(background('desk'), pla(card, std['white'], std['gold']), card, angle=5), 'library-print')

    lam = np.pad(card, 26)  # 26 px at 7 px/mm ≈ a 3.7 mm laminate border
    rgb = mix(col((236, 238, 240), *lam.shape), np.pad(laminated(card, art), ((26, 26), (26, 26), (0, 0))), np.pad(card, 26))
    yy, xx = np.mgrid[0:lam.shape[0], 0:lam.shape[1]].astype(np.float32)
    rgb += (np.clip(1 - np.abs((xx / lam.shape[1] - yy / lam.shape[0] * 0.7) - 0.05) * 6, 0, 1) * 0.12)[..., None]
    pouch = Image.new('L', lam.shape[::-1], 0)
    ImageDraw.Draw(pouch).rounded_rectangle([0, 0, lam.shape[1] - 1, lam.shape[0] - 1], 30, fill=255)
    save(place(background('desk'), rgb, np.asarray(pouch, np.float32) / 255, angle=-4), 'laminated')


if __name__ == '__main__':
    main()
