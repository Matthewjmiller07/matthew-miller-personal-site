"""Render the /projects teaser trailer + poster.

Run from the repo root:
  python3 scripts/projects-trailer/build_trailer.py <fonts_dir>
where <fonts_dir> holds grotesk.ttf (Space Grotesk, variable) and mono.ttf
(JetBrains Mono, variable) from Google Fonts.

Outputs public/videos/projects-trailer.mp4 (1280x720, 24fps, H.264/AAC) and
public/images/projects/trailer-poster.jpg. Every shot is a real screenshot or
GIF from public/; animated GIFs play through their own frames. The score is
synthesized with numpy at 120 bpm and every cut lands on a beat.
"""
import math, os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageSequence

FONTS = sys.argv[1] if len(sys.argv) > 1 else "."
W, H, FPS, SR = 1280, 720, 24, 48000
BPM = 120
BEAT = 60 / BPM  # 0.5 s
INK = (11, 13, 18)
PAPER = (240, 236, 226)
AMBER = (255, 184, 76)
CYAN = (34, 211, 238)
PUB = "public"


def font(name, size, wght):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    try:
        f.set_variation_by_axes([wght])
    except Exception:
        pass
    return f


DISPLAY = lambda s: font("grotesk.ttf", s, 700)
MONO = lambda s: font("mono.ttf", s, 500)


# ---------- media ----------
def load_frames(path, max_frames=48):
    im = Image.open(os.path.join(PUB, path))
    frames = []
    for i, fr in enumerate(ImageSequence.Iterator(im)):
        if i >= max_frames:
            break
        frames.append(fr.convert("RGB"))
    return frames


def cover(img, w, h, zoom=1.0, pan=(0.5, 0.5)):
    iw, ih = img.size
    s = max(w / iw, h / ih) * zoom
    nw, nh = int(iw * s), int(ih * s)
    img = img.resize((nw, nh), Image.LANCZOS)
    x = int((nw - w) * pan[0])
    y = int((nh - h) * pan[1])
    return img.crop((x, y, x + w, y + h))


def grade(img, amt=0.18):
    """Cool shadows / warm highlights, a little contrast, vignette."""
    a = np.asarray(img).astype(np.float32) / 255
    a = np.clip((a - 0.5) * 1.08 + 0.5, 0, 1)
    lum = a.mean(axis=2, keepdims=True)
    tint = lum * np.array([1.0, 0.92, 0.8]) + (1 - lum) * np.array([0.75, 0.9, 1.0])
    a = a * (1 - amt) + a * tint * amt
    yy, xx = np.mgrid[0:H, 0:W]
    v = 1 - 0.55 * (((xx - W / 2) / (W / 1.3)) ** 2 + ((yy - H / 2) / (H / 1.1)) ** 2)
    a = a * np.clip(v, 0.25, 1)[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def text_size(d, txt, f):
    x0, y0, x1, y1 = d.textbbox((0, 0), txt, font=f)
    return x1 - x0, y1 - y0, x0, y0


def lower_third(img, label, title, t):
    """Mono category label + project name, sliding in from the left."""
    d = ImageDraw.Draw(img, "RGBA")
    k = min(1, t / 0.25)
    e = 1 - (1 - k) ** 3
    x = int(56 - 40 * (1 - e))
    d.rectangle([0, H - 150, W, H], fill=(11, 13, 18, 150))
    d.rectangle([x, H - 112, x + 4, H - 44], fill=AMBER + (int(255 * e),))
    d.text((x + 22, H - 112), label.upper(), font=MONO(18), fill=AMBER + (int(255 * e),))
    d.text((x + 20, H - 86), title, font=DISPLAY(40), fill=PAPER + (int(255 * e),))


def grain(img, rng, amt=4):
    a = np.asarray(img).astype(np.int16)
    n = rng.integers(-amt, amt + 1, size=(H, W, 1), dtype=np.int16)
    return Image.fromarray(np.clip(a + n, 0, 255).astype(np.uint8))


# ---------- shots ----------
# (label, title, media path)
TORAH = [
    ("Jewish Studies", "Kohelet Reader", "images/kohelet/hero.jpg"),
    ("Jewish Studies", "Color-Coded Bible", "images/previews/colorcodedbible.gif"),
    ("Jewish Studies", "Parsha Explorer", "images/previews/parshaexplorer.gif"),
    ("Jewish Studies", "Source Sheet Creator", "images/previews/source-sheet-creator.jpg"),
    ("Jewish Studies", "Memory Quiz", "images/previews/MemoryQuiz.png"),
    ("Jewish Studies", "Haftara Stats", "images/previews/HaftaraStats.png"),
]
DATA = [
    ("Data Viz", "Pinmap", "images/previews/pinmap.gif"),
    ("Data Viz", "Biblical & US/UK City Names", "images/previews/MegaMap.png"),
    ("Data Viz", "Trader Joe's Spice Matrix", "images/tjs-spice-hero.png"),
    ("Jewish Studies", "Zmanim Tracker", "images/previews/zmanim.gif"),
]
HOLD = [
    ("Writing", "Ha'azinu Parasha Sheet", "images/previews/haazinu-parasha-sheet.png"),
    ("Book", "Interlinear Bible", "images/Interlinear Bible.gif"),
    ("Design", "Business Card Calendar", "calendar/preview.png"),
    ("Garmin", "ZmanimFace Watchface", "images/zmanim-watchface-analysis.png"),
]
LIVE = [
    ("AI Matthew", "Arcimboldo Matthew", "images/AI-Matthew/00026-2665084775.png"),
    ("AI Matthew", "Action-figure Matthew", "images/AI-Matthew/00012-3200548987.png"),
    ("AI Matthew", "Claymation Matthew", "images/AI-Matthew/00022-3026340886.png"),
]
MONTAGE = [
    "images/previews/micrographymatthew.jpeg",
    "images/previews/torahscheduler.gif",
    "images/previews/whenarethejewishholidays.png",
    "images/tel-aviv-kosher.png",
    "images/previews/vzot-haberachah-parasha-sheet.png",
    "images/bible-characters-timeline.png",
    "images/previews/SefariaMemory.png",
    "images/Mevakshim Book.gif",
    "images/previews/bibleMap.png",
    "images/kohelet/hero.jpg",
    "images/previews/colorcodedbible.gif",
    "images/previews/pinmap.gif",
]

media_cache = {}


def media(p):
    if p not in media_cache:
        media_cache[p] = load_frames(p)
    return media_cache[p]


# A timeline of segments: (kind, beats, payload)
TL = [
    ("type", 6, "~/projects $ ls | wc -l"),
    ("count", 4, None),
    ("word", 2, ("Torah,", "rebuilt as software.")),
    *[("shot", 2, s) for s in TORAH],
    ("word", 2, ("Data,", "made visible.")),
    *[("shot", 2, s) for s in DATA],
    ("word", 2, ("AI,", "with a sense of humor.")),
    *[("shot", 2, s) for s in LIVE],
    ("word", 2, ("Things you", "can hold.")),
    *[("shot", 2, s) for s in HOLD],
    ("montage", 6, MONTAGE),
    ("end", 10, None),
]
TOTAL_BEATS = sum(b for _, b, _ in TL)
DUR = TOTAL_BEATS * BEAT
COUNT = int(os.environ.get("PROJECT_COUNT", "70"))


def centered(d, txt, f, y, fill):
    w, h, x0, y0 = text_size(d, txt, f)
    d.text(((W - w) / 2 - x0, y - y0), txt, font=f, fill=fill)
    return w, h


def render_segment(kind, beats, payload, t, idx, rng):
    seg = beats * BEAT
    u = t / seg
    if kind == "type":
        img = Image.new("RGB", (W, H), INK)
        d = ImageDraw.Draw(img)
        n = int(len(payload) * min(1, t / (seg * 0.7)))
        f = MONO(40)
        txt = payload[:n] + ("█" if int(t * 3) % 2 == 0 else " ")
        w, h, x0, y0 = text_size(d, payload + "█", f)
        d.text(((W - w) / 2 - x0, H / 2 - h / 2 - y0), txt, font=f, fill=CYAN)
        return img
    if kind == "count":
        img = Image.new("RGB", (W, H), INK)
        d = ImageDraw.Draw(img)
        k = min(1, t / (seg * 0.6))
        val = int(round(COUNT * (1 - (1 - k) ** 3)))
        centered(d, f"{val}+", DISPLAY(220), H / 2 - 160, AMBER)
        centered(d, "THINGS BUILT. ONE WORKSHOP.", MONO(28), H / 2 + 100, PAPER)
        return img
    if kind == "word":
        a, b = payload
        img = Image.new("RGB", (W, H), INK)
        d = ImageDraw.Draw(img)
        e = 1 - (1 - min(1, t / 0.3)) ** 3
        f1, f2 = DISPLAY(118), DISPLAY(56)
        w, h, x0, y0 = text_size(d, a, f1)
        d.text(((W - w) / 2 - x0, H / 2 - 120 - y0 + 30 * (1 - e)), a, font=f1, fill=PAPER)
        if t > BEAT * 0.5:
            centered(d, b, f2, H / 2 + 40, AMBER)
        return img
    if kind == "shot":
        label, title, path = payload
        frames = media(path)
        fr = frames[int(t * 12) % len(frames)] if len(frames) > 1 else frames[0]
        z = 1.04 + 0.08 * u
        pan = (0.5 + 0.12 * math.sin(idx * 1.7) * (u - 0.5), 0.3 if fr.size[1] >= fr.size[0] else 0.5)
        img = grade(cover(fr, W, H, z, pan))
        if t < 0.08:  # flash on the cut
            img = Image.blend(img, Image.new("RGB", (W, H), PAPER), 0.35)
        lower_third(img, label, title, t)
        return img
    if kind == "montage":
        k = int(t / (BEAT / 2)) % len(payload)
        frames = media(payload[k])
        fr = frames[int(t * 12) % len(frames)]
        img = grade(cover(fr, W, H, 1.15, (0.5, 0.4)), 0.3)
        d = ImageDraw.Draw(img, "RGBA")
        d.rectangle([0, 0, W, H], fill=(11, 13, 18, 70))
        return img
    if kind == "end":
        img = Image.new("RGB", (W, H), INK)
        d = ImageDraw.Draw(img, "RGBA")
        e = 1 - (1 - min(1, t / 0.6)) ** 3
        # drifting grid
        off = int(t * 12) % 48
        for x in range(-48 + off, W, 48):
            d.line([(x, 0), (x, H)], fill=(255, 255, 255, 10))
        for y in range(-48 + off, H, 48):
            d.line([(0, y), (W, y)], fill=(255, 255, 255, 10))
        centered(d, "MATTHEW MILLER", MONO(26), 150, CYAN + (int(255 * e),))
        centered(d, "The Workshop", DISPLAY(150), 210, PAPER + (int(255 * e),))
        if t > BEAT * 2:
            e2 = min(1, (t - BEAT * 2) / 0.4)
            centered(d, "New builds every week. Get them first.", DISPLAY(40), 420, AMBER + (int(255 * e2),))
        if t > BEAT * 4:
            e3 = min(1, (t - BEAT * 4) / 0.4)
            centered(d, "theothermatthewmiller.com/projects", MONO(30), 510, PAPER + (int(200 * e3),))
        fade = max(0, (t - (seg - 0.8)) / 0.8)
        if fade:
            img = Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), fade)
        return img
    raise ValueError(kind)


def frame_at(t, rng):
    acc = 0.0
    for i, (kind, beats, payload) in enumerate(TL):
        seg = beats * BEAT
        if t < acc + seg or i == len(TL) - 1:
            img = render_segment(kind, beats, payload, t - acc, i, rng)
            # letterbox
            d = ImageDraw.Draw(img)
            d.rectangle([0, 0, W, 40], fill=(0, 0, 0))
            d.rectangle([0, H - 40, W, H], fill=(0, 0, 0))
            return grain(img, rng)
        acc += seg


# ---------- score ----------
def score():
    n = int(DUR * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    beat_starts = [b * BEAT for b in range(TOTAL_BEATS)]
    # where the music proper begins (after the typing intro) and the end card
    intro_end = 6 * BEAT
    end_start = (TOTAL_BEATS - 10) * BEAT
    mont_start = end_start - 6 * BEAT

    def add(sig, at):
        i = int(at * SR)
        j = min(n, i + len(sig))
        if i < n:
            out[i:j] += sig[: j - i]

    # kick
    kl = int(0.35 * SR)
    kt = np.arange(kl) / SR
    kick = np.sin(2 * np.pi * (45 + 120 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 9)
    # hat
    hl = int(0.05 * SR)
    hat = np.random.default_rng(1).standard_normal(hl) * np.exp(-np.arange(hl) / SR * 90)
    hat = np.diff(hat, prepend=0)
    # typing ticks in the intro
    for k in range(18):
        add(hat * 0.25, 0.2 + k * 0.13)
    for b in beat_starts:
        if intro_end <= b < end_start:
            add(kick * 0.9, b)
            add(hat * 0.18, b + BEAT / 2)
            if b >= mont_start:
                add(hat * 0.15, b + BEAT / 4)
                add(hat * 0.15, b + 3 * BEAT / 4)
    # boom on the end card
    bl = int(3.5 * SR)
    bt = np.arange(bl) / SR
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-bt * 6)) * bt) * np.exp(-bt * 1.4)
    add(boom * 1.2, end_start)
    add(boom * 0.8, intro_end)

    # bass + pad: i - VI - III - VII in A minor, one chord per 2 bars
    roots = [55.0, 43.65, 65.41, 49.0]
    chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]
    bar = 4 * BEAT
    env_on = (t >= intro_end) & (t < end_start + 4)
    ci = ((t - intro_end) // (2 * bar)).astype(int) % 4
    ci = np.clip(ci, 0, 3)
    root = np.array(roots)[ci]
    phase8 = ((t - intro_end) % (BEAT / 2)) / (BEAT / 2)
    bass = np.sign(np.sin(2 * np.pi * root * t)) * 0.12 * np.exp(-phase8 * 3)
    pad = np.zeros(n, np.float32)
    for v in range(3):
        f = np.array([c[v] for c in chords])[ci]
        pad += np.sin(2 * np.pi * f * t + v) * 0.035 + np.sin(2 * np.pi * f * 1.003 * t) * 0.03
    rise = np.clip((t - intro_end) / 6, 0, 1)
    out += (bass + pad * (0.4 + 0.6 * rise)) * env_on
    # arpeggio over the montage
    arp_on = (t >= mont_start) & (t < end_start)
    step = ((t - mont_start) // (BEAT / 4)).astype(int)
    notes = np.array([440, 523.3, 659.3, 880])[step % 4] * np.where(ci == 1, 0.8, 1)
    stepph = ((t - mont_start) % (BEAT / 4)) / (BEAT / 4)
    out += np.sin(2 * np.pi * notes * t) * np.exp(-stepph * 4) * 0.08 * arp_on
    # riser into the montage
    rl = int(mont_start * SR) - int((mont_start - 3) * SR)
    rt = np.arange(rl) / SR
    riser = np.random.default_rng(2).standard_normal(rl) * (rt / rt[-1]) ** 2 * 0.12
    add(riser.astype(np.float32), mont_start - 3)
    # end pad tail
    tail = (t >= end_start)
    out += np.sin(2 * np.pi * 110 * t) * 0.06 * np.exp(-(t - end_start).clip(0) * 0.4) * tail
    out += np.sin(2 * np.pi * 164.8 * t) * 0.04 * np.exp(-(t - end_start).clip(0) * 0.4) * tail
    # master: soft clip + fade
    out = np.tanh(out * 1.4) * 0.8
    fade = np.clip((DUR - t) / 1.0, 0, 1)
    out *= fade
    return (out * 32767).astype(np.int16)


def main():
    os.makedirs(f"{PUB}/videos", exist_ok=True)
    os.makedirs(f"{PUB}/images/projects", exist_ok=True)
    wav = "/tmp/projects-trailer.wav" if not os.environ.get("TMPDIR") else os.path.join(os.environ["TMPDIR"], "projects-trailer.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(score().tobytes())
    out = f"{PUB}/videos/projects-trailer.mp4"
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-tune", "film",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", out],
        stdin=subprocess.PIPE,
    )
    rng = np.random.default_rng(7)
    nframes = int(DUR * FPS)
    poster_t = DUR - 3.0
    for i in range(nframes):
        img = frame_at(i / FPS, rng)
        ff.stdin.write(img.tobytes())
        if abs(i / FPS - poster_t) < 0.5 / FPS:
            img.save(f"{PUB}/images/projects/trailer-poster.jpg", quality=86)
    ff.stdin.close()
    ff.wait()
    print(f"wrote {out} ({DUR:.1f}s, {nframes} frames)")


if __name__ == "__main__":
    main()
