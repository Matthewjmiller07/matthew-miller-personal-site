// Score random pantry combos with Jev for the preloaded Slop Kitchen menu (/slop).
// Usage: TYPESAFE_API_KEY=... node scripts/slop/score.mjs [count] > scored.json
import fs from 'fs';

const src = fs.readFileSync(new URL('../../src/pages/api/slop/combos.js', import.meta.url), 'utf8');
const PANTRY = eval(src.match(/const PANTRY = (\[[\s\S]*?\]);/)[1]);
const QUESTIONS = eval(`(${src.match(/const QUESTIONS = (\{[\s\S]*?\n\});/)[1]})`);
const N = Number(process.argv[2] || 60);

const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const seen = new Set(), combos = [];
while (combos.length < N) {
  const c = shuffle(PANTRY).slice(0, Math.random() < 0.5 ? 3 : 2);
  const k = [...c].sort().join('|');
  if (!seen.has(k)) { seen.add(k); combos.push(c); }
}

async function ask(ingredients) {
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'jev-latest', state: { ingredients: ingredients.join(', ') }, questions: QUESTIONS }),
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
      const a = (await r.json()).answers;
      const p = a.nasty.probabilities || {};
      const exp = Object.entries(p).reduce((s, [k, v]) => s + Number(k) * v, 0);
      return { ingredients, score: a.nasty.score, nastiness: Math.round(exp * 25), crime: a.crime.choice, unsafe: a.unsafe.noul > 0.5, pUnsafe: a.unsafe.noul };
    } catch (e) { if (t === 3) return { ingredients, error: e.message }; await new Promise((r) => setTimeout(r, 2000 * (t + 1))); }
  }
}

const out = [];
for (let i = 0; i < combos.length; i += 8) out.push(...await Promise.all(combos.slice(i, i + 8).map(ask)));
console.log(JSON.stringify(out.filter((c) => !c.error).sort((a, b) => b.nastiness - a.nastiness), null, 1));
const errs = out.filter((c) => c.error); if (errs.length) console.error(errs.length, 'errors:', errs[0].error);
