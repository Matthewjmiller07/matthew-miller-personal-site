"""Synthesize the trailer score from out/scenes.json: a D-minor drone, war-drum hits on every
cut, a string ostinato that drives through the genealogies, a riser into "the names came back",
then a brighter D-major pulse to the title. Writes out/music.wav."""
import json, os, wave
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
info = json.load(open(os.path.join(here, 'out/scenes.json')))
S = info['S']; T = info['T'] + 1.5
sr = 44100; n = int(T * sr); t = np.arange(n) / sr
out = np.zeros((n, 2))
rng = np.random.default_rng(11)
f = lambda m: 440 * 2 ** ((m - 69) / 12)
start = [s['start'] for s in S]

def add(sig, at, pan=.5, g=1.0):
    i = int(at * sr)
    if i >= n: return
    j = min(n, i + len(sig)); sig = sig[:j - i] * g
    out[i:j, 0] += sig * (1 - pan); out[i:j, 1] += sig * pan

def lp(x, k):  # cheap low-pass
    return np.convolve(x, np.ones(k) / k, 'same')

def taiko(g=1.0, L=2.2, base=46):
    x = np.arange(int(L * sr)) / sr
    fr = base + 70 * np.exp(-x * 22); ph = 2 * np.pi * np.cumsum(fr) / sr
    body = np.sin(ph) * np.exp(-x * 3.2)
    skin = lp(rng.standard_normal(len(x)), 8) * np.exp(-x * 28) * .5
    return (body + skin) * g

def boom(L=5.0):
    x = np.arange(int(L * sr)) / sr
    fr = 32 + 45 * np.exp(-x * 6); ph = 2 * np.pi * np.cumsum(fr) / sr
    nz = lp(rng.standard_normal(len(x)), 50) * np.exp(-x * 2.5)
    return (np.sin(ph) * 1.1 + nz * .8) * np.exp(-x * .9)

def string(m, L, bright=1.0):
    x = np.arange(int(L * sr)) / sr; s = np.zeros_like(x)
    for h in range(1, 9):
        s += (1 / h) * np.sin(2 * np.pi * f(m) * h * x * (1 + .0007 * np.sin(2 * np.pi * 5 * x))) * (bright if h > 3 else 1)
    env = np.minimum(1, x / .02) * np.exp(-x * 5)
    return s * env

def bell(m, L=3.0):
    x = np.arange(int(L * sr)) / sr; s = np.zeros_like(x)
    for r, a, d in [(1, 1, 1.4), (2.76, .5, 2.6), (5.4, .25, 4), (8.93, .12, 6)]:
        s += a * np.sin(2 * np.pi * f(m) * r * x) * np.exp(-x * d)
    return s * np.minimum(1, x * 400)

def riser(L):
    x = np.arange(int(L * sr)) / sr
    fr = 120 * 2 ** (x / L * 3.5); ph = 2 * np.pi * np.cumsum(fr) / sr
    nz = lp(rng.standard_normal(len(x)), 4)
    return (np.sin(ph) * .3 + nz * .35) * (x / L) ** 2.2

def whoosh(L=1.0):
    x = np.arange(int(L * sr)) / sr
    return lp(rng.standard_normal(len(x)), 14) * np.sin(np.pi * x / L) ** 2 * .6

# --- drone: D minor, swelling; switches to D major for the last act
turn = start[7]          # "the names came back"
drone = np.zeros(n)
minor = [(26, .5), (33, .32), (38, .3), (41, .14), (45, .12)]
major = [(26, .5), (33, .32), (38, .3), (42, .14), (45, .12)]
for chord, mask in [(minor, t < turn), (major, t >= turn)]:
    for m, a in chord:
        for dt in (-.08, .08):
            ph = 2 * np.pi * f(m + dt) * t
            drone += mask * a * (np.sin(ph) + .35 * np.sin(2 * ph) + .15 * np.sin(3 * ph))
drone *= .05 * (0.7 + 0.3 * np.sin(2 * np.pi * t / 9)) * np.minimum(1, t / 3)
drone = lp(drone, 24)
out[:, 0] += drone; out[:, 1] += drone

# --- ostinato: eighths at 100 bpm through the genealogies, then again after the turn
beat = 60 / 100 / 2
pat_min = [62, 62, 69, 62, 65, 62, 69, 67]
pat_maj = [62, 66, 69, 74, 62, 66, 71, 69]
def ostinato(a, b, pat, g0, g1):
    k = 0; x = a
    while x < b:
        g = g0 + (g1 - g0) * (x - a) / max(1e-6, b - a)
        add(string(pat[k % 8] - 12, .5), x, pan=.35, g=g)
        add(string(pat[k % 8], .4, .6), x, pan=.65, g=g * .5)
        x += beat; k += 1
ostinato(start[2], start[4], pat_min, .05, .09)        # ten generations, Methuselah
ostinato(start[5], start[7] - 1.6, pat_min, .08, .14)  # nations, shrinking lives
ostinato(start[8], start[14], pat_maj, .07, .13)       # Israel

# --- drums on every cut, double hits on the big ones
big = {1, 5, 7, 8, 14}
for k, s0 in enumerate(start):
    if k == 0: continue
    add(whoosh(), s0 - .7, g=.4)
    add(taiko(1.0 if k in big else .7), s0, pan=.5)
    if k in big: add(taiko(.6, base=40), s0 + beat * 2, pan=.4); add(taiko(.5, base=52), s0 + beat * 3, pan=.6)
# war-drum rolls under the nations and the shrinking lives
for k in (5, 6):
    x = start[k]
    while x < start[k] + S[k]['dur'] - .3:
        add(taiko(.28, L=.8, base=58), x, pan=rng.random()); x += beat * 2
# flood rumble
fl = S[4]; L = fl['dur'] + 1.2
rum = lp(rng.standard_normal(int(L * sr)), 220) * np.sin(np.pi * np.arange(int(L * sr)) / sr / L) * 6
add(rum, fl['start'] - .3, g=.6)
# bells on the Hebrew slams
for k, m in [(1, 74), (6, 81), (9, 78), (11, 74), (12, 81), (14, 74)]:
    add(bell(m), start[k] + (3.6 if k == 6 else .05), pan=.5, g=.16)
# riser into the turn, boom on the title
add(riser(3.0), turn - 3.0, g=.55)
add(boom(), start[7], g=.8)
add(boom(), start[14], g=1.0)
xx = np.arange(int(6 * sr)) / sr
for m in (50, 57, 62, 66, 69, 74):
    pad = sum(np.sin(2 * np.pi * f(m) * h * xx) / h for h in (1, 2, 3)) * np.minimum(1, xx / 1.2) * np.exp(-xx * .35)
    add(pad, start[14] + .9, pan=.5, g=.06)

# --- room: feedback delays, then master
for d, g in [(.097, .32), (.163, .26), (.229, .2), (.347, .14), (.53, .08)]:
    di = int(d * sr)
    for c in (0, 1):
        y = out[:, c].copy(); y[di:] += out[:-di, c] * g; out[:, c] = y
fade = np.minimum(1, np.minimum(t / .8, (T - t) / 2.0)); out *= fade[:, None]
out = np.tanh(out / np.max(np.abs(out)) * 1.6) / np.tanh(1.6) * .89
w = wave.open(os.path.join(here, 'out/music.wav'), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((out * 32767).astype('<i2').tobytes()); w.close()
print('music', round(T, 1), 's')
