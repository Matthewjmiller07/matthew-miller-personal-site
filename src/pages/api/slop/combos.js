// The Slop Kitchen (/slop), step 1: find nasty food combos.
// We deal random combinations from a pantry (or from the cook's own fridge), and TypeSafe's Jev model
// judges each one: how revolting is it, what kind of wrong is it, and is it actually unsafe (those get
// thrown out: we want gross, not poisonous). The ranking happens here, in code.
export const prerender = false;

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const CANDIDATES = 10;
const MAX_ITEMS = 20;
const MAX_ITEM_CHARS = 40;

const PANTRY = [
  'sardines', 'gummy bears', 'mayonnaise', 'peanut butter', 'pickles', 'pickle brine', 'chocolate syrup',
  'canned tuna', 'cottage cheese', 'marshmallows', 'ketchup', 'blue cheese', 'grape jelly', 'hot dogs',
  'instant coffee granules', 'anchovies', 'cereal milk', 'banana', 'horseradish', 'gefilte fish',
  'strawberry yogurt', 'sauerkraut', 'Bamba', 'cola', 'mint toothpaste-flavored gum', 'liver pâté',
  'cotton candy', 'raw onion', 'gherkins', 'tahini', 'maple syrup', 'kimchi', 'Nutella', 'canned peas',
  'egg salad', 'licorice', 'olive brine', 'jellied cranberry sauce', 'fish sauce', 'vanilla ice cream',
  'herring in cream sauce', 'cheese puffs', 'mustard', 'lemon sorbet', 'boiled cabbage', 'Spam',
  'sprinkles', 'orange juice', 'miso paste', 'chopped liver', 'Marmite', 'candy corn', 'durian',
  'canned corn', 'sour cream', 'pretzels', 'cinnamon', 'black olives', 'ranch dressing', 'jelly beans',
];

const QUESTIONS = {
  nasty: {
    type: 'score',
    instructions: 'Someone combines everything in `ingredients` into a single dish and eats it. How revolting would most people find it? Judge the combination itself: clashing flavors, textures, temperatures and smells. Ingredients that are each fine on their own can be disgusting together.',
    criteria: [
      'Pleasant: a normal or even good combination.',
      'Odd: unusual, but many people would happily eat it.',
      'Questionable: most people would hesitate, a few would like it.',
      'Gross: most people would gag or refuse a second bite.',
      'Abomination: almost anyone would find it truly revolting.',
    ],
  },
  crime: {
    type: 'choice',
    instructions: 'What is the main thing wrong with combining everything in `ingredients` into one dish?',
    criteria: {
      flavor: 'The flavors clash: sweet against fishy, minty against savory, sour against creamy.',
      texture: 'The textures clash: slimy with crunchy, gelatinous with gritty, mushy with chewy.',
      smell: 'The smell would be overpowering or nauseating.',
      category: 'It breaks a deep rule of what goes with what: dessert with fish, breakfast with offal, candy with meat.',
      nothing: 'Nothing much is wrong; it would taste fine.',
    },
  },
  unsafe: {
    type: 'noul',
    instructions: 'Would eating a dish made of everything in `ingredients`, in normal portions, pose a real health risk (beyond tasting bad)?',
    criteria: {
      true: 'Yes: something in it is not food, is toxic, or the combination is genuinely dangerous to eat.',
      false: 'No: it may be disgusting, but it is all ordinary food and safe to eat.',
    },
  },
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function systemOne(state, questions) {
  const key = import.meta.env.TYPESAFE_API_KEY || process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error('TYPESAFE_API_KEY is not configured');
  const res = await fetch(TYPESAFE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, state, questions }),
  });
  if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).answers;
}

const pick = (arr, n) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

// Deal distinct combos of 2-3 ingredients.
function deal(pool, n) {
  const seen = new Set();
  const out = [];
  for (let tries = 0; out.length < n && tries < n * 20; tries++) {
    const size = pool.length >= 3 && Math.random() < 0.5 ? 3 : 2;
    const combo = pick(pool, size);
    const key = [...combo].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(combo);
  }
  return out;
}

export async function POST({ request }) {
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const mine = Array.isArray(body.ingredients)
    ? [...new Set(body.ingredients
        .filter((s) => typeof s === 'string')
        .map((s) => s.trim().slice(0, MAX_ITEM_CHARS))
        .filter(Boolean))].slice(0, MAX_ITEMS)
    : [];
  if (mine.length === 1) return json({ error: 'Give me at least two ingredients to ruin.' }, 400);
  const pool = mine.length >= 2 ? mine : PANTRY;

  const combos = deal(pool, CANDIDATES);
  const judged = await Promise.all(
    combos.map(async (ingredients) => {
      try {
        const a = await systemOne({ ingredients: ingredients.join(', ') }, QUESTIONS);
        const probs = a.nasty.probabilities;
        // Expected nastiness on a 0-4 scale, so ties between the same score still rank.
        const expected = probs && typeof probs === 'object'
          ? Object.entries(probs).reduce((s, [k, p]) => s + Number(k) * p, 0)
          : a.nasty.score;
        return {
          ingredients,
          score: a.nasty.score,
          nastiness: Math.round(expected * 25), // 0..100
          crime: a.crime.choice,
          unsafe: a.unsafe.noul,
        };
      } catch (e) {
        return { ingredients, error: e.message };
      }
    }),
  );

  const ok = judged.filter((c) => !c.error);
  if (!ok.length) return json({ error: judged[0]?.error || 'Jev did not answer' }, 502);
  const ranked = ok.filter((c) => !c.unsafe).sort((a, b) => b.nastiness - a.nastiness);
  return json({ combos: ranked, rejected: ok.filter((c) => c.unsafe).map((c) => c.ingredients) });
}
