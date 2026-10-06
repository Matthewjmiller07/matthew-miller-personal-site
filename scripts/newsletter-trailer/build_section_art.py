"""Section art for the week-of-5-October-2026 Workshop email.

Run from the repo root after build_week_trailer.py:
  python3 scripts/newsletter-trailer/build_section_art.py

Writes into public/newsletter/2026-10-05/:
  siddur.gif, micrography.gif, books.gif   seamless 3s loops, 544px wide
  card-*.jpg                               titled 16:9 cards for the quick hits
"""
import math, os, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from build_week_trailer import W, H, GOLD, OUT, TMP, N, P, img, cover, grade, title  # noqa: E402

GW = 544  # email column width
LOOP, FPS = 3.0, 10


def glint(im, u):
    """A soft diagonal light sweep across the frame, once per loop."""
    a = np.asarray(im).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    pos = (u * 1.6 - 0.3) * (W + H)
    band = np.exp(-(((xx + yy * 0.6) - pos) / 90.0) ** 2)[..., None]
    a = a + band * 38
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def push(path, u, pan=(0.5, 0.5), dark=0.25):
    z = 1.08 + 0.05 * math.sin(2 * math.pi * u)  # breathes in and out, so the loop is seamless
    p = (pan[0] + 0.02 * math.sin(2 * math.pi * u), pan[1])
    return grade(cover(img(path), z, p), dark)


def blend_loop(a_path, b_path, u, pan_a=(0.5, 0.5), pan_b=(0.5, 0.5)):
    """A for the first half, B for the second, crossfading at 0.4-0.5 and back at 0.9-1.0."""
    k = min(1, max(0, (u - 0.4) / 0.1)) if u < 0.9 else 1 - min(1, (u - 0.9) / 0.1)
    a = push(a_path, u, pan_a)
    if k <= 0:
        return a
    b = push(b_path, u, pan_b, dark=0.35)
    return Image.blend(a, b, k)


SECTIONS = {
    "siddur.gif": (lambda u: push(N("epic-siddur.jpg"), u, (0.5, 0.55), 0.15), "MEGA SIDDUR", "KNOWS WHAT TIME IT IS"),
    "micrography.gif": (lambda u: push(N("epic-laser.jpg"), u, (0.5, 0.45), 0.2), "MICROGRAPHY", "YOUR FACE IN 10,000 LETTERS"),
    "books.gif": (lambda u: blend_loop(N("epic-book.jpg"), P("parasha-books/noach/page-03.jpg"), u),
                  "PARASHA BOOKS", "YOUR KIDS. INSIDE THE STORY."),
}


def frame(bg, head, sub, u):
    im = glint(bg(u), u)
    im = title(im, head, 92, 250, 1.0, track=18)
    im = title(im, sub, 34, 380, 1.0, GOLD, track=10)
    return im


def gif(name, bg, head, sub):
    d = os.path.join(TMP, name + "-frames")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    n = int(LOOP * FPS)
    for i in range(n):
        im = frame(bg, head, sub, i / n).crop((0, 40, W, H - 40))
        im.resize((GW, int(GW * im.size[1] / W)), Image.LANCZOS).save(f"{d}/{i:04d}.png")
    vf = "split[a][b];[a]palettegen=max_colors=112:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{d}/%04d.png",
                    "-filter_complex", vf, "-loop", "0", f"{OUT}/{name}"], check=True)


CARDS = {
    "card-shiur.jpg": (N("epic-shiur.jpg"), "RAV ASHER WEISS"),
    "card-blessing.jpg": (N("epic-blessing.jpg"), "THE LANGUAGE OF BLESSING"),
    "card-israel.jpg": (N("epic-israel.jpg"), "ISRAEL IN NUMBERS"),
    "card-bible.jpg": (N("epic-bible.jpg"), "BOOKS & PAPERS"),
    "card-ark.jpg": (N("epic-ark.jpg"), "NOACH"),
    "card-sources.jpg": (N("epic-sources.jpg"), "SOURCE SHEETS IN SECONDS"),
    "card-quill.jpg": (N("epic-quill.jpg"), "THE BRONZE QUILL"),
    "card-workshop.jpg": (N("trailer-poster.jpg"), ""),  # already titled
    "card-workwithme.jpg": (N("epic-workwithme.jpg"), "WORK WITH ME"),
}


def card(name, path, head):
    im = grade(cover(img(path), 1.05), 0.1)
    d = ImageDraw.Draw(im, "RGBA")
    for y in range(H // 2, H):  # bottom gradient so the title always reads
        d.line([(0, y), (W, y)], fill=(0, 0, 0, int(200 * ((y - H / 2) / (H / 2)) ** 1.4)))
    if head:
        im = title(im, head, 64, H - 150, 1.0, track=12)
    im.resize((GW, int(GW * H / W)), Image.LANCZOS).save(f"{OUT}/{name}", quality=80, optimize=True, progressive=True)


if __name__ == "__main__":
    for name, (bg, head, sub) in SECTIONS.items():
        gif(name, bg, head, sub)
    for name, (path, head) in CARDS.items():
        card(name, path, head)
    for f in list(SECTIONS) + list(CARDS):
        print(f, os.path.getsize(f"{OUT}/{f}") // 1024, "KB")
