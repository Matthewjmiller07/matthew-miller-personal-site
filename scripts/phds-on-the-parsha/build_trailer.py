"""Render the "PhDs on the Parsha" launch trailer + YouTube thumbnail.

Inputs (in the working dir):
  s0..s7.png   cinematic stills (Higgsfield gpt_image_2_5, 16:9)
  vo0..vo6.wav voiceover lines, silence-trimmed, mono 48 kHz s16
  cinzel.ttf, frank.ttf, mont.ttf   Google Fonts (Cinzel, Frank Ruhl Libre, Montserrat)
Outputs: trailer.mp4 (1280x720, 24fps, H.264/AAC), thumb.jpg (1280x720)

Music is synthesized here with numpy (drone, braams, booms, ostinato, riser),
then ducked under the voiceover.
"""
import math, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, features

W, H, FPS, SR = 1280, 720, 24, 48000
GOLD = [(255, 243, 196), (240, 180, 41), (183, 121, 31)]
ORANGE = (232, 76, 30)
BAR = 92  # letterbox bar height (2.39:1)
RAQM = features.check("raqm")


def font(path, size, wght=None):
    f = ImageFont.truetype(path, size)
    if wght:
        try:
            f.set_variation_by_axes([wght])
        except Exception:
            pass
    return f


def read_wav(p):
    with wave.open(p) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a


VO = [read_wav(f"vo{i}.wav") for i in range(7)]
L = [len(v) / SR for v in VO]


def phrase_cuts(v, n):
    """Split points (sec) at the n-1 longest pauses inside a VO line."""
    hop = int(SR * 0.02)
    rms = np.sqrt(np.convolve(v ** 2, np.ones(hop) / hop, "same"))[::hop]
    quiet = rms < max(rms.max() * 0.06, 1e-4)
    gaps, s = [], None
    for i, q in enumerate(quiet):
        if q and s is None:
            s = i
        if not q and s is not None:
            if s > 0:
                gaps.append((i - s, (s + i) / 2 * 0.02))
            s = None
    gaps = sorted(sorted(gaps, reverse=True)[: n - 1], key=lambda g: g[1])
    if len(gaps) < n - 1:
        d = len(v) / SR
        return [d * k / n for k in range(1, n)]
    return [g[1] for g in gaps]


# ---------- text layers ----------
def gold_text(txt, fnt, stroke=6, glow=18, raqm_dir=None):
    kw = {"direction": raqm_dir} if (raqm_dir and RAQM) else {}
    d = ImageDraw.Draw(Image.new("L", (1, 1)))
    x0, y0, x1, y1 = d.textbbox((0, 0), txt, font=fnt, **kw)
    pad = glow * 2 + stroke
    w, h = x1 - x0 + pad * 2, y1 - y0 + pad * 2
    mask = Image.new("L", (w, h))
    ImageDraw.Draw(mask).text((pad - x0, pad - y0), txt, font=fnt, fill=255, **kw)
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        a, b, tt = (GOLD[0], GOLD[1], t * 2) if t < 0.5 else (GOLD[1], GOLD[2], (t - 0.5) * 2)
        grad.putpixel((0, y), tuple(int(a[i] + (b[i] - a[i]) * tt) for i in range(3)))
    grad = grad.resize((w, h))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(glow))
    out.paste(Image.new("RGBA", (w, h), (255, 140, 30, 255)), (0, 0), g.point(lambda p: int(p * 0.8)))
    st = mask.filter(ImageFilter.MaxFilter(stroke * 2 + 1)) if stroke else None
    if st:
        out.paste(Image.new("RGBA", (w, h), (20, 10, 0, 255)), (0, 0), st)
    out.paste(grad, (0, 0), mask)
    return out


def plain_text(txt, fnt, fill=(255, 255, 255), shadow=True, spacing=0):
    d = ImageDraw.Draw(Image.new("L", (1, 1)))
    x0, y0, x1, y1 = d.textbbox((0, 0), txt, font=fnt)
    w, h = x1 - x0 + 40 + spacing * len(txt), y1 - y0 + 40
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    if shadow:
        m = Image.new("L", (w, h))
        ImageDraw.Draw(m).text((20 - x0, 20 - y0), txt, font=fnt, fill=255)
        out.paste(Image.new("RGBA", (w, h), (0, 0, 0, 255)), (0, 0), m.filter(ImageFilter.GaussianBlur(8)).point(lambda p: int(p * 0.9)))
    ImageDraw.Draw(out).text((20 - x0, 20 - y0), txt, font=fnt, fill=fill)
    return out


CZ = lambda s: font("cinzel.ttf", s, 800)
FR = lambda s: font("frank.ttf", s, 800)
MO = lambda s: font("mont.ttf", s, 700)

heb = "בראשית" if RAQM else "בראשית"[::-1]
T_BERESHIT = gold_text(heb, FR(190), raqm_dir="rtl")
T_GEN11 = plain_text("GENESIS 1:1", CZ(34), (235, 225, 200))
CAPS = [("THE IMAGE OF GOD", "GENESIS 1:27"), ("THE SERPENT", "GENESIS 3:1"),
        ("THE FIRST MURDER", "GENESIS 4:8"), ("THE NEPHILIM", "GENESIS 6:4")]
T_CAPS = [(gold_text(a, CZ(64), stroke=3, glow=10), plain_text(b, CZ(28), (230, 220, 200))) for a, b in CAPS]
CARDS = ["HUNDREDS OF PAGES.", "THOUSANDS OF FOOTNOTES.", "ONE PARSHA."]


def fit_gold(txt, size, maxw=1120):
    while True:
        lay = gold_text(txt, CZ(size), stroke=3, glow=14)
        if lay.width - 60 <= maxw or size < 30:
            return lay
        size -= 4


T_CARDS = [fit_gold(c, 80 if i < 2 else 120) for i, c in enumerate(CARDS)]
T_PHDS = gold_text("PhDs", CZ(250), stroke=5, glow=24)
T_ONTHE = plain_text("ON THE PARSHA", CZ(84), (255, 250, 240))
T_FROM = plain_text("A PODCAST FROM THE OTHER MATTHEW MILLER", MO(26), ORANGE)
T_PREM = plain_text("PREMIERES WITH PARASHAT BEREISHIT", CZ(36), (240, 230, 210))
T_URL = plain_text("theothermatthewmiller.com", MO(24), (200, 200, 200))

# ---------- image prep ----------
SRC = {}
for i in range(8):
    im = Image.open(f"s{i}.png").convert("RGB")
    SRC[i] = im.resize((int(W * 1.3), int(W * 1.3 * im.height / im.width)), Image.LANCZOS)
yy, xx = np.mgrid[0:H, 0:W]
vig = 1 - 0.55 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.4
VIG = np.clip(vig, 0.25, 1)[..., None].astype(np.float32)


def kb(i, p, z0, z1, dx=0.0, dy=0.0):
    """Ken Burns frame of still i at progress p (0..1)."""
    im = SRC[i]
    z = z0 + (z1 - z0) * p
    s = 1 / z  # source px per output px (source is pre-scaled 1.3x for pan room)
    cw, ch = W * s, H * s
    cx = im.width / 2 + dx * p * im.width * 0.08 - cw / 2
    cy = im.height / 2 + dy * p * im.height * 0.08 - ch / 2
    return np.asarray(im.transform((W, H), Image.AFFINE, (s, 0, cx, 0, s, cy), Image.BILINEAR), np.float32)


def comp(base, layer, cx, cy, alpha=1.0, scale=1.0):
    if alpha <= 0:
        return base
    lay = layer if scale == 1 else layer.resize((int(layer.width * scale), int(layer.height * scale)), Image.BILINEAR)
    x, y = int(cx - lay.width / 2), int(cy - lay.height / 2)
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + lay.width, W), min(y + lay.height, H)
    if x1 <= x0 or y1 <= y0:
        return base
    a = np.asarray(lay, np.float32)[y0 - y:y1 - y, x0 - x:x1 - x]
    al = a[..., 3:4] / 255 * alpha
    base[y0:y1, x0:x1] = base[y0:y1, x0:x1] * (1 - al) + a[..., :3] * al
    return base


def fade(t, d, a=0.4, b=0.4):
    return max(0.0, min(1.0, t / a if a else 1, (d - t) / b if b else 1))


# ---------- timeline ----------
segs = []  # (start, dur, render_fn, xfade_in)
t = 0.0


def add(dur, fn, xin=0.0):
    global t
    start = t - xin
    segs.append((start, dur, fn, xin))
    t = start + dur


VOPLACE = []  # (time, index)

d0 = L[0] + 2.2
VOPLACE.append((1.2, 0))
add(d0, lambda tt, d: kb(0, tt / d, 1.0, 1.15, 0.2, 0.1) * min(1, tt / 1.5))
HITS = [("braam", t)]
d1 = max(4.2, L[1] + 2.4)
VOPLACE.append((t + 0.5, 1))


def f1(tt, d):
    fr = kb(1, tt / d, 1.18, 1.0)
    fr = fr + max(0, 1 - tt / 0.35) * 255
    a = fade(tt - 0.6, d - 0.6, 0.6, 0.5)
    fr = comp(fr, T_BERESHIT, W / 2, H / 2 - 20, a, 1 + 0.04 * tt / d)
    return comp(fr, T_GEN11, W / 2, H / 2 + 120, a)


add(d1, f1)
d2 = L[2] + 1.6
VOPLACE.append((t + 0.3, 2))
add(d2, lambda tt, d: kb(6, tt / d, 1.0, 1.12, -0.15, 0), 0.6)
cuts = phrase_cuts(VO[3], 4)
lstart = t + 0.3
VOPLACE.append((lstart, 3))
bounds = [0] + cuts + [L[3] + 0.6]
imgs = [2, 3, 4, 5]
for k in range(4):
    dur = bounds[k + 1] - bounds[k] + (0.3 if k == 0 else 0)
    HITS.append(("boom", t))

    def fk(tt, d, k=k):
        fr = kb(imgs[k], tt / d, 1.06, 1.16, (-1) ** k * 0.3, 0.1)
        a = fade(tt - 0.15, d - 0.15, 0.3, 0.25)
        fr = comp(fr, T_CAPS[k][0], W / 2, H - BAR - 105, a)
        return comp(fr, T_CAPS[k][1], W / 2, H - BAR - 52, a)

    add(dur, fk)
OST = (lstart - 0.3, t)
cuts = phrase_cuts(VO[4], 3)
cstart = t + 0.35
VOPLACE.append((cstart, 4))
bounds = [0] + cuts + [L[4] + 0.9]
for k in range(3):
    dur = bounds[k + 1] - bounds[k] + (0.35 if k == 0 else 0)
    HITS.append(("boom", t))
    if k == 2:
        HITS.append(("braam", t))

    def ck(tt, d, k=k):
        fr = np.zeros((H, W, 3), np.float32) + 6
        return comp(fr, T_CARDS[k], W / 2, H / 2, fade(tt, d, 0.08, 0.2), 1.08 - 0.08 * min(1, tt / d))

    add(dur, ck)
OST2 = t
d5 = L[5] + 1.6
VOPLACE.append((t + 0.4, 5))
add(d5, lambda tt, d: kb(7, tt / d, 1.0, 1.15, 0.2, -0.05) * min(1, tt / 0.6), 0.0)
RISER_END = t
HITS.append(("title", t))
d6 = L[6] + 5.0
VOPLACE.append((t + 1.4, 6))


def f6(tt, d):
    fr = kb(7, 0.3 + 0.7 * tt / d, 1.25, 1.35) * 0.35
    fr = fr + max(0, 1 - tt / 0.5) * 255
    fr = comp(fr, T_PHDS, W / 2, H / 2 - 95, fade(tt, d, 0.3, 1.2), 1.1 - 0.1 * min(1, tt / 3))
    fr = comp(fr, T_ONTHE, W / 2, H / 2 + 55, fade(tt - 0.6, d - 0.6, 0.5, 1.2))
    fr = comp(fr, T_FROM, W / 2, H / 2 + 125, fade(tt - 1.4, d - 1.4, 0.5, 1.2))
    fr = comp(fr, T_PREM, W / 2, H / 2 + 185, fade(tt - 2.6, d - 2.6, 0.5, 1.2))
    return comp(fr, T_URL, W / 2, H - BAR - 20, fade(tt - 3.4, d - 3.4, 0.5, 1.2))


add(d6, f6)
TOTAL = t + 0.5
N = int(TOTAL * FPS)
print("duration", round(TOTAL, 2), "frames", N)

# ---------- music ----------
n = int(TOTAL * SR)
ts = np.arange(n) / SR
mix = np.zeros(n, np.float32)
rng = np.random.default_rng(7)


def saw(f, tt, harm=14, roll=1.2):
    return sum(np.sin(2 * np.pi * f * k * tt) / k ** roll for k in range(1, harm + 1))


def place(buf, at):
    i = int(at * SR)
    j = min(n, i + len(buf))
    if j > i:
        mix[i:j] += buf[: j - i]


def lowpass(x, cutoff):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (fr / cutoff) ** 4), len(x)).astype(np.float32)


# drone: A minor, swelling over the piece
env = np.clip(ts / 4, 0, 1) * (0.55 + 0.45 * np.clip((ts - 20) / 30, 0, 1)) * np.clip((TOTAL - ts) / 3, 0, 1)
drone = (saw(55, ts, 8, 1.5) + 0.6 * saw(82.41, ts, 6, 1.6) + 0.35 * np.sin(2 * np.pi * 110.3 * ts)) * env
mix += 0.09 * drone * (1 + 0.15 * np.sin(2 * np.pi * 0.13 * ts))
wind = lowpass(rng.standard_normal(int(d0 * SR)).astype(np.float32), 400) * np.sin(np.linspace(0, np.pi, int(d0 * SR)))
place(0.5 * wind / (np.abs(wind).max() + 1e-6), 0)


def braam(big=1.0):
    tt = np.arange(int(4.5 * SR)) / SR
    e = np.minimum(1, tt / 0.04) * np.exp(-tt / (1.6 * big))
    s = sum(saw(f * (1 + dt), tt, 18, 1.1) for f in (55, 82.41, 110, 164.8) for dt in (-0.004, 0.004))
    return (0.05 * big * s * e * (1 + 0.3 * np.sin(2 * np.pi * 28 * tt))).astype(np.float32)


def boom(g=1.0):
    tt = np.arange(int(2.2 * SR)) / SR
    f = 42 + 90 * np.exp(-tt / 0.07)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.55)
    nz = lowpass(rng.standard_normal(len(tt)).astype(np.float32), 900) * np.exp(-tt / 0.03)
    return (g * (0.9 * s + 0.6 * nz / (np.abs(nz).max() + 1e-6))).astype(np.float32)


for kind, at in HITS:
    if kind == "braam":
        place(braam(), at)
        place(boom(0.8), at)
    elif kind == "boom":
        place(boom(0.75), at)
    else:
        place(braam(1.6), at)
        place(boom(1.1), at)
# ostinato: pulsing 8ths on A, accelerating into the cards
bt = OST[0]
beat = 0.3
while bt < OST2:
    tt = np.arange(int(0.25 * SR)) / SR
    f = 110 if int((bt - OST[0]) / beat) % 4 else 220
    place((0.07 * saw(f, tt, 10, 1.3) * np.exp(-tt / 0.07)).astype(np.float32), bt)
    bt += beat
    beat = max(0.16, beat * 0.985)
# riser into the title
rl = 3.0
tt = np.arange(int(rl * SR)) / SR
g = (tt / rl) ** 2
ris = 0.12 * g * np.sin(2 * np.pi * np.cumsum(180 + 900 * (tt / rl) ** 2) / SR) + 0.25 * g * lowpass(rng.standard_normal(len(tt)).astype(np.float32), 3000)
place(ris.astype(np.float32), RISER_END - rl)
# title pad: A major resolve
pt = np.arange(int((TOTAL - RISER_END) * SR)) / SR
pe = np.minimum(1, pt / 1.5) * np.clip((TOTAL - RISER_END - pt) / 3, 0, 1)
pad = sum(saw(f, pt, 6, 1.8) for f in (110, 138.59, 164.81, 220, 277.18))
place((0.05 * pad * pe).astype(np.float32), RISER_END)

# reverb (FFT convolution with decaying noise IR)
irl = int(1.8 * SR)
ir = rng.standard_normal(irl).astype(np.float32) * np.exp(-np.arange(irl) / SR / 0.5)
m = 1 << int(math.ceil(math.log2(n + irl)))
wet = np.fft.irfft(np.fft.rfft(mix, m) * np.fft.rfft(ir / np.abs(ir).sum() * 40, m), m)[:n]
music = mix + 0.35 * wet.astype(np.float32)

vo = np.zeros(n, np.float32)
for at, i in VOPLACE:
    i0 = int(at * SR)
    seg = VO[i][: n - i0]
    vo[i0:i0 + len(seg)] += seg
venv = np.convolve(np.abs(vo), np.ones(int(0.25 * SR)) / (0.25 * SR), "same")
duck = 1 - 0.55 * np.clip(venv / (venv.max() * 0.25 + 1e-6), 0, 1)
music = music * duck
music /= np.abs(music).max() + 1e-6
vo /= np.abs(vo).max() + 1e-6
left = 0.62 * music + 0.95 * vo
right = 0.62 * np.roll(music, int(0.011 * SR)) + 0.95 * vo
st = np.stack([left, right], 1)
st /= np.abs(st).max() / 0.95
with wave.open("mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())

# ---------- video ----------
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                       "-r", str(FPS), "-i", "-", "-i", "mix.wav", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                       "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                       "trailer.mp4"], stdin=subprocess.PIPE)
for fi in range(N):
    T = fi / FPS
    frame = np.zeros((H, W, 3), np.float32)
    for start, dur, fn, xin in segs:
        if start <= T < start + dur:
            tt = T - start
            fr = fn(tt, dur)
            a = min(1.0, tt / xin) if xin else 1.0
            frame = frame * (1 - a) + fr * a
    frame = frame * VIG
    frame[:BAR] = 0
    frame[H - BAR:] = 0
    frame *= min(1.0, (TOTAL - T) / 0.8)
    ff.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
ff.stdin.close()
ff.wait()

# ---------- thumbnail ----------
th = Image.open("s7.png").convert("RGB")
th = th.resize((math.ceil(H * th.width / th.height), H), Image.LANCZOS).crop((0, 0, W, H))
arr = np.asarray(th, np.float32)
grad = np.clip(1.15 - np.linspace(0, 1, W)[None, :, None] * 0.2 - np.clip(0.75 - np.linspace(0, 1, W), 0, 1)[None, :, None] * 1.1, 0.12, 1)
th = Image.fromarray(np.clip(arr * grad, 0, 255).astype(np.uint8)).convert("RGBA")


def paste(img, lay, x, y):
    img.alpha_composite(lay, (int(x), int(y)))


phd = gold_text("PhDs", CZ(260), stroke=7, glow=26)
paste(th, phd, 10, 70)
ot = plain_text("ON THE", CZ(64), (255, 250, 240))
paste(th, ot, 52, 355)
pa = gold_text("PARSHA", CZ(128), stroke=5, glow=16)
paste(th, pa, 18, 405)
d = ImageDraw.Draw(th)
pill = MO(30)
d.rounded_rectangle((52, 40, 360, 92), 26, fill=ORANGE)
d.text((72, 49), "NEW PODCAST", font=pill, fill="white")
d.rounded_rectangle((52, 585, 530, 640), 8, fill=(0, 0, 0, 200), outline=ORANGE, width=3)
d.text((70, 596), "EP. 1 · BEREISHIT", font=MO(32), fill=(255, 225, 150))
paste(th, plain_text("THE OTHER MATTHEW MILLER", MO(24), (235, 235, 235)), 32, 648)
th.convert("RGB").save("thumb.jpg", quality=92)
th.convert("RGB").save("thumb.webp", quality=82)
print("done")
