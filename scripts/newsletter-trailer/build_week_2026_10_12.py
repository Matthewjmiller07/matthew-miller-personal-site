"""Trailer and GIFs for the week-of-12-October-2026 Workshop email.

Run from the repo root:
  python3 scripts/newsletter-trailer/build_week_2026_10_12.py

Reads the GPT Image 2 (low) stills in public/newsletter/2026-10-12/epic-*.jpg and the
lip-sync films in public/video/929-lipsync/, and writes into public/newsletter/2026-10-12/:
  court.gif           1 Kings 3 lip-sync film, 544px, ~8s loop (headliner)
  voices.gif          1 Kings 1: six characters, one second each
  mishnah.gif, goats.gif, gibeon.gif   3s breathing loops with a title
  card-*.jpg          static stills for the other sections
  trailer.mp4         1280x720, ~38s, the lip-sync clips keep their own voices
  trailer-poster.jpg  title-card still
  whatsapp-status.jpg / .mp4, linkedin.jpg   social kit (run with --social)
Needs only numpy, Pillow and ffmpeg.
"""
import math, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = "public/newsletter/2026-10-12"
VID = "public/video/929-lipsync"
TMP = os.environ.get("TMPDIR", "/tmp")
GOLD, WHITE = (232, 196, 120), (248, 244, 234)
TITLE = lambda s: ImageFont.truetype("public/fonts/brand.ttf", s)  # Marcellus
SR = 48000


# ---------- frame helpers ----------

def still(name):
    return Image.open(f"{OUT}/{name}").convert("RGB")


def cover(im, w, h, zoom=1.0, pan=(0.5, 0.5)):
    """Scale to cover w x h at the given zoom, cropping around pan."""
    s = max(w / im.width, h / im.height) * zoom
    r = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
    x = round((r.width - w) * pan[0]); y = round((r.height - h) * pan[1])
    return r.crop((x, y, x + w, y + h))


def shade(im, top=0.0, bottom=0.55):
    """Darken towards the bottom (and optionally the top) so titles read."""
    a = np.asarray(im).astype(np.float32)
    h = a.shape[0]
    t = np.linspace(0, 1, h)[:, None, None]
    k = 1 - bottom * np.clip((t - 0.45) / 0.55, 0, 1) ** 1.4 - top * np.clip((0.3 - t) / 0.3, 0, 1)
    return Image.fromarray(np.clip(a * k, 0, 255).astype(np.uint8))


def label(im, big, small=None, size=None, align="left"):
    """Gold kicker over a white title, bottom left (or centred)."""
    w, h = im.size
    size = size or max(18, w // 22)
    d = ImageDraw.Draw(im)
    fb, fs = TITLE(size), TITLE(max(12, int(size * 0.5)))
    pad = int(w * 0.05)
    bw = d.textlength(big, font=fb)
    y = h - pad - size
    x = pad if align == "left" else (w - bw) / 2
    if small:
        sw = d.textlength(small, font=fs)
        sx = pad if align == "left" else (w - sw) / 2
        d.text((sx + 1, y - int(size * 0.75) + 1), small, font=fs, fill=(0, 0, 0))
        d.text((sx, y - int(size * 0.75)), small, font=fs, fill=GOLD)
    d.text((x + 2, y + 2), big, font=fb, fill=(0, 0, 0))
    d.text((x, y), big, font=fb, fill=WHITE)
    return im


def glint(im, u):
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    pos = (u * 1.6 - 0.3) * (w + h)
    band = np.exp(-(((xx + yy * 0.6) - pos) / (w / 7)) ** 2)[..., None]
    return Image.fromarray(np.clip(a + band * 34, 0, 255).astype(np.uint8))


def clip_frames(path, start, dur, w, h, fps, crop_y=0.42):
    """Decode a slice of a square film, centre-cropped to w:h."""
    side = 1024
    ch = round(side * h / w) if w >= h else side
    cw = side if w >= h else round(side * w / h)
    y0 = round((side - ch) * crop_y); x0 = (side - cw) // 2
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", path,
           "-vf", f"crop={cw}:{ch}:{x0}:{y0},scale={w}:{h}:flags=lanczos,fps={fps}",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    n = len(raw) // (w * h * 3)
    return [Image.frombuffer("RGB", (w, h), raw[i * w * h * 3:(i + 1) * w * h * 3]).copy() for i in range(n)]


def clip_audio(path, start, dur):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", path,
           "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    a = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16)
    return a.astype(np.float32) / 32768


def write_gif(frames, path, fps):
    d = f"{TMP}/gif_{os.path.basename(path)}"
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        os.remove(f"{d}/{f}")
    for i, f in enumerate(frames):
        f.save(f"{d}/{i:04d}.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", f"{d}/%04d.png",
                    "-vf", "split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];"
                           "[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
                    "-loop", "0", path], check=True)
    print(f"{path}: {os.path.getsize(path) // 1024} KB")


# ---------- GIFs ----------

K1, K3 = f"{VID}/melakhim1-1.mp4", f"{VID}/melakhim1-3.mp4"
GW, GH, GFPS = 480, 360, 8


def court_gif():
    frames = []
    for start, dur in [(140, 1.5), (150, 1.5), (52, 2.0), (187, 1.5)]:
        frames += [label(shade(f, bottom=0.5), "Solomon's court", "NOW SHOWING · 1 KINGS 3", 28)
                   for f in clip_frames(K3, start, dur, GW, GH, GFPS)]
    write_gif(frames, f"{OUT}/court.gif", GFPS)


def voices_gif():
    s = 360
    frames = []
    for start in [45, 125, 265, 385, 410, 485]:
        frames += [label(shade(f, bottom=0.55), "Every line, lip-synced", "1 KINGS 1 · 11 CHARACTERS", 24)
                   for f in clip_frames(K1, start, 1.0, s, s, GFPS, 0.3)]
    write_gif(frames, f"{OUT}/voices.gif", GFPS)


def cards():
    """Static 2x stills for sections without a GIF."""
    for src in ["epic-solomon.jpg", "epic-search.jpg", "epic-reader.jpg", "epic-studio.jpg"]:
        cover(still(src), 1088, 725).save(f"{OUT}/card-{src[5:]}", quality=80, optimize=True)


LOOPS = {
    "mishnah.gif": ("epic-mishnah.jpg", (0.5, 0.45), "The Mega Mishnah", "EVERY SAGE IN HIS OWN COLOUR"),
    "goats.gif": ("epic-goats.jpg", (0.55, 0.5), "Under the Rod", "DAF YOMI · BEKHOROT 18–21"),
    "gibeon.gif": ("epic-gibeon.jpg", (0.4, 0.5), "On Wisdom", "A SOURCE SHEET THAT GROWS"),
}


def loop_gifs():
    n, lw, lh = 24, 480, 320
    for name, (src, pan, big, small) in LOOPS.items():
        im = still(src)
        frames = []
        for i in range(n):
            u = i / n
            z = 1.08 + 0.05 * math.sin(2 * math.pi * u)
            p = (pan[0] + 0.02 * math.sin(2 * math.pi * u), pan[1])
            frames.append(label(shade(glint(cover(im, lw, lh, z, p), u)), big, small, 28))
        write_gif(frames, f"{OUT}/{name}", GFPS)


# ---------- trailer ----------

W, H, FPS = 1280, 720, 24


def ken_burns(src, dur, big, small, pan=(0.5, 0.5), zoom=(1.04, 1.14), align="left", size=64):
    im = still(src)
    n = round(dur * FPS)
    out = []
    for i in range(n):
        u = i / max(1, n - 1)
        z = zoom[0] + (zoom[1] - zoom[0]) * u
        f = shade(cover(im, W, H, z, pan), top=0.0, bottom=0.6)
        out.append(label(f, big, small, size, align) if big else f)
    return out


def film(path, start, dur, big, small, crop_y=0.42):
    frames = [label(shade(f, bottom=0.5), big, small, 52) for f in clip_frames(path, start, dur, W, H, FPS, crop_y)]
    return frames, clip_audio(path, start, dur)


def fade(frames, k_in=8, k_out=8):
    n = len(frames)
    for i in range(n):
        a = min(1, (i + 1) / k_in, (n - i) / k_out)
        if a < 1:
            frames[i] = Image.blend(Image.new("RGB", frames[i].size), frames[i], a)
    return frames


def pad_score(n_samples):
    """A low gold drone: open fifths on D with a slow swell, so the stills aren't silent."""
    t = np.arange(n_samples) / SR
    tone = sum(a * np.sin(2 * math.pi * f * t + p) for f, a, p in
               [(73.42, 0.5, 0), (110.0, 0.35, 1), (146.83, 0.25, 2), (220.0, 0.12, 0.5), (293.66, 0.06, 1.3)])
    swell = 0.6 + 0.4 * np.sin(2 * math.pi * t / 9.0) ** 2
    return (tone * swell * 0.16).astype(np.float32)


def trailer():
    shots = []  # (frames, audio or None)
    shots.append((ken_burns("epic-studio.jpg", 3.5, "The Workshop", "WEEK OF 12 OCTOBER 2026", (0.5, 0.45), align="center", size=84), None))
    shots.append((ken_burns("epic-solomon.jpg", 3.0, "This week, the Bible learned to talk", "THE MEGA BIBLE", (0.6, 0.4)), None))
    shots.append(film(K3, 52, 4.5, "Solomon speaks", "1 KINGS 3 · LIP-SYNCED FILM"))
    shots.append(film(K3, 150, 3.5, "Two mothers, one living child", "1 KINGS 3"))
    shots.append(film(K1, 125, 3.0, "Eleven characters", "1 KINGS 1 · EVERY LINE TO CAMERA", 0.3))
    shots.append((ken_burns("epic-search.jpg", 3.0, "Search all of Tanakh", "HEBREW OR ENGLISH"), None))
    shots.append((ken_burns("epic-mishnah.jpg", 3.0, "The Mega Mishnah", "63 TRACTATES · EVERY SAGE IN HIS OWN COLOUR"), None))
    shots.append((ken_burns("epic-gibeon.jpg", 3.0, "On Wisdom", "A SOURCE SHEET THAT GROWS", (0.35, 0.5)), None))
    shots.append((ken_burns("epic-goats.jpg", 3.0, "Four new daf games", "BEKHOROT 18–21"), None))
    shots.append((ken_burns("epic-reader.jpg", 3.0, "A Daily Reader, made by Muse AI", "EVERY MORNING ON MY KINDLE"), None))
    shots.append((ken_burns("epic-studio.jpg", 3.5, "theothermatthewmiller.com", "THE WORKSHOP", (0.5, 0.45), (1.14, 1.04), "center", 60), None))

    frames, voice_at = [], []
    for fr, au in shots:
        if au is not None:
            voice_at.append((len(frames) / FPS, au))
        frames += fade(fr)
    total = len(frames) / FPS
    n = int(total * SR) + SR
    mix = pad_score(n)
    for t0, au in voice_at:
        au = au * (0.13 / max(1e-4, float(np.sqrt((au ** 2).mean()))))  # the films vary a lot in level
        i = int(t0 * SR)
        mix[i:i + len(au)] *= 0.4  # duck the drone under the voices
        env = np.minimum(1, np.minimum(np.arange(len(au)) / (0.15 * SR), (len(au) - np.arange(len(au))) / (0.15 * SR)))
        mix[i:i + len(au)] += au[: n - i] * env[: n - i] * 1.1
    fade_out = np.minimum(1, (n - np.arange(n)) / (1.5 * SR))
    mix = np.tanh(mix * fade_out)  # soft limiter: the boosted voices never hard-clip
    wav = f"{TMP}/trailer_mix.raw"
    (mix * 32767).astype(np.int16).tofile(wav)

    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", wav,
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "medium",
                            "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart",
                            f"{OUT}/trailer.mp4"], stdin=subprocess.PIPE)
    for f in frames:
        enc.stdin.write(f.tobytes())
    enc.stdin.close(); enc.wait()
    print(f"{OUT}/trailer.mp4: {total:.1f}s, {os.path.getsize(f'{OUT}/trailer.mp4') // 1024} KB")

    poster = label(shade(cover(still("epic-solomon.jpg"), W, H, 1.05, (0.6, 0.4)), bottom=0.65),
                   "Solomon learns to talk", "THE WORKSHOP · WEEK OF 12 OCTOBER", 64)
    d = ImageDraw.Draw(poster)
    cx, cy, r = W // 2, H // 2 - 40, 58
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(0, 0, 0), outline=GOLD, width=4)
    d.polygon([(cx - 18, cy - 28), (cx - 18, cy + 28), (cx + 30, cy)], fill=GOLD)
    poster.save(f"{OUT}/trailer-poster.jpg", quality=88)


# ---------- social kit ----------

SANS = lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s)
LINK = "theothermatthewmiller.com/newsletter"


def centred(d, y, text, font, fill, w, shadow=True, spacing=0):
    if spacing:
        text = (" " * spacing).join(text)
    x = (w - d.textlength(text, font=font)) / 2
    if shadow:
        d.text((x + 3, y + 3), text, font=font, fill=(0, 0, 0))
    d.text((x, y), text, font=font, fill=fill)


def pill(d, y, text, font, w, pad=34):
    tw = d.textlength(text, font=font)
    h = font.size + 44
    x0 = (w - tw) / 2 - pad
    d.rounded_rectangle((x0, y, x0 + tw + 2 * pad, y + h), radius=h // 2, fill=(222, 184, 110))
    d.text(((w - tw) / 2, y + 20), text, font=font, fill=(29, 26, 21))


def status_card(w=1080, h=1920):
    """Vertical WhatsApp Status still: Solomon's court, this week's three headlines, the signup link."""
    im = shade(cover(still("epic-solomon.jpg"), w, h, 1.0, (0.92, 0.5)), top=0.5, bottom=0.85)
    d = ImageDraw.Draw(im)
    centred(d, 90, "● THE WORKSHOP · THIS WEEK", SANS(34), GOLD, w)
    centred(d, 1060, "Solomon", TITLE(150), WHITE, w)
    centred(d, 1225, "learns to talk", TITLE(96), WHITE, w)
    for i, line in enumerate(["Lip-synced Bible films", "The Mega Mishnah", "Four new daf games"]):
        centred(d, 1400 + i * 70, line, TITLE(54), GOLD, w)
    pill(d, 1650, LINK, SANS(40), w)
    centred(d, 1790, "Sign up → this week's issue lands within the hour", SANS(32), WHITE, w)
    im.save(f"{OUT}/whatsapp-status.jpg", quality=88)


def linkedin_card(w=1200, h=627):
    im = shade(cover(still("epic-solomon.jpg"), w, h, 1.0, (0.5, 0.3)), top=0.0, bottom=0.9)
    d = ImageDraw.Draw(im)
    centred(d, 395, "Solomon learns to talk", TITLE(76), WHITE, w)
    centred(d, 495, "THE WORKSHOP · WEEK OF 12 OCTOBER 2026", TITLE(28), GOLD, w)
    centred(d, 550, LINK, TITLE(32), WHITE, w)
    im.save(f"{OUT}/linkedin.jpg", quality=88)


def status_video(w=1080, h=1920):
    """~20s vertical: square film clips framed by a title above and the signup link below."""
    side = 1080
    top = (h - side) // 2

    def frame(sq, kicker, title):
        im = Image.new("RGB", (w, h), (12, 10, 8))
        im.paste(sq, (0, top))
        d = ImageDraw.Draw(im)
        centred(d, 150, "● THE WORKSHOP · THIS WEEK", SANS(34), GOLD, w, False)
        centred(d, 250, kicker, TITLE(40), GOLD, w, False)
        centred(d, 310, title, TITLE(76), WHITE, w, False)
        pill(d, top + side + 120, LINK, SANS(42), w)
        centred(d, top + side + 250, "Sign up · this week's issue lands within the hour", SANS(30), WHITE, w, False)
        return im

    shots = [(K3, 52, 5.0, 0.42, "1 KINGS 3 · LIP-SYNCED", "Solomon speaks"),
             (K3, 150, 3.5, 0.42, "1 KINGS 3", "Two mothers, one child"),
             (K1, 125, 3.5, 0.3, "1 KINGS 1 · 11 CHARACTERS", "Every line, lip-synced")]
    frames, voices = [], []
    for path, start, dur, cy, kicker, title in shots:
        voices.append((len(frames) / FPS, clip_audio(path, start, dur)))
        frames += fade([frame(f, kicker, title) for f in clip_frames(path, start, dur, side, side, FPS, cy)])
    for src, kicker, title in [("epic-mishnah.jpg", "ALSO NEW", "The Mega Mishnah"),
                               ("epic-goats.jpg", "DAF YOMI", "Four new games")]:
        im = still(src)
        n = round(2.5 * FPS)
        frames += fade([frame(cover(im, side, side, 1.04 + 0.08 * i / n), kicker, title) for i in range(n)])
    end = shade(cover(still("epic-studio.jpg"), side, side, 1.1), bottom=0.3)
    frames += fade([frame(end, "EVERYTHING I BUILD, ONE EMAIL A WEEK", "The Workshop")] * round(3 * FPS), k_out=1)

    n = int(len(frames) / FPS * SR) + SR
    mix = pad_score(n)
    for t0, au in voices:
        au = au * (0.13 / max(1e-4, float(np.sqrt((au ** 2).mean()))))
        i = int(t0 * SR)
        mix[i:i + len(au)] *= 0.4
        env = np.minimum(1, np.minimum(np.arange(len(au)) / (0.15 * SR), (len(au) - np.arange(len(au))) / (0.15 * SR)))
        mix[i:i + len(au)] += au * env * 1.1
    mix = np.tanh(mix * np.minimum(1, (n - np.arange(n)) / (1.5 * SR)))
    raw = f"{TMP}/status_mix.raw"
    (mix * 32767).astype(np.int16).tofile(raw)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
                            "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", raw,
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "medium",
                            "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart",
                            f"{OUT}/whatsapp-status.mp4"], stdin=subprocess.PIPE)
    for f in frames:
        enc.stdin.write(f.tobytes())
    enc.stdin.close(); enc.wait()
    print(f"{OUT}/whatsapp-status.mp4: {len(frames) / FPS:.1f}s, {os.path.getsize(f'{OUT}/whatsapp-status.mp4') // 1024} KB")


if __name__ == "__main__":
    import sys
    if "--social" in sys.argv:
        status_card(); linkedin_card(); status_video()
        sys.exit()
    cards()
    court_gif()
    voices_gif()
    loop_gifs()
    trailer()
