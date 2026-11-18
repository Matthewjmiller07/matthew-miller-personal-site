// Reads the Vite manifest of the prebuilt Tefillin Trials game (games/tefillin-trials, built into
// public/games/tefillin-trials/). One source tree builds two entries: the full R3F game
// (index.html), Hineni Lite (lite.html, plain three.js with WebXR) and the Knot Explorer (knots.html).
import fs from 'node:fs';
import path from 'node:path';

const BASE = '/games/tefillin-trials/';

export function tefillinBundle(entryName: 'index.html' | 'lite.html' | 'knots.html'): { js: string; css: string[] } {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/games/tefillin-trials/.vite/manifest.json'), 'utf8'));
    const entry = manifest[entryName];
    if (!entry) return { js: '', css: [] };
    // CSS can sit on the entry or on a shared chunk it imports.
    const css = new Set<string>();
    const walk = (key: string, seen = new Set<string>()) => {
      if (seen.has(key) || !manifest[key]) return;
      seen.add(key);
      for (const c of manifest[key].css || []) css.add(BASE + c);
      for (const i of manifest[key].imports || []) walk(i, seen);
    };
    walk(entryName);
    return { js: BASE + entry.file, css: [...css] };
  } catch {
    return { js: '', css: [] };
  }
}
