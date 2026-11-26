#!/usr/bin/env node
// Does what still applies change between the Land of Israel and the diaspora? Asks Jev two Nouls of every
// halakha (ISRAEL_QUESTIONS) and writes public/data/mishneh-torah/israel.json as { h: { "i:c:n": [israel, diaspora] } }.
// Resumable; stops cleanly when TypeSafe credits run out. Uses the same text cache as analyze.mjs.
//
// Usage: NODE_USE_ENV_PROXY=1 node scripts/mishneh-torah/israel.mjs [--cache DIR] [--limit N] [--concurrency N]

import fs from 'fs';
import { ISRAEL_QUESTIONS } from '../../src/lib/mishneh-torah-jev.js';

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const CACHE = arg('--cache') || './.cache/mishneh-torah';
const limit = +(arg('--limit') || 0);
const CONC = +(arg('--concurrency') || 32);
const OUT = './public/data/mishneh-torah/israel.json';
const KEY = process.env.TYPESAFE_API_KEY || 'proxy-injected';
const D = JSON.parse(fs.readFileSync('./public/data/mishneh-torah/halakhot.json', 'utf8'));
const strip = (s) => String(s || '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i class="footnote">[\s\S]*?<\/i>/g, '')
  .replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const read = (t, l) => { try { return JSON.parse(fs.readFileSync(`${CACHE}/txt/Mishneh Torah, ${t}|${l}.json`, 'utf8')).text; } catch { return []; } };
const T = D.hilchot.map((h) => ({ en: read(h.title, 'English'), he: read(h.title, 'Hebrew') }));
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { tokens: 0, h: {} };
const save = () => { if (Object.keys(out.h).length) fs.writeFileSync(OUT, JSON.stringify(out) + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r2 = (x) => Math.round(x * 100) / 100;

async function jev(state) {
  for (let i = 0; ; i++) {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(i > 1 ? { 'TypeSafe-Danger-Zone-Long-Context': 'true' } : {}) },
      body: JSON.stringify({ model: 'jev-latest', state, questions: ISRAEL_QUESTIONS }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
    if (res.ok) { const r = await res.json(); out.tokens += r.usage?.input_tokens || 0; out.model = r.model; return r.answers; }
    const body = await res.text();
    if (res.status === 402) throw Object.assign(new Error(body), { fatal: true });
    if (i >= 4) throw new Error(`${res.status} ${body.slice(0, 200)}`);
    await sleep(1000 * 2 ** i);
  }
}

let todo = D.rows.filter((r) => r.length > 3 && !out.h[`${r[0]}:${r[1]}:${r[2]}`]);
if (limit) todo = todo.slice(0, limit);
let k = 0, done = 0, stop = false;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (k < todo.length && !stop) {
    const [i, c, n] = todo[k++];
    const text = strip(T[i].en[c - 1]?.[n - 1]) || strip(T[i].he[c - 1]?.[n - 1]);
    if (!text) continue;
    try {
      const a = await jev({ halakha: { ref: `${D.hilchot[i].title} ${c}:${n}`, text: text.slice(0, 6000) } });
      out.h[`${i}:${c}:${n}`] = [r2(a.israel.noul), r2(a.diaspora.noul)];
    } catch (e) {
      if (e.fatal) { if (!stop) console.error(`Stopped: ${e.message}`); stop = true; } else console.error(`${D.hilchot[i].title} ${c}:${n}: ${e.message}`);
    }
    if (++done % 500 === 0) { save(); console.log(`${done}/${todo.length} · $${(out.tokens * 0.042 / 1e6).toFixed(3)}`); }
  }
}));
save();
console.log(`${stop ? 'Paused' : 'Done'} · ${Object.keys(out.h).length} halakhot · $${(out.tokens * 0.042 / 1e6).toFixed(3)}`);
