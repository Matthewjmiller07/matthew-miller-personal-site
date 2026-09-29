#!/usr/bin/env python3
"""Cuts a Parasha Book trailer: Ken Burns shots + captions + title card, intense voiceover,
and the AI backtrack sidechain-ducked under the voice.

Inputs  public/parasha-books/<slug>/{cover.jpg,page-NN.jpg,voice.mp3,music.mp3}
Output  public/parasha-books/<slug>/trailer.mp4 (1920x1080, 30fps) + trailer-poster.jpg

Usage: python3 scripts/parasha-books/make-trailer.py [slug ...]
Needs Pillow and an ffmpeg binary (PATH, $FFMPEG, or `pip install imageio-ffmpeg`).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS = os.path.join(ROOT, 'public', 'parasha-books', 'fonts')
HEB_FONT = os.path.join(ROOT, 'public', 'fonts', 'NotoSerifHebrew-Bold.ttf')
W, H, FPS = 1920, 1080, 30
LEAD_IN = 1.2  # seconds of music before the narrator starts
TAIL = 3.5  # title card hold after the last word


def ffmpeg_bin():
    if os.environ.get('FFMPEG'):
        return os.environ['FFMPEG']
    if shutil.which('ffmpeg'):
        return 'ffmpeg'
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg_bin()


def ff(*args):
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def duration(path):
    out = subprocess.run([FF, '-hide_banner', '-i', path], capture_output=True, text=True).stderr
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def line_starts(voice, n_lines):
    """Start time of each spoken line: the n-1 longest silences are the line breaks."""
    out = subprocess.run(
        [FF, '-hide_banner', '-i', voice, '-af', 'silencedetect=noise=-38dB:d=0.35', '-f', 'null', '-'],
        capture_output=True,
        text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    gaps = [(e - s, s, e) for s, e in zip(starts, ends) if s > 0.2]
    breaks = sorted(sorted(gaps, reverse=True)[: n_lines - 1], key=lambda g: g[1])
    return [0.0] + [e - 0.15 for _, _, e in breaks]


def load_books():
    code = "import('./src/data/parasha-books/books.mjs').then(m => console.log(JSON.stringify(m.books)))"
    out = subprocess.run(['node', '-e', code], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def load_cast():
    code = "import('./src/data/parasha-books/cast.mjs').then(m => console.log(JSON.stringify(m.defaultCast)))"
    out = subprocess.run(['node', '-e', code], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + [cur]


def caption_png(text, path):
    """Transparent lower-third caption: big condensed caps with a soft shadow."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fnt = font('BigShoulders-Bold.ttf', 74)
    lines = wrap(d, text.upper(), fnt, W - 360)
    y = H - 110 - len(lines) * 84
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for i, ln in enumerate(lines):
        x = (W - d.textlength(ln, font=fnt)) / 2
        sd.text((x, y + i * 84 + 4), ln, font=fnt, fill=(0, 0, 0, 230))
        d.text((x, y + i * 84), ln, font=fnt, fill=(255, 246, 225, 255))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    band = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    top = y - 70
    for yy in range(top, H):  # soft dark gradient behind the words
        bd.line([(0, yy), (W, yy)], fill=(10, 6, 2, int(150 * min(1, (yy - top) / 90))))
    Image.alpha_composite(Image.alpha_composite(band, shadow), img).save(path)


def title_card(book, cast, cover, path):
    bg = Image.open(cover).convert('RGB').resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    dark = Image.new('RGB', (W, H), (8, 6, 4))
    img = Image.blend(bg, dark, 0.62).convert('RGBA')
    d = ImageDraw.Draw(img)
    gold = (242, 200, 120, 255)
    small = font('CrimsonPro-Italic.ttf', 46)
    big = font('BigShoulders-Bold.ttf', 190)
    heb = ImageFont.truetype(HEB_FONT, 120)

    def center(text, fnt, y, fill, **kw):
        x = (W - d.textlength(text, font=fnt, **kw)) / 2
        d.text((x, y), text, font=fnt, fill=fill, **kw)

    center('A Parasha Book', small, 180, (255, 240, 215, 255))
    center(book['hebrew'], heb, 250, gold, direction='rtl', language='he')
    center(('Parashat ' + book['parasha']).upper(), big, 420, (255, 250, 238, 255))
    center(book['title'], font('CrimsonPro-Regular.ttf', 58), 650, (255, 240, 215, 255))
    names = ' · '.join(c['name'] for c in (cast.get('big'), cast.get('mid'), cast.get('baby')) if c)
    center('starring ' + names, small, 780, gold)
    center('This Shabbat', font('BigShoulders-Bold.ttf', 60), 900, (255, 250, 238, 255))
    img.convert('RGB').save(path, quality=94)


def shot(src, dur, out, caption=None, zoom_in=True, still=False):
    """One Ken Burns clip with dip-to-black edges and an optional caption overlay."""
    frames = max(2, int(round(dur * FPS)))
    if still:
        z = "'1.0+0.04*on/{0}'".format(frames)
    elif zoom_in:
        z = "'1.0+0.14*on/{0}'".format(frames)
    else:
        z = "'1.14-0.14*on/{0}'".format(frames)
    pan_x = "'iw/2-(iw/zoom/2)+{0}*on/{1}'".format(60 if zoom_in else -60, frames)
    vf = (
        f"scale=3840:-2,crop=3840:2160,zoompan=z={z}:x={pan_x}:y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    )
    fade = f"fade=t=in:st=0:d=0.25,fade=t=out:st={max(0, dur - 0.25):.3f}:d=0.25"
    args = ['-loop', '1', '-t', f'{dur:.3f}', '-i', src]
    if caption:
        args += ['-loop', '1', '-t', f'{dur:.3f}', '-i', caption]
        fc = f"[0:v]{vf},setsar=1[bg];[bg][1:v]overlay=0:0,{fade},format=yuv420p[v]"
    else:
        fc = f"[0:v]{vf},setsar=1,{fade},format=yuv420p[v]"
    ff(*args, '-filter_complex', fc, '-map', '[v]', '-frames:v', str(frames), '-r', str(FPS),
       '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', out)


def build(book, cast):
    d = os.path.join(ROOT, 'public', 'parasha-books', book['slug'])
    voice, music = os.path.join(d, 'voice.mp3'), os.path.join(d, 'music.mp3')
    for f in (voice, music, os.path.join(d, 'cover.jpg')):
        if not os.path.exists(f):
            print(f"skip {book['slug']}: missing {os.path.basename(f)}")
            return
    page = lambda i: os.path.join(d, 'cover.jpg' if i == 0 else f'page-{i:02d}.jpg')
    tmp = tempfile.mkdtemp(prefix='trailer-')
    vdur = duration(voice)
    starts = line_starts(voice, len(book['trailer']))
    total = LEAD_IN + vdur + TAIL
    bounds = [0.0] + [LEAD_IN + s for s in starts[1:]] + [total]
    title = os.path.join(tmp, 'title.jpg')
    title_card(book, cast, page(0), title)

    clips = []
    for li, (line, shots) in enumerate(zip(book['trailer'], book['trailerShots'])):
        a, b = bounds[li], bounds[li + 1]
        if li == len(book['trailer']) - 1 and 'title' in shots:
            # Last line: its images get the spoken part, the title card holds through the tail.
            imgs = [s for s in shots if s != 'title']
            speak_end = LEAD_IN + vdur + 0.3
            seg = [(a, speak_end, imgs)] if imgs else []
            seg.append((speak_end if imgs else a, b, ['title']))
        else:
            seg = [(a, b, shots)]
        for sa, sb, imgs in seg:
            each = (sb - sa) / len(imgs)
            for k, s in enumerate(imgs):
                out = os.path.join(tmp, f'clip{len(clips):02d}.mp4')
                if s == 'title':
                    shot(title, each, out, still=True)
                else:
                    cap = None
                    if k == 0 and imgs != ['title']:
                        cap = os.path.join(tmp, f'cap{li}.png')
                        caption_png(line, cap)
                    shot(page(s), each, out, caption=cap, zoom_in=(len(clips) % 2 == 0))
                clips.append(out)

    lst = os.path.join(tmp, 'list.txt')
    with open(lst, 'w') as fh:
        fh.writelines(f"file '{c}'\n" for c in clips)
    video = os.path.join(tmp, 'video.mp4')
    ff('-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', video)

    # Audio: music bed (fade in/out) ducked by the voice via sidechain compression,
    # a sub-bass hit under the title card, then loudness-normalised.
    hit_at = int((LEAD_IN + vdur + 0.3) * 1000)
    fc = (
        f"[1:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:{total:.2f},"
        f"afade=t=in:d=1.2,afade=t=out:st={total - 3:.2f}:d=3,"
        # Bed dip: glide down ~7 dB as the narrator comes in, swell back up for the title card…
        f"volume='0.9*(1-0.55*clip((t-{LEAD_IN - 0.4:.2f})/0.6,0,1)*clip(({LEAD_IN + vdur + 0.2:.2f}-t)/1.2,0,1))':eval=frame[bed];"
        f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={int(LEAD_IN * 1000)}|{int(LEAD_IN * 1000)},"
        f"apad=whole_dur={total:.2f},volume=1.6,asplit=2[vo][sc];"
        # …and the sidechain pulls it down further under every word.
        f"[bed][sc]sidechaincompress=threshold=0.006:ratio=20:attack=10:release=350:makeup=1[ducked];"
        f"aevalsrc='0.9*exp(-2.2*t)*sin(2*PI*(58-22*t)*t)':s=44100:d=2.5,aformat=channel_layouts=stereo,"
        f"adelay={hit_at}|{hit_at}[hit];"
        f"[ducked][vo][hit]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-15:TP=-1.5:LRA=9[a]"
    )
    out = os.path.join(d, 'trailer.mp4')
    ff('-i', voice, '-i', music, '-i', video, '-filter_complex', fc,
       '-map', '2:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
       '-movflags', '+faststart', '-shortest', out)
    Image.open(title).resize((1280, 720), Image.LANCZOS).save(os.path.join(d, 'trailer-poster.jpg'), quality=86)
    # Timings for the in-browser trailer player (custom casts reuse this voice + music).
    with open(os.path.join(d, 'trailer.json'), 'w') as fh:
        json.dump({'leadIn': LEAD_IN, 'voice': round(vdur, 3), 'total': round(total, 3),
                   'bounds': [round(b, 3) for b in bounds], 'lines': book['trailer'],
                   'shots': book['trailerShots']}, fh, indent=1)
    shutil.rmtree(tmp)
    print(f"✓ {book['slug']}: {total:.1f}s → {os.path.relpath(out, ROOT)}")


if __name__ == '__main__':
    wanted = set(sys.argv[1:])
    cast = load_cast()
    for b in load_books():
        if not wanted or b['slug'] in wanted:
            build(b, cast)
