"""Render the Painted Torah trailer + poster.

Run from the repo root:  python3 scripts/painted-torah/trailer.py
Outputs public/videos/painted-torah-trailer.mp4 (1280x720, 24fps, H.264/AAC) and
public/videos/painted-torah-trailer-poster.jpg. Every shot is one of the 187 paintings in
public/painted-torah/, captioned with the verse and what Jev chose. The score is synthesized
with numpy at 80 bpm and every cut lands on a beat. Uses macOS system fonts.
"""
import json, math, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, SR = 1280, 720, 24, 48000
BPM = 80
BEAT = 60 / BPM  # 0.75 s
INK = (14, 11, 8)
PAPER = (244, 234, 214)
GOLD = (222, 176, 92)
DIM = (170, 156, 132)
PUB = "public"
SYS = "/System/Library/Fonts"

SERIF = lambda s: ImageFont.truetype(f"{SYS}/NewYork.ttf", s)
ITALIC = lambda s: ImageFont.truetype(f"{SYS}/NewYorkItalic.ttf", s)
MONO = lambda s: ImageFont.truetype(f"{SYS}/Menlo.ttc", s)
HEB = lambda s: ImageFont.truetype(f"{SYS}/SFHebrew.ttf", s)

DATA = json.load(open("src/data/painted-torah/torah.json"))["chapters"]
HE_BOOK = {"Genesis": "בראשית", "Exodus": "שמות", "Leviticus": "ויקרא", "Numbers": "במדבר", "Deuteronomy": "דברים"}
STYLE = {"chiaroscuro": "chiaroscuro oil", "luminist": "luminous landscape", "manuscript": "jewel-toned oil",
         "fresco": "fresco", "woodcut": "expressionist", "watercolor": "ink & watercolour", "mosaic": "mosaic"}
slug = lambda ref: ref.lower().replace(" ", "-")

# (chapter, the words of the verse on screen, Ken Burns pan target)
HEROES = [
    ("Genesis 1", "the great sea monsters", (0.5, 0.5)),
    ("Genesis 3", "the cherubim and the fiery ever-turning sword", (0.5, 0.45)),
    ("Genesis 7", "all the highest mountains were covered", (0.5, 0.6)),
    ("Genesis 22", "a ram, caught in the thicket by its horns", (0.5, 0.4)),
    ("Genesis 28", "a stairway set on the ground, its top reaching the sky", (0.5, 0.3)),
    ("Exodus 3", "a bush all aflame, yet not consumed", (0.5, 0.45)),
    ("Exodus 14", "the waters forming a wall for them", (0.5, 0.5)),
    ("Exodus 19", "Mount Sinai was all in smoke", (0.5, 0.4)),
]
FINALE = ("Deuteronomy 34", "Moses went up to Mount Nebo, opposite Jericho", (0.5, 0.5))
MONTAGE = ["Genesis 37", "Numbers 13", "Exodus 25", "Leviticus 16", "Numbers 16", "Genesis 8", "Exodus 12",
           "Numbers 22", "Genesis 32", "Exodus 2", "Deuteronomy 28", "Genesis 11", "Exodus 32", "Numbers 20",
           "Genesis 41", "Leviticus 9", "Exodus 15", "Genesis 18", "Numbers 21", "Deuteronomy 31",
           "Genesis 24", "Exodus 40", "Numbers 9", "Genesis 6"]

TL = [("card", 4, ("Every chapter of the Torah,", None)),
      ("card", 4, ("painted.", "187 chapters · 187 paintings")),
      ("card", 4, ("No prompt written by hand.", None))]
TL += [("hero", 4, h) for h in HEROES[:4]]
TL += [("bars", 5, "Exodus 14")]
TL += [("hero", 4, h) for h in HEROES[4:]]
TL += [("montage", 12, MONTAGE), ("wall", 6, None), ("hero", 5, FINALE), ("end", 9, None)]
TOTAL_BEATS = sum(b for _, b, _ in TL)
DUR = TOTAL_BEATS * BEAT

_cache = {}


def painting(ref, thumb=False):
    key = (ref, thumb)
    if key not in _cache:
        _cache[key] = Image.open(f"{PUB}/painted-torah/{slug(ref)}{'-t' if thumb else ''}.jpg").convert("RGB")
    return _cache[key]


def cover(img, w, h, zoom=1.0, pan=(0.5, 0.5)):
    iw, ih = img.size
    s = max(w / iw, h / ih) * zoom
    nw, nh = int(iw * s), int(ih * s)
    img = img.resize((nw, nh), Image.BICUBIC)
    x, y = int((nw - w) * pan[0]), int((nh - h) * pan[1])
    return img.crop((x, y, x + w, y + h))


YY, XX = np.mgrid[0:H, 0:W]
VIGNETTE = np.clip(1 - 0.6 * (((XX - W / 2) / (W / 1.25)) ** 2 + ((YY - H / 2) / (H / 1.05)) ** 2), 0.2, 1)[..., None]
GRADIENT = np.clip((YY - H * 0.45) / (H * 0.55), 0, 1)[..., None] ** 1.4  # darkens the bottom for captions


def grade(img, caption=True):
    a = np.asarray(img).astype(np.float32) / 255
    a = a * VIGNETTE
    if caption:
        a = a * (1 - 0.78 * GRADIENT)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def size(d, txt, f, **kw):
    x0, y0, x1, y1 = d.textbbox((0, 0), txt, font=f, **kw)
    return x1 - x0, y1 - y0, x0, y0


def centered(d, txt, f, y, fill, **kw):
    w, h, x0, y0 = size(d, txt, f, **kw)
    d.text(((W - w) / 2 - x0, y - y0), txt, font=f, fill=fill, **kw)


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def alpha(c, a):
    return c + (int(255 * max(0, min(1, a))),)


def caption(img, ref, words, t, seg):
    c = DATA[ref]
    v = (c.get("pv") or c).get("v", c["v"])
    book = ref.split()[0]
    d = ImageDraw.Draw(img, "RGBA")
    e1, e2, e3 = ease((t - 0.25) / 0.6), ease((t - 0.7) / 0.6), ease((t - 1.3) / 0.6)
    out = 1 - ease((t - (seg - 0.45)) / 0.45)
    x = 72
    d.text((x, 470 + 10 * (1 - e1)), f"{ref.upper()}:{v}", font=MONO(20), fill=alpha(GOLD, e1 * out))
    w, _, _, _ = size(d, f"{ref.upper()}:{v}", MONO(20))
    hw, _, _, _ = size(d, HE_BOOK[book], HEB(24), direction="rtl")
    d.text((x + w + 22 + hw, 466 + 10 * (1 - e1)), HE_BOOK[book], font=HEB(24), fill=alpha(DIM, e1 * out), direction="rtl", anchor="ra")
    d.text((x, 505 + 12 * (1 - e2)), f"“{words}”", font=ITALIC(42), fill=alpha(PAPER, e2 * out))
    a = c["a"]
    style_p = c["p"]["style"][a["style"]]
    tag = f"jev  ›  {STYLE[a['style']]} {round(style_p * 100)}%  ·  {a['time']}  ·  {a['atmosphere']}  ·  tension {a['tension']:.1f}/4"
    d.text((x, 578), tag, font=MONO(16), fill=alpha(DIM, e3 * out))


def render(kind, beats, payload, t, idx):
    seg = beats * BEAT
    u = t / seg
    if kind == "card":
        line, sub = payload
        img = Image.new("RGB", (W, H), INK)
        d = ImageDraw.Draw(img, "RGBA")
        e = ease(t / 0.9) * (1 - ease((t - (seg - 0.5)) / 0.5))
        centered(d, line, SERIF(64), H / 2 - 50 + 8 * (1 - e), alpha(PAPER, e))
        if sub:
            e2 = ease((t - 0.9) / 0.7) * (1 - ease((t - (seg - 0.5)) / 0.5))
            centered(d, sub.upper(), MONO(20), H / 2 + 50, alpha(GOLD, e2))
        return img
    if kind == "hero":
        ref, words, pan = payload
        z = 1.02 + 0.12 * u
        p = (pan[0] + 0.06 * math.sin(idx * 2.1) * (u - 0.5), pan[1])
        img = grade(cover(painting(ref), W, H, z, p))
        fade_in = ease(t / 0.35)
        if fade_in < 1:
            img = Image.blend(Image.new("RGB", (W, H), INK), img, fade_in)
        caption(img, ref, words, t, seg)
        return img
    if kind == "bars":
        c = DATA[payload]
        img = grade(cover(painting(payload), W, H, 1.25, (0.5, 0.5)).filter(ImageFilter.GaussianBlur(14)), False)
        img = Image.blend(img, Image.new("RGB", (W, H), INK), 0.55)
        d = ImageDraw.Draw(img, "RGBA")
        e = ease(t / 0.6) * (1 - ease((t - (seg - 0.4)) / 0.4))
        centered(d, "A model chose the verse, the light, the weather, the style.", SERIF(38), 128, alpha(PAPER, e))
        centered(d, f"JEV ON {payload.upper()}  ·  WHICH TRADITION SHOULD PAINT IT?", MONO(18), 196, alpha(GOLD, e))
        probs = sorted(c["p"]["style"].items(), key=lambda kv: -kv[1])
        for i, (k, pr) in enumerate(probs):
            y = 280 + i * 92
            k_e = ease((t - 0.8 - i * 0.35) / 0.9)
            d.text((300, y), STYLE[k], font=SERIF(30), fill=alpha(PAPER, e * (0.5 + 0.5 * k_e)))
            d.rectangle([300, y + 46, 980, y + 58], fill=(255, 255, 255, int(28 * e)))
            d.rectangle([300, y + 46, 300 + 680 * pr * k_e, y + 58], fill=alpha(GOLD if i == 0 else DIM, e))
            pct = f"{round(pr * 100 * k_e)}%"
            pw, _, _, _ = size(d, pct, MONO(24))
            d.text((980 - pw, y + 4), pct, font=MONO(24), fill=alpha(GOLD if i == 0 else DIM, e))
        return img
    if kind == "montage":
        # cuts accelerate: half-beat cuts for the first half, quarter-beat after
        half = seg / 2
        k = int(t / (BEAT / 2)) if t < half else int(half / (BEAT / 2)) + int((t - half) / (BEAT / 4))
        ref = payload[k % len(payload)]
        img = grade(cover(painting(ref), W, H, 1.08 + 0.04 * ((t * 3) % 1), (0.5, 0.5)), False)
        d = ImageDraw.Draw(img, "RGBA")
        c = DATA[ref]
        d.text((72, 600), f"{ref.upper()}  ·  {STYLE[c['a']['style']]}", font=MONO(18), fill=alpha(GOLD, 0.9))
        return img
    if kind == "wall":
        refs = list(DATA.keys())
        cols, cw = 17, 160
        ch = int(cw * 2 / 3)
        rows = math.ceil(len(refs) / cols)
        big = Image.new("RGB", (cols * cw, rows * ch), INK)
        for i, ref in enumerate(refs):
            big.paste(painting(ref, True).resize((cw - 4, ch - 4)), ((i % cols) * cw + 2, (i // cols) * ch + 2))
        # zoom from one tile (Genesis 1, top-left area) out to the whole wall
        e = ease(u * 1.15)
        vw = cw * 2.2 + (big.size[0] - cw * 2.2) * e
        vh = vw * H / W
        cx = cw * 1.1 + (big.size[0] / 2 - cw * 1.1) * e
        cy = ch * 1.1 + (big.size[1] / 2 - ch * 1.1) * e
        box = (cx - vw / 2, cy - vh / 2, cx + vw / 2, cy + vh / 2)
        img = big.crop(tuple(int(b) for b in box)).resize((W, H), Image.BICUBIC)
        d = ImageDraw.Draw(img, "RGBA")
        e2 = ease((t - seg * 0.55) / 0.6)
        d.rectangle([0, H / 2 - 70, W, H / 2 + 70], fill=(14, 11, 8, int(200 * e2)))
        centered(d, "187 chapters. 187 paintings.", SERIF(56), H / 2 - 36, alpha(PAPER, e2))
        return img
    if kind == "end":
        img = grade(cover(painting("Deuteronomy 34"), W, H, 1.14, (0.5, 0.5)).filter(ImageFilter.GaussianBlur(10)), False)
        img = Image.blend(img, Image.new("RGB", (W, H), INK), 0.72)
        d = ImageDraw.Draw(img, "RGBA")
        e = ease(t / 0.9)
        centered(d, "התורה המצוירת", HEB(44), 160, alpha(GOLD, e), direction="rtl")
        centered(d, "The Painted Torah", SERIF(104), 225, alpha(PAPER, e))
        e2 = ease((t - BEAT * 2) / 0.6)
        centered(d, "Jev art-directs every chapter. FLUX.2 [klein] paints it.", ITALIC(32), 390, alpha(PAPER, e2 * 0.9))
        e3 = ease((t - BEAT * 4) / 0.6)
        centered(d, "theothermatthewmiller.com/painted-torah", MONO(26), 480, alpha(GOLD, e3))
        fade = max(0, (t - (seg - 1.2)) / 1.2)
        if fade:
            img = Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), fade)
        return img
    raise ValueError(kind)


def grain(img, rng):
    a = np.asarray(img).astype(np.int16)
    a = a + rng.integers(-6, 7, (H, W, 1), dtype=np.int16)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


STARTS = np.cumsum([0] + [b * BEAT for _, b, _ in TL])


def frame_at(t, rng):
    i = min(int(np.searchsorted(STARTS, t, side="right")) - 1, len(TL) - 1)
    kind, beats, payload = TL[i]
    img = render(kind, beats, payload, t - STARTS[i], i)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 36], fill=(0, 0, 0))
    d.rectangle([0, H - 36, W, H], fill=(0, 0, 0))
    return grain(img, rng)


# ---------- score: D minor, slow and big ----------
def score():
    n = int(DUR * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(3)

    def add(sig, at, gain=1.0):
        i = int(at * SR)
        j = min(n, i + len(sig))
        if 0 <= i < n:
            out[i:j] += sig[: j - i] * gain

    seg_at = {k: [] for k in ("card", "hero", "bars", "montage", "wall", "end")}
    for (kind, beats, _), s in zip(TL, STARTS):
        seg_at[kind].append((s, beats * BEAT))
    mont_s, mont_d = seg_at["montage"][0]
    end_s = seg_at["end"][0][0]
    first_hero = seg_at["hero"][0][0]

    # timpani-like hit
    ln = int(2.2 * SR)
    lt = np.arange(ln) / SR
    timp = (np.sin(2 * np.pi * (73.4 + 30 * np.exp(-lt * 18)) * lt) * np.exp(-lt * 2.6)
            + 0.3 * rng.standard_normal(ln) * np.exp(-lt * 40)).astype(np.float32)
    boom = (np.sin(2 * np.pi * (36 + 50 * np.exp(-np.arange(int(5 * SR)) / SR * 5)) * np.arange(int(5 * SR)) / SR)
            * np.exp(-np.arange(int(5 * SR)) / SR * 0.9)).astype(np.float32)

    # harp pluck (Karplus-ish: decaying harmonics)
    def pluck(f, dur=2.4):
        m = int(dur * SR)
        pt = np.arange(m) / SR
        s = sum(np.sin(2 * np.pi * f * h * pt) * np.exp(-pt * (2.5 + h * 1.6)) / h for h in range(1, 6))
        return (s * np.minimum(1, pt / 0.004)).astype(np.float32)

    # chords: Dm - Bb - F - C, one per bar of 4 beats, from the first hero on
    roots = [73.42, 58.27, 87.31, 65.41]
    chords = [[293.7, 349.2, 440.0], [233.1, 293.7, 349.2], [349.2, 440.0, 523.3], [261.6, 329.6, 392.0]]
    bar = 4 * BEAT
    ci = np.clip(((t - first_hero) // bar).astype(int), 0, None) % 4

    # drone + pad (swells across the whole piece)
    drone = (np.sin(2 * np.pi * 36.71 * t) * 0.10 + np.sin(2 * np.pi * 73.42 * t) * 0.06) * np.clip(t / 4, 0, 1)
    pad = np.zeros(n, np.float32)
    for v in range(3):
        f = np.array([c[v] for c in chords])[ci]
        pad += (np.sin(2 * np.pi * f * t + v) + 0.6 * np.sin(2 * np.pi * f * 1.004 * t)) * 0.022
    pad_on = np.clip((t - first_hero + 1) / 3, 0, 1) * (t < end_s + 6)
    bass = np.sin(2 * np.pi * np.array(roots)[ci] * t) * 0.09 * (t >= first_hero) * (t < end_s)
    out += drone + pad * pad_on * (0.6 + 0.4 * np.clip((t - first_hero) / 25, 0, 1)) + bass

    # opening: a single low pluck per card
    for s, _ in seg_at["card"]:
        add(pluck(146.8, 3.0), s, 0.25)
    # a timpani hit on every hero cut, harp arpeggio inside
    for s, d in seg_at["hero"] + seg_at["bars"]:
        add(timp, s, 0.7)
        k = int(((s - first_hero) // bar) % 4) if s >= first_hero else 0
        notes = chords[k] + [chords[k][0] * 2]
        for j in range(int(d / (BEAT / 2))):
            add(pluck(notes[j % 4] * (1 if j < 4 else 2)), s + j * BEAT / 2, 0.09)
    # montage: driving toms on every beat, eighths in the second half, riser into the wall
    for b in range(int(mont_d / BEAT)):
        at = mont_s + b * BEAT
        add(timp, at, 0.6)
        if b >= mont_d / BEAT / 2:
            add(timp, at + BEAT / 2, 0.35)
    rl = int(3 * SR)
    rt = np.arange(rl) / SR
    add((rng.standard_normal(rl) * (rt / rt[-1]) ** 2 * 0.10).astype(np.float32), mont_s + mont_d - 3)
    for s, _ in seg_at["wall"]:
        add(boom, s, 0.9)
    add(boom, end_s, 1.1)
    for j, f in enumerate([293.7, 440.0, 587.3, 698.5, 880.0]):
        add(pluck(f, 4.0), end_s + 0.4 + j * BEAT / 2, 0.12)
    # end tail chord
    tail = t >= end_s
    out += sum(np.sin(2 * np.pi * f * t) * 0.035 for f in (146.8, 220.0, 293.7)) * np.exp(-(t - end_s).clip(0) * 0.25) * tail

    out = np.tanh(out * 1.5) * 0.82
    out *= np.clip((DUR - t) / 1.5, 0, 1) * np.clip(t / 0.3, 0, 1)
    return (out * 32767).astype(np.int16)


def main():
    tmp = os.environ.get("TMPDIR", "/tmp")
    wav = os.path.join(tmp, "painted-torah-trailer.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(score().tobytes())
    out = f"{PUB}/videos/painted-torah-trailer.mp4"
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "29", "-tune", "film",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", out],
        stdin=subprocess.PIPE,
    )
    rng = np.random.default_rng(7)
    nframes = int(DUR * FPS)
    poster_t = STARTS[-2] + BEAT * 6  # the end card, fully drawn
    for i in range(nframes):
        img = frame_at(i / FPS, rng)
        ff.stdin.write(img.tobytes())
        if abs(i / FPS - poster_t) < 0.5 / FPS:
            img.save(f"{PUB}/videos/painted-torah-trailer-poster.jpg", quality=86)
    ff.stdin.close()
    ff.wait()
    print(f"wrote {out} ({DUR:.1f}s, {nframes} frames)")


if __name__ == "__main__":
    main()
