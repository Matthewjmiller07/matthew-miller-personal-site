#!/usr/bin/env python3
"""Turn the PNG frames from render_gif.cjs into a small looping GIF for email.

  python3 scripts/warmhouse/frames_to_gif.py <frames-dir> <out.gif> [width]

One palette is built from all the frames together so colours don't flicker between frames.
"""
import glob, os, sys
from PIL import Image


def main(src, out, width=480):
    width = int(width)
    frames = []
    for f in sorted(glob.glob(os.path.join(src, "*.png"))):
        im = Image.open(f).convert("RGB")
        h = round(im.height * width / im.width)
        frames.append(im.resize((width, h), Image.LANCZOS))
    if not frames:
        sys.exit(f"No frames in {src}")
    # Shared palette from a strip of every frame.
    strip = Image.new("RGB", (width, frames[0].height * len(frames)))
    for k, im in enumerate(frames):
        strip.paste(im, (0, k * im.height))
    pal = strip.quantize(colors=96, method=Image.MEDIANCUT)
    q = [im.quantize(palette=pal, dither=Image.NONE) for im in frames]  # flat shading needs no dither; it compresses far better
    q[0].save(out, save_all=True, append_images=q[1:], duration=90, loop=0, optimize=True, disposal=1)
    print(out, f"{os.path.getsize(out) / 1024:.0f} KB", frames[0].size, len(frames), "frames")


if __name__ == "__main__":
    main(*sys.argv[1:4])
