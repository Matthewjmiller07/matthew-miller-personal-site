"""WhatsApp Status video for the week-of-23-November-2026 Workshop.

Run from the repo root:
  python3 scripts/newsletter-trailer/build_week_2026_11_23.py CLIPS_DIR

CLIPS_DIR holds produce.mp4 and atlas.mp4: 1000px-wide screen recordings of /produce
(walking the aisle) and /atlas ("Surprise me"), made with Playwright from a local dev server.
The Slop Kitchen shots are the dish photos in public/slop/.

Writes public/newsletter/2026-11-23/whatsapp-status.mp4 (1080x1920, 24fps, ~20s, H.264/AAC)
and whatsapp-status.jpg (its end card). The score is synthesized with numpy; hits land on cuts.
Needs only numpy, Pillow and ffmpeg.
"""
import json, math, os, random, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CLIPS = sys.argv[1]
OUT = "public/newsletter/2026-11-23"
W, H, FPS, SR = 1080, 1920, 24, 48000
BG, GOLD, CREAM = (16, 14, 11), (232, 190, 96), (250, 243, 228)
BRAND = lambda s: ImageFont.truetype("public/fonts/brand.ttf", s)  # Marcellus
SANS = lambda s: ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", s)
ease = lambda x: 1 - (1 - max(0.0, min(1.0, x))) ** 3


def frames_of(path):
    w, h = 1000, 618
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    n = len(raw) // (w * h * 3)
    return [Image.frombuffer("RGB", (w, h), raw[i * w * h * 3:(i + 1) * w * h * 3]) for i in range(n)]


random.seed(23)
STARS = [(random.uniform(0, W), random.uniform(0, H), random.uniform(0.8, 3), random.uniform(0, 6.3), random.uniform(0.6, 2)) for _ in range(220)]


def sky(t):
    im = Image.new("RGB", (W, H), BG)
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    cx = W / 2 + 220 * math.sin(t * 0.5)
    gd.ellipse((cx - 520, H * 0.42 - 520, cx + 520, H * 0.42 + 520), fill=80)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    im = Image.composite(Image.new("RGB", (W, H), (78, 56, 20)), im, glow)
    d = ImageDraw.Draw(im)
    for x, y, r, ph, sp in STARS:
        y = (y - t * 14 * sp) % H
        a = 0.45 + 0.55 * math.sin(t * sp * 2.2 + ph)
        c = tuple(int(BG[i] + (GOLD[i] - BG[i]) * a) for i in range(3))
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)
    d.rectangle((0, 0, W, 10), fill=GOLD); d.rectangle((0, H - 10, W, H), fill=GOLD)
    return im


def ctext(d, y, s, font, fill, a=1.0, dy=0):
    c = tuple(int(BG[i] + (fill[i] - BG[i]) * a) for i in range(3))
    w = d.textlength(s, font=font)
    d.text(((W - w) / 2, y + dy), s, font=font, fill=c)


def card(im, pic, t, y=640):
    """Paste a picture as a rounded, gold-edged card that settles in."""
    a = ease(t / 0.35)
    s = 0.92 + 0.08 * a
    p = pic.resize((int(pic.width * s), int(pic.height * s)), Image.LANCZOS)
    x0, y0 = (W - p.width) // 2, y + int((1 - a) * 60) + (pic.height - p.height) // 2
    m = Image.new("L", p.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, p.width - 1, p.height - 1), radius=28, fill=255)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x0 - 6, y0 - 6, x0 + p.width + 6, y0 + p.height + 6), radius=32, fill=GOLD)
    im.paste(p, (x0, y0), m)


def header(d, t, kicker, line1, line2):
    ctext(d, 250, kicker, SANS(34), GOLD, ease(t / 0.3))
    ctext(d, 320, line1, BRAND(86), CREAM, ease((t - 0.1) / 0.35), 30 * (1 - ease((t - 0.1) / 0.35)))
    ctext(d, 430, line2, BRAND(86), GOLD, ease((t - 0.25) / 0.35), 30 * (1 - ease((t - 0.25) / 0.35)))


def footer(d, t, s):
    ctext(d, 1330, s, SANS(44), CREAM, ease((t - 0.4) / 0.4))


# ---------- scenes ----------
produce, atlas = frames_of(f"{CLIPS}/produce.mp4"), frames_of(f"{CLIPS}/atlas.mp4")
menu = {d["slug"]: d for d in json.load(open("src/data/slop/menu.json"))["dishes"]}
SLOP = ["gefilte-mole", "herring-fairy-bread", "gherkin-ripple", "confetti-tuna-cake"]
slop_pics = {}
for s in SLOP:
    p = Image.open(f"public/slop/{s}.jpg").convert("RGB")
    p = p.resize((760, int(p.height * 760 / p.width)), Image.LANCZOS)
    slop_pics[s] = p.crop((0, 0, 760, 860))


def s_title(t, dur):
    im = sky(t); d = ImageDraw.Draw(im)
    ctext(d, 640, "THE WORKSHOP", SANS(44), GOLD, ease(t / 0.4))
    ctext(d, 740, "This week,", BRAND(130), CREAM, ease((t - 0.2) / 0.4), 40 * (1 - ease((t - 0.2) / 0.4)))
    ctext(d, 900, "everything", BRAND(130), GOLD, ease((t - 0.5) / 0.4), 40 * (1 - ease((t - 0.5) / 0.4)))
    ctext(d, 1060, "moves.", BRAND(130), GOLD, ease((t - 0.8) / 0.4), 40 * (1 - ease((t - 0.8) / 0.4)))
    return im


def s_clip(frames, kicker, l1, l2, foot):
    def f(t, dur):
        im = sky(t); d = ImageDraw.Draw(im)
        header(d, t, kicker, l1, l2)
        card(im, frames[min(len(frames) - 1, int(t * FPS))], t)
        footer(ImageDraw.Draw(im), t, foot)
        return im
    return f


def s_slop(t, dur):
    im = sky(t); d = ImageDraw.Draw(im)
    header(d, t, "NOT FOR THE FAINT OF STOMACH", "The worst food", "an AI could find")
    per = dur / len(SLOP); i = min(len(SLOP) - 1, int(t / per)); u = (t - i * per) / per
    pic = slop_pics[SLOP[i]]
    z = 1.0 + 0.06 * u
    zp = pic.resize((int(760 * z), int(860 * z)), Image.LANCZOS).crop((0, 0, 760, 860))
    card(im, zp, t if i == 0 else 1, y=600)
    d = ImageDraw.Draw(im)
    name = menu[SLOP[i]]["name"]; f = BRAND(56)
    while d.textlength(name, font=f) > W - 120: f = BRAND(f.size - 2)
    ctext(d, 1500, name, f, CREAM, 1)
    ctext(d, 1580, f"nastiness {menu[SLOP[i]]['jev']['nastiness']}/100", SANS(34), GOLD, 1)
    return im


def s_end(t, dur):
    im = sky(t); d = ImageDraw.Draw(im)
    ctext(d, 560, "THE WORKSHOP", SANS(44), GOLD, ease(t / 0.3))
    ctext(d, 650, "Out now.", BRAND(150), CREAM, ease((t - 0.1) / 0.4), 40 * (1 - ease((t - 0.1) / 0.4)))
    for k, s in enumerate(["A 3D produce aisle", "215 pages as stars", "12 vile dishes", "+ daf games, tefillin, Taz vs. Bach"]):
        ctext(d, 880 + k * 78, s, SANS(42), (215, 204, 180), ease((t - 0.4 - k * 0.15) / 0.3))
    a = ease((t - 1.1) / 0.4); p = 0.5 + 0.5 * math.sin(t * 6)
    bw, bh = 900, 130; x0 = (W - bw) / 2; y0 = 1330
    g = int(10 * p * a)
    d.rounded_rectangle((x0 - g, y0 - g, x0 + bw + g, y0 + bh + g), radius=80, fill=tuple(int(BG[i] + (GOLD[i] * 0.4 - BG[i]) * a) for i in range(3)))
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=65, fill=tuple(int(BG[i] + (GOLD[i] - BG[i]) * a) for i in range(3)))
    ctext(d, y0 + 38, "theothermatthewmiller.com/newsletter", SANS(42), BG if a > 0.5 else GOLD, 1)
    ctext(d, 1520, "Sign up and this week's issue lands within the hour", SANS(32), CREAM, ease((t - 1.4) / 0.4))
    return im


SCENES = [
    (2.4, s_title),
    (len(produce) / FPS, s_clip(produce, "THE PRODUCE AISLE", "Walk a supermarket", "stocked from Torah", "32 crates · every one has a verse")),
    (len(atlas) / FPS, s_clip(atlas, "THE ATLAS", "The whole site", "as a night sky", "215 pages · hit “Surprise me”")),
    (4.4, s_slop),
    (3.6, s_end),
]

# ---------- render ----------
os.makedirs(OUT, exist_ok=True)
silent = f"{OUT}/.ws-video.mp4"
ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                       "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "medium", silent],
                      stdin=subprocess.PIPE)
cuts, T, prev, last = [], 0.0, None, None
for dur, fn in SCENES:
    cuts.append(T)
    n = round(dur * FPS)
    for i in range(n):
        im = fn(i / FPS, dur)
        if prev is not None and i < 5:  # quick dissolve plus a gold flash on the cut
            im = Image.blend(prev, im, (i + 1) / 6)
            if i < 2:
                im = Image.blend(im, Image.new("RGB", (W, H), GOLD), 0.25 * (2 - i) / 2)
        ff.stdin.write(im.tobytes()); last = im
    prev = last; T += n / FPS
ff.stdin.close(); ff.wait()
last.save(f"{OUT}/whatsapp-status.jpg", quality=88)

# ---------- score: warm pad, pulse at 120bpm, a boom on every cut ----------
N = int(T * SR); t = np.arange(N) / SR
chords = [(110.0, 138.6, 164.8), (98.0, 123.5, 146.8), (87.3, 110.0, 130.8), (98.0, 123.5, 146.8)]
pad = np.zeros(N)
for k, ch in enumerate(chords * 4):
    a, b = int(k * 2.0 * SR), min(N, int((k + 1) * 2.0 * SR))
    if a >= N: break
    tt = t[a:b] - t[a]
    env = np.minimum(1, tt / 0.4) * np.minimum(1, (2.0 - tt) / 0.4)
    for f in ch:
        pad[a:b] += env * (np.sin(2 * np.pi * f * t[a:b]) + 0.3 * np.sin(2 * np.pi * 2 * f * t[a:b]))
pad *= 0.08
beat = np.zeros(N)
for bt in np.arange(0, T, 0.5):
    a = int(bt * SR); L = min(N - a, int(0.18 * SR)); tt = np.arange(L) / SR
    beat[a:a + L] += 0.35 * np.sin(2 * np.pi * (55 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18)
    h = int((bt + 0.25) * SR)
    if h + 2400 < N:
        beat[h:h + 2400] += 0.05 * np.random.default_rng(int(bt * 100)).standard_normal(2400) * np.exp(-np.arange(2400) / 300)
for c in cuts:
    a = int(c * SR); L = min(N - a, int(1.2 * SR)); tt = np.arange(L) / SR
    beat[a:a + L] += 0.5 * np.sin(2 * np.pi * (40 + 60 * np.exp(-tt * 8)) * tt) * np.exp(-tt * 3)
mix = pad + beat
mix *= np.minimum(1, (T - t) / 1.0) * np.minimum(1, t / 0.2)
mix = np.tanh(mix * 1.4) * 0.8
wav = f"{OUT}/.ws-audio.wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
                "-shortest", "-movflags", "+faststart", f"{OUT}/whatsapp-status.mp4"], check=True)
os.remove(silent); os.remove(wav)
print(f"wrote {OUT}/whatsapp-status.mp4 ({T:.1f}s)")
