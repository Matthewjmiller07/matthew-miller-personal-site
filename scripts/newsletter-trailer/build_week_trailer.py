"""Render the weekly Workshop trailer (week of 5 October 2026) and two GIFs.

Run from the repo root:
  python3 scripts/newsletter-trailer/build_week_trailer.py

Outputs into public/newsletter/2026-10-05/:
  trailer.mp4         1280x720, 24fps, H.264/AAC, ~36s
  trailer-poster.jpg  title-card still
  whose-lamb.gif      600px loop of the Daf Yomi showdown
  teaser.gif          600px loop: fast montage into the title slam
Shots are GPT Image 2 (low) stills from the newsletter plus real screenshots
from public/. The score is synthesized with numpy/scipy; every hit lands on a cut.
"""
import math, os, shutil, subprocess, wave
import numpy as np
from scipy.signal import butter, lfilter
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, SR = 1280, 720, 24, 48000
OUT = "public/newsletter/2026-10-05"
GOLD = (232, 196, 120)
WHITE = (248, 244, 234)
TMP = os.environ.get("TMPDIR", "/tmp")

TITLE = lambda s: ImageFont.truetype("public/fonts/brand.ttf", s)  # Marcellus
MONO = lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", s)
HEB = lambda s: ImageFont.truetype("public/fonts/NotoSerifHebrew-Bold.ttf", s)

_cache = {}


def img(path):
    if path not in _cache:
        _cache[path] = Image.open(path).convert("RGB")
    return _cache[path]


N = lambda name: f"{OUT}/{name}"
P = lambda name: f"public/{name}"


def ease(x):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def cover(im, zoom=1.0, pan=(0.5, 0.5)):
    iw, ih = im.size
    s = max(W / iw, H / ih) * zoom
    nw, nh = int(iw * s + 1), int(ih * s + 1)
    im = im.resize((nw, nh), Image.BILINEAR)
    x = int((nw - W) * pan[0])
    y = int((nh - H) * pan[1])
    return im.crop((x, y, x + W, y + H))


_yy, _xx = np.mgrid[0:H, 0:W]
VIGNETTE = np.clip(1 - 0.6 * (((_xx - W / 2) / (W / 1.25)) ** 2 + ((_yy - H / 2) / (H / 1.05)) ** 2), 0.2, 1)[..., None]


def grade(im, dark=0.0):
    """Teal shadows / amber highlights, contrast, vignette, optional darken."""
    a = np.asarray(im).astype(np.float32) / 255
    a = np.clip((a - 0.5) * 1.12 + 0.5, 0, 1)
    lum = a.mean(axis=2, keepdims=True)
    tint = lum * np.array([1.0, 0.9, 0.75]) + (1 - lum) * np.array([0.7, 0.92, 1.0])
    a = a * 0.8 + a * tint * 0.2
    a = a * VIGNETTE * (1 - dark)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def shot(path, t, dur, z0=1.04, z1=1.16, pan0=(0.5, 0.5), pan1=(0.5, 0.5), dark=0.0):
    u = t / dur
    pan = (pan0[0] + (pan1[0] - pan0[0]) * u, pan0[1] + (pan1[1] - pan0[1]) * u)
    return grade(cover(img(path), z0 + (z1 - z0) * u, pan), dark)


def spaced_size(d, txt, f, track):
    w = 0
    for ch in txt:
        w += d.textlength(ch, font=f) + track
    return w - track


def title(base, txt, size, y, alpha=1.0, color=WHITE, track=None, scale=1.0, glow=True, font=TITLE):
    """Letter-spaced, centered trailer type with a soft glow, composited onto base."""
    if alpha <= 0:
        return base
    f = font(int(size * scale))
    track = int((size * 0.18 if track is None else track) * scale)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w = spaced_size(d, txt, f, track)
    x = (W - w) / 2
    asc = f.getbbox("H")[1]
    for ch in txt:
        d.text((x, y - asc), ch, font=f, fill=color + (255,))
        x += d.textlength(ch, font=f) + track
    # dark shadow so the type reads on bright frames
    sa = np.asarray(layer.filter(ImageFilter.GaussianBlur(max(6, size // 6)))).astype(np.float32)
    sa[..., :3] = 0
    sa[..., 3] = np.clip(sa[..., 3] * 2.2, 0, 235)
    shadow = Image.fromarray(sa.astype(np.uint8))
    if glow:
        g = layer.filter(ImageFilter.GaussianBlur(10))
        ga = np.asarray(g).astype(np.float32)
        ga[..., 3] *= 0.45
        layer = Image.alpha_composite(Image.fromarray(ga.astype(np.uint8)), layer)
    layer = Image.alpha_composite(shadow, layer)
    if alpha < 1:
        la = np.asarray(layer).astype(np.float32)
        la[..., 3] *= alpha
        layer = Image.fromarray(la.astype(np.uint8))
    return Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")


def hebrew(base, txt, size, y, alpha=1.0):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = HEB(size)
    w = d.textlength(txt, font=f, direction="rtl")
    d.text(((W - w) / 2, y), txt, font=f, fill=GOLD + (int(230 * alpha),), direction="rtl")
    return Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")


def label(base, txt, t):
    """Small mono tag, lower left, sliding in."""
    e = ease(t / 0.3)
    d = ImageDraw.Draw(base, "RGBA")
    x = int(70 - 30 * (1 - e))
    tw = d.textlength(txt, font=MONO(20))
    d.rectangle([x - 10, H - 134, x + 30 + tw, H - 92], fill=(0, 0, 0, int(150 * e)))
    d.rectangle([x, H - 128, x + 3, H - 98], fill=GOLD + (int(255 * e),))
    d.text((x + 16, H - 124), txt, font=MONO(20), fill=WHITE + (int(235 * e),))
    return base


def flash(im, t, length=0.12, amt=0.8):
    if t < length:
        return Image.blend(im, Image.new("RGB", (W, H), (255, 246, 228)), amt * (1 - t / length))
    return im


def black():
    return Image.new("RGB", (W, H), (0, 0, 0))


def fade_in_out(t, dur, a=0.35, b=0.35):
    return min(ease(t / a), ease((dur - t) / b)) if dur - t < b else ease(t / a)


# ---------- timeline: (start, end, renderer) ----------
MONTAGE = [
    (P("images/previews/noach-parasha-sheet.png"), "NOACH PARASHA SHEET"),
    (N("siddur.jpg"), "MEGA SIDDUR"),
    (P("images/previews/source-sheet-creator.jpg"), "SOURCE SHEET CREATOR"),
    (P("diorama/plate.png"), "3D BRONZE QUILL"),
    (P("parasha-books/noach/page-03.jpg"), "PARASHA BOOKS"),
    (N("lamb.jpg"), "DAF YOMI ARCADE"),
    (P("images/previews/bereshit-parasha-sheet.png"), "BERESHIT PARASHA SHEET"),
    (P("images/previews/micrographymatthew.jpeg"), "MICROGRAPHY"),
    (N("epic-siddur.jpg"), ""),
    (P("parasha-books/bereshit/page-05.jpg"), ""),
    (N("epic-laser.jpg"), ""),
    (N("epic-book.jpg"), ""),
]
MSTART, MEND = 23.0, 27.0
DROP = 27.6
HITS = [5.0, 8.0, 11.5, 15.5, 19.0, 22.0, DROP]


def render(t):
    # 1. cold open
    if t < 5.0:
        im = black()
        if t < 2.6:
            im = title(im, "THIS WEEK", 64, 320, fade_in_out(t, 2.6, 0.8, 0.5), track=26)
        else:
            u = t - 2.6
            im = title(im, "IN ONE WORKSHOP", 64, 320, fade_in_out(u, 2.4, 0.8, 0.4), track=20, color=GOLD)
        return im
    # 2. the quill + numbers
    if t < 8.0:
        u = t - 5.0
        im = shot(N("epic-quill.jpg"), u, 3.0, 1.02, 1.14, (0.55, 0.5), (0.62, 0.45), dark=0.35)
        n = int(round(40 * ease(u / 1.2)))
        im = title(im, f"{n}", 190, 210, 1.0, GOLD, track=6)
        im = title(im, "COMMITS", 40, 450, ease((u - 0.3) / 0.4), track=22)
        if u > 1.5:
            im = title(im, "22,000 LINES · 7 DAYS", 28, 520, ease((u - 1.5) / 0.4), GOLD, track=10)
        return flash(im, u)
    # 3. siddur
    if t < 11.5:
        u = t - 8.0
        im = shot(N("epic-siddur.jpg"), u, 3.5, 1.0, 1.18, (0.5, 0.6), (0.5, 0.45), dark=0.1)
        im = title(im, "A SIDDUR", 72, 250, ease((u - 0.2) / 0.5))
        im = title(im, "THAT KNOWS WHAT TIME IT IS", 40, 350, ease((u - 1.1) / 0.5), GOLD, track=10)
        im = label(im, "MEGA SIDDUR  /mega-siddur", u)
        return flash(im, u)
    # 4. laser + micrography
    if t < 15.5:
        u = t - 11.5
        if u < 2.4:
            im = shot(N("epic-laser.jpg"), u, 2.4, 1.05, 1.2, (0.5, 0.4), (0.52, 0.5), dark=0.15)
            im = title(im, "YOUR FACE", 72, 230, ease((u - 0.15) / 0.4))
            im = title(im, "IN 10,000 LETTERS", 44, 330, ease((u - 0.9) / 0.4), GOLD, track=12)
        else:
            v = u - 2.4
            im = shot(P("images/previews/micrographymatthew.jpeg"), v, 1.6, 1.0, 1.25, (0.5, 0.25), (0.5, 0.3), dark=0.15)
            im = label(im, "MICROGRAPHY  /micrography", v)
            im = flash(im, v, 0.08, 0.5)
        return flash(im, u)
    # 5. parasha books
    if t < 19.0:
        u = t - 15.5
        if u < 2.3:
            im = shot(N("epic-book.jpg"), u, 2.3, 1.02, 1.15, (0.5, 0.5), (0.45, 0.4), dark=0.1)
            im = title(im, "YOUR KIDS.", 72, 220, ease((u - 0.15) / 0.4))
            im = title(im, "INSIDE THE STORY.", 50, 320, ease((u - 0.9) / 0.4), GOLD, track=12)
        else:
            v = u - 2.3
            im = shot(P("parasha-books/noach/page-03.jpg"), v, 1.2, 1.05, 1.15)
            im = label(im, "PARASHA BOOKS  /parasha-books", v)
            im = flash(im, v, 0.08, 0.5)
        return flash(im, u)
    # 6. the lamb standoff
    if t < MSTART:
        u = t - 19.0
        im = shot(N("epic-lamb.jpg"), u, 4.0, 1.02, 1.22, (0.5, 0.55), (0.5, 0.62), dark=0.1 if u < 3 else 0.35)
        if u < 3.0:
            im = title(im, "ONE LAMB.", 64, 150, ease((u - 0.2) / 0.4))
            im = title(im, "TOO MANY OWNERS.", 64, 240, ease((u - 1.2) / 0.4), GOLD)
        else:
            v = u - 3.0
            im = title(im, "WHOSE LAMB IS IT?", 76, 260, 1.0, scale=1.25 - 0.25 * ease(v / 0.25))
            im = hebrew(im, "בכורות י–יא", 36, 370, ease((v - 0.3) / 0.3))
            im = flash(im, v)
        im = label(im, "DAF YOMI ARCADE  /daf", u)
        return flash(im, u)
    # 7. montage, cuts every 1/3 s
    if t < MEND:
        u = t - MSTART
        k = int(u / (1 / 3))
        path, lab = MONTAGE[k % len(MONTAGE)]
        v = u - k / 3
        im = shot(path, v, 1 / 3, 1.08, 1.16, (0.5, 0.3), (0.5, 0.35))
        if lab:
            d = ImageDraw.Draw(im, "RGBA")
            tw = d.textlength(lab, font=MONO(20))
            d.rectangle([58, H - 132, 82 + tw, H - 96], fill=(0, 0, 0, 170))
            d.text((70, H - 124), lab, font=MONO(20), fill=WHITE + (230,))
        return flash(im, v, 0.06, 0.5)
    # 8. the pause before the drop
    if t < DROP:
        return black()
    # 9. title slam
    if t < 32.0:
        u = t - DROP
        im = shot(N("workshop.jpg"), u, 4.4, 1.0, 1.1, (0.5, 0.4), (0.5, 0.35), dark=0.45)
        im = title(im, "THE WORKSHOP", 104, 250, 1.0, scale=1.3 - 0.3 * ease(u / 0.3), track=18)
        im = title(im, "WEEK OF 5 OCTOBER 2026", 30, 390, ease((u - 0.8) / 0.5), GOLD, track=12)
        return flash(im, u, 0.25, 1.0)
    # 10. end card
    u = t - 32.0
    im = black()
    a = ease(u / 0.6) * min(1, (4.0 - u) / 0.8)
    im = title(im, "MATTHEW MILLER", 26, 230, a, GOLD, track=14, glow=False, font=MONO)
    im = title(im, "New builds every week", 54, 300, a)
    im = title(im, "theothermatthewmiller.com/projects", 26, 420, a, GOLD, track=4, glow=False, font=MONO)
    return im


DUR = 36.0


def letterbox(im):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 52], fill=(0, 0, 0))
    d.rectangle([0, H - 52, W, H], fill=(0, 0, 0))
    return im


def grain(im, rng):
    a = np.asarray(im).astype(np.int16)
    n = rng.integers(-5, 6, size=(H, W, 1), dtype=np.int16)
    return Image.fromarray(np.clip(a + n, 0, 255).astype(np.uint8))


# ---------- score ----------
def lowpass(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2))
    return lfilter(b, a, x)


def score():
    n = int(DUR * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    rng = np.random.default_rng(3)

    def add(sig, at, gain=1.0):
        i = int(at * SR)
        j = min(n, i + len(sig))
        if 0 <= i < n:
            out[i:j] += gain * sig[: j - i]

    def saw(f, tt):
        return 2 * ((f * tt) % 1) - 1

    # braam: detuned low saws, filtered, slow decay
    bl = int(3.2 * SR)
    bt = np.arange(bl) / SR
    braam = sum(saw(f * d, bt) for f in (55, 82.4, 110) for d in (0.995, 1.0, 1.006))
    braam = lowpass(braam, 700) * np.minimum(1, bt / 0.04) * np.exp(-bt * 1.1) * 0.16
    sub = np.sin(2 * np.pi * (34 + 50 * np.exp(-bt * 8)) * bt) * np.exp(-bt * 1.6) * 0.9
    hit = braam + sub

    # taiko
    tl = int(0.6 * SR)
    tt = np.arange(tl) / SR
    taiko = np.sin(2 * np.pi * (70 + 90 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 7)
    taiko += lowpass(rng.standard_normal(tl), 900) * np.exp(-tt * 30) * 0.4
    # tick
    kl = int(0.03 * SR)
    tick = np.diff(rng.standard_normal(kl), prepend=0) * np.exp(-np.arange(kl) / SR * 200) * 0.25

    # drone under everything until the end card
    drone = (np.sin(2 * np.pi * 41.2 * t) * 0.18 + np.sin(2 * np.pi * 61.7 * t) * 0.08) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t))
    drone *= np.clip(t / 3, 0, 1) * (t < 32) * np.where((t >= MEND) & (t < DROP), 0, 1)
    out += drone

    for h in HITS:
        add(hit, h, 1.4 if h == DROP else 1.0)
    # siddur: a clock that knows what time it is
    for k in range(int(3.5 / 0.5)):
        add(tick, 8.0 + k * 0.5)
    # pulse taikos through the middle, faster in the lamb segment
    for s, e, step in ((8.0, 15.5, 0.6), (15.5, 19.0, 0.3), (19.0, 22.0, 0.3)):
        x = s
        while x < e - 0.05:
            add(taiko, x, 0.5)
            x += step
    # montage: a taiko on every cut, plus doubles
    x = MSTART
    while x < MEND - 0.01:
        add(taiko, x, 0.9)
        add(taiko, x + 1 / 6, 0.4)
        x += 1 / 3

    # string ostinato (D minor) from the books segment to the drop
    on = (t >= 15.5) & (t < MEND)
    step = ((t - 15.5) // 0.15).astype(int)
    seq = np.array([146.8, 174.6, 220.0, 174.6, 146.8, 220.0, 261.6, 220.0])
    f = seq[step % 8] * np.where(t >= 19.0, 2, 1)
    ph = ((t - 15.5) % 0.15) / 0.15
    strings = saw(f, t) * np.exp(-ph * 3) * 0.06
    strings = lowpass(strings, 2500) * on * np.clip((t - 15.5) / 8, 0.3, 1)
    out += strings

    # risers into the standoff reveal and into the drop
    for s, e in ((20.5, 22.0), (25.0, MEND)):
        rl = int((e - s) * SR)
        rt = np.arange(rl) / SR
        k = rt / rt[-1]
        r = rng.standard_normal(rl) * k ** 2 * 0.25 + np.sin(2 * np.pi * (200 + 1400 * k ** 2) * rt) * k ** 3 * 0.12
        add(r, s)

    # end chord
    tail = t >= DROP
    env = np.exp(-(t - DROP).clip(0) * 0.35) * tail
    for fq, g in ((73.4, 0.14), (110, 0.1), (146.8, 0.08), (174.6, 0.06), (220, 0.05)):
        out += saw(fq, t) * 0.5 * g * env
    out[tail] = out[tail]  # keep
    out = lowpass(out, 6000)
    out = np.tanh(out * 1.3) * 0.85
    out *= np.clip((DUR - t) / 2.0, 0, 1)
    return (out * 32767).astype(np.int16)


def main():
    wav = os.path.join(TMP, "week-trailer.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(score().tobytes())
    mp4 = f"{OUT}/trailer.mp4"
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-tune", "film",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", mp4],
        stdin=subprocess.PIPE,
    )
    rng = np.random.default_rng(7)
    for i in range(int(DUR * FPS)):
        t = i / FPS
        im = grain(letterbox(render(t)), rng)
        ff.stdin.write(im.tobytes())
        if abs(t - 29.5) < 0.5 / FPS:
            im.save(f"{OUT}/trailer-poster.jpg", quality=88)
    ff.stdin.close()
    ff.wait()

    def gif(name, segments, fps=10, width=480):
        """Render GIF frames straight from the timeline (no grain, so they compress)."""
        d = os.path.join(TMP, name + "-frames")
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)
        k = 0
        for s0, e0 in segments:
            for i in range(int((e0 - s0) * fps)):
                im = render(s0 + i / fps).crop((0, 52, W, H - 52))
                im.resize((width, int(width * im.size[1] / W)), Image.LANCZOS).save(f"{d}/{k:04d}.png")
                k += 1
        vf = "split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", f"{d}/%04d.png",
                        "-filter_complex", vf, "-loop", "0", f"{OUT}/{name}"], check=True)

    gif("whose-lamb.gif", [(19.0, 23.0)])
    gif("teaser.gif", [(MSTART, MSTART + 8 / 3), (DROP, DROP + 3.0)])
    for f in ("trailer.mp4", "whose-lamb.gif", "teaser.gif"):
        print(f, os.path.getsize(f"{OUT}/{f}") // 1024, "KB")


if __name__ == "__main__":
    main()
