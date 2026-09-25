# Builds public/videos/kohelet-trailer.mp4 from the reader's generated images.
# Usage: python3 scripts/kohelet/make-trailer.py <font-dir>
#   font-dir must contain Oswald.ttf and FrankRuhl.ttf (Google Fonts variable TTFs).
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

FONTS = sys.argv[1]
IMG = 'public/images/kohelet'
OUT = 'public/videos/kohelet-trailer.mp4'
W, H, DUR, FADE = 1280, 720, 3.6, 0.6
WHITE, GOLD = (243, 239, 230), (245, 198, 60)

def oswald(size):
    f = ImageFont.truetype(f'{FONTS}/Oswald.ttf', size)
    try: f.set_variation_by_axes([700])
    except Exception: pass
    return f

# (image or None for black, side, [lines of [(text, color)]], size)
G, Wt = GOLD, WHITE
SHOTS = [
    (None, 'c', [[('LADIES AND GENTLEMEN,', Wt)]], 70),
    ('hero', 'r', [[('YOU', Wt)], [('WILL', Wt)], [('DIE.', G)]], 120),
    ('ch-1', 'l', [[('THE SUN RISES.', Wt)], [('THE SUN SETS.', Wt)], [('THE SEA IS ', Wt), ('NEVER FULL.', G)]], 76),
    ('essay-2', 'r', [[('EVERYTHING', Wt)], [('IS ', Wt), ('HEVEL.', G)]], 110),
    ('ch-2', 'l', [[('HOUSES. VINEYARDS.', Wt)], [('SILVER. GOLD.', Wt)], [('ALL OF IT: ', Wt), ('BREATH.', G)]], 76),
    ('trailer-a', 'r', [[('THE BIBLE’S', Wt)], [('MOST ', G), ('DANGEROUS', G)], [('BOOK?', Wt)]], 96),
    ('essay-3', 'r', [[('EAT YOUR BREAD', Wt)], [('WITH ', Wt), ('JOY.', G)]], 96),
    ('essay-4', 'r', [[('WHERE', Wt)], [('IS ', Wt), ('GOD?', G)]], 120),
    ('ch-12', 'l', [[('BEFORE THE', Wt)], [('SILVER CORD', G)], [('IS SNAPPED.', Wt)]], 92),
    ('essay-6', 'r', [[('2,300 YEARS', G)], [('OF ARGUMENT.', Wt)]], 100),
    ('trailer-b', 'r', [[('12 CHAPTERS.', Wt)], [('222 VERSES.', Wt)], [('6 LECTURES.', G)]], 92),
    (None, 'end', [], 0),
]

def cover(path):
    im = Image.open(path).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))

def shade(im, side):
    ov = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(ov)
    for x in range(W):
        t = x / W if side == 'r' else 1 - x / W
        d.line([(x, 0), (x, H)], fill=int(235 * max(0, (t - 0.35) / 0.65) ** 1.3))
    black = Image.new('RGB', (W, H), (7, 7, 7))
    return Image.composite(black, im, ov)

def draw_lines(im, side, lines, size):
    d = ImageDraw.Draw(im)
    f = oswald(size)
    lh = int(size * 1.05)
    top = (H - lh * len(lines)) // 2
    for i, segs in enumerate(lines):
        width = sum(d.textlength(t, font=f) for t, _ in segs)
        x = {'r': W - 90 - width, 'l': 90, 'c': (W - width) / 2}[side]
        for t, col in segs:
            d.text((x, top + i * lh), t, font=f, fill=col)
            x += d.textlength(t, font=f)

def end_card():
    im = Image.new('RGB', (W, H), (7, 7, 7))
    d = ImageDraw.Draw(im)
    heb = ImageFont.truetype(f'{FONTS}/FrankRuhl.ttf', 150)
    from PIL import features
    t = 'קהלת' if features.check('raqm') else 'קהלת'[::-1]  # without raqm PIL can't do RTL
    d.text(((W - d.textlength(t, font=heb)) / 2, 150), t, font=heb, fill=GOLD)
    f1, f2 = oswald(84), oswald(34)
    for txt, f, y, col in [('KOHELET', f1, 360, WHITE), ('A READER FOR ECCLESIASTES', f2, 470, (163, 157, 144)),
                           ('THEOTHERMATTHEWMILLER.COM/KOHELET', f2, 540, GOLD)]:
        d.text(((W - d.textlength(txt, font=f)) / 2, y), txt, font=f, fill=col)
    return im

tmp = tempfile.mkdtemp()
frames = []
for i, (img, side, lines, size) in enumerate(SHOTS):
    if side == 'end':
        im = end_card()
    else:
        im = shade(cover(f'{IMG}/{img}.jpg'), side) if img else Image.new('RGB', (W, H), (7, 7, 7))
        draw_lines(im, side, lines, size)
    p = f'{tmp}/s{i:02d}.png'
    im.save(p)
    frames.append(p)

# Slow push-in on each card, crossfaded; brown-noise "breath" bed with a low drone underneath.
n = len(frames)
fps = 30
inputs, chains = [], []
for i, p in enumerate(frames):
    inputs += ['-loop', '1', '-t', str(DUR), '-i', p]
    zoom = "zoompan=z='1+0.045*on/({0})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={0}:s={1}x{2}:fps={3}".format(int(DUR * fps), W, H, fps)
    chains.append(f'[{i}:v]scale={W*2}:{H*2},{zoom},setsar=1,format=yuv420p[v{i}]')
prev, off = 'v0', 0.0
for i in range(1, n):
    off += DUR - FADE
    out = f'x{i}'
    chains.append(f'[{prev}][v{i}]xfade=transition=fade:duration={FADE}:offset={off:.2f}[{out}]')
    prev = out
total = DUR * n - FADE * (n - 1)
chains.append(f'[{prev}]fade=t=in:st=0:d=0.8,fade=t=out:st={total-1.2:.2f}:d=1.2[vout]')
audio = (f"anoisesrc=color=brown:amplitude=0.5:d={total:.2f},lowpass=f=420,tremolo=f=0.18:d=0.7,volume=0.55[n];"
         f"sine=f=55:d={total:.2f},volume=0.08[s];[n][s]amix=inputs=2,afade=t=in:d=2,afade=t=out:st={total-2.5:.2f}:d=2.5[aout]")
os.makedirs('public/videos', exist_ok=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(chains) + ';' + audio,
                '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-t', f'{total:.2f}', OUT], check=True)
print(OUT, f'{total:.1f}s')
