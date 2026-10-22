# Soundtrack for a Jev trailer, timed to its scenes: python3 audio.py <name> <riser-scene-index>
# Reads <name>-scenes.json (written by render.mjs), writes <name>-music.wav.
# Adapted from scripts/language-of-blessing-video/taudio.py.
import json, sys, wave
import numpy as np
name, riser_at = sys.argv[1], int(sys.argv[2])
sr = 44100; info = json.load(open(f'{name}-scenes.json')); T = info['T'] + 1; S = info['S']
n = int(T * sr); t = np.arange(n) / sr; out = np.zeros((n, 2))
def add(sig, at, pan=0.5, g=1):
    i = int(at * sr); j = min(n, i + len(sig)); sig = sig[:j - i] * g; out[i:j, 0] += sig * (1 - pan); out[i:j, 1] += sig * pan
f = lambda m: 440 * 2 ** ((m - 69) / 12)
scale = [62, 63, 66, 67, 69, 70, 72, 74, 75, 78, 79, 81]   # D freygish
pad = np.zeros(n)
for m, a in [(38, .5), (45, .3), (50, .25), (57, .12)]:
    for dt in (-.15, .15):
        ph = 2 * np.pi * f(m + dt / 10) * t
        pad += a * (np.sin(ph) + .3 * np.sin(2 * ph) + .12 * np.sin(3 * ph))
pad *= .07 * (0.75 + 0.25 * np.sin(2 * np.pi * t / 11))
pad = np.convolve(pad, np.ones(30) / 30, 'same')
out[:, 0] += pad; out[:, 1] += pad
beat = 60 / 120
def kick(g=1):
    L = .5; x = np.arange(int(L * sr)) / sr; fr = 50 + 90 * np.exp(-x * 30); ph = 2 * np.pi * np.cumsum(fr) / sr
    return np.sin(ph) * np.exp(-x * 7) * g
def pluck(m, L=1.4):
    x = np.arange(int(L * sr)) / sr; fr = f(m); s = np.zeros_like(x)
    for h, a in [(1, 1), (2, .5), (3, .25), (4, .12)]: s += a * np.sin(2 * np.pi * fr * h * x) * np.exp(-x * (3 + h * 1.5))
    return s * np.minimum(1, x * 200)
def boom():
    L = 3.5; x = np.arange(int(L * sr)) / sr; fr = 38 + 40 * np.exp(-x * 8); ph = 2 * np.pi * np.cumsum(fr) / sr
    nz = np.convolve(np.random.randn(len(x)), np.ones(40) / 40, 'same')
    return (np.sin(ph) * 1.0 + nz * .6 * np.exp(-x * 6)) * np.exp(-x * 1.3)
def whoosh(L=1.2):
    x = np.arange(int(L * sr)) / sr; nz = np.convolve(np.random.randn(len(x)), np.ones(12) / 12, 'same')
    return nz * np.sin(np.pi * x / L) ** 2 * .5
def riser(L=3):
    x = np.arange(int(L * sr)) / sr; fr = 200 * 2 ** (x * 3 / L * 2); ph = 2 * np.pi * np.cumsum(fr) / sr
    nz = np.convolve(np.random.randn(len(x)), np.ones(6) / 6, 'same')
    return (np.sin(ph) * .25 + nz * .3) * (x / L) ** 2
np.random.seed(3); rng = np.random.default_rng(5)
b = S[1]['start']; i = 0; end = S[-1]['start']
while b < end:
    add(kick(.55), b)
    if i % 2 == 0: add(pluck(scale[rng.integers(0, 7)]), b + beat / 2, pan=rng.random(), g=.12)
    if i % 4 == 0: add(pluck(scale[rng.integers(4, 12)]), b + beat * 0.25, pan=rng.random(), g=.07)
    b += beat; i += 1
for k, sc in enumerate(S):
    if k > 0: add(whoosh(), sc['start'] - .6, g=.35)
    add(boom(), sc['start'], g=.9 if k in (0, riser_at, len(S) - 1) else .55)
add(riser(), S[riser_at]['start'] - 2.5, g=.6)
for m in [50, 57, 62, 66, 69]: add(pluck(m, 6), S[-1]['start'] + .3, g=.15)
for d, g in [(.113, .35), (.171, .28), (.239, .22), (.331, .16)]:
    di = int(d * sr)
    for c in (0, 1):
        y = out[:, c].copy(); y[di:] += out[:-di, c] * g; out[:, c] = y
fade = np.minimum(1, np.minimum(t / 1.5, (T - t) / 1.5)); out *= fade[:, None]
out /= np.max(np.abs(out)) * 1.12
w = wave.open(f'{name}-music.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((out * 32767).astype('<i2').tobytes()); w.close(); print('ok', T)
