// Jev (TypeSafe System One) judgments for Which Bracha? (/bracha).
// Jev only answers factual questions about a food: what it's mostly made of, whether the produce is
// still recognizable, whether grain is a real ingredient. The halachic rules live in the page, in code.
// Questions are built here; callers send only food names.
export const prerender = false;

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const MAX_FOODS = 12;
const MAX_FOOD_CHARS = 120;

const QUESTIONS = {
  base: {
    type: 'choice',
    instructions: 'What is `food` mainly made of, as it is usually eaten? Judge by its main ingredient, the part that makes it what it is.',
    criteria: {
      bread: 'Bread: baked dough of wheat, barley, spelt, rye or oats, such as challah, rolls, bagels, pita, sandwich bread, matzah.',
      grain_food: 'Mainly wheat, barley, spelt, rye or oats but not bread: cake, cookies, crackers, pasta, couscous, pretzels, oatmeal, wheat or oat cereal, pastries, pizza.',
      rice: 'Mainly rice: cooked rice, sushi, rice cakes, rice cereal, rice pudding.',
      wine: 'Wine or grape juice.',
      other_drink: 'A drink other than wine or grape juice: water, coffee, tea, soda, milk, beer, fruit juice, smoothies.',
      tree_fruit: 'Fruit of a tree whose trunk lives on and bears fruit year after year: apples, oranges, grapes, raisins, dates, figs, olives, cherries, nuts like almonds, walnuts and pecans, avocado.',
      ground_produce: 'Produce of the ground or of plants that do not keep a lasting trunk: vegetables, potatoes, legumes, corn, peanuts, bananas, strawberries, melons, pineapple.',
      other: 'Anything else: meat, fish, eggs, cheese and dairy, mushrooms, candy, chocolate, ice cream, snacks not mainly made of grain or produce.',
      not_food: 'Not something people eat or drink.',
    },
  },
  recognizable: {
    type: 'noul',
    instructions: 'If `food` is mainly a fruit, vegetable, nut or legume, is that produce still in a recognizable form?',
    criteria: {
      true: 'It is whole, sliced, chopped, cooked, roasted, baked, dried, or chunky, so you can still see what it is (e.g. sliced potato chips, popcorn and other popped or puffed whole kernels, baked apples, chunky salsa, trail mix, roasted peanuts).',
      false: 'It has been juiced, pureed smooth, mashed into flakes, or processed into something unrecognizable (e.g. orange juice, fruit leather, potato-flake crisps, date syrup), or it is not mainly produce.',
    },
  },
  grain: {
    type: 'noul',
    instructions: 'Does `food` contain wheat, barley, spelt, rye or oats as an ingredient that gives it substance or flavor?',
    criteria: {
      true: 'Grain is a real component of the food: dough, crust, pasta, oats, cake, a cookie or wafer part (e.g. apple pie, granola bar with oats, chicken noodle soup, a Kit Kat).',
      false: 'There is no such grain, or it is only a thin coating, a binder or a thickener (e.g. breaded schnitzel coating, flour in a sauce), or the grain is rice or corn.',
    },
  },
  seven: {
    type: 'noul',
    instructions: 'Is the main fruit in `food` one of grapes (including raisins), figs, pomegranates, olives or dates?',
    criteria: {
      true: 'The main fruit is grapes, raisins, figs, pomegranates, olives or dates.',
      false: 'The main fruit is something else, or there is no fruit.',
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

// One call per food, all foods in parallel; the four questions share each food's state.
async function judge(food) {
  try {
    const a = await systemOne({ food }, QUESTIONS);
    return {
      food,
      base: { choice: a.base.choice, probabilities: a.base.probabilities, confidence: a.base.confidence },
      recognizable: a.recognizable.noul,
      grain: a.grain.noul,
      seven: a.seven.noul,
    };
  } catch (err) {
    return { food, error: err.message };
  }
}

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const foods = (Array.isArray(body.foods) ? body.foods : [])
    .filter((f) => typeof f === 'string')
    .map((f) => f.trim().slice(0, MAX_FOOD_CHARS))
    .filter(Boolean)
    .slice(0, MAX_FOODS);
  if (!foods.length) return json({ error: 'foods is required' }, 400);
  return json({ results: await Promise.all(foods.map(judge)) });
}
