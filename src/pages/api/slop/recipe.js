// The Slop Kitchen (/slop), step 2: Claude writes a straight-faced recipe for the combo Jev found,
// plus a food-photography prompt for FLUX. Callers send only the ingredient list; the prompt stays here.
export const prerender = false;

const MODEL = 'claude-sonnet-5-5';
const MAX_ITEMS = 4;
const MAX_ITEM_CHARS = 40;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const SYSTEM = `You are the head chef of The Slop Kitchen, a deadpan, fine-dining cookbook for revolting food combinations.
You write completely serious, confident, slightly pompous recipes, like a glossy magazine, for dishes that should never exist.
The humor comes from the earnest tone, never from jokes about the reader. Keep it family-friendly, kosher-style (never mix meat and dairy, no pork or shellfish; if an ingredient is Spam or hot dogs, treat it as a beef or turkey version and do not pair it with dairy) and genuinely safe to cook and eat: normal cooking temperatures, no raw meat, nothing toxic.
Reply with JSON only, no markdown fence, in exactly this shape:
{
  "name": "Dish name, grand and appetizing-sounding (max 8 words)",
  "tagline": "One deadpan sentence selling the dish",
  "serves": "e.g. 2 (reluctantly)",
  "time": "e.g. 25 minutes",
  "ingredients": ["quantity + ingredient", "..."],
  "steps": ["One clear step", "..."],
  "chef_note": "One or two sentences of serving advice or a wine/drink pairing, in the same straight-faced voice",
  "photo_prompt": "A detailed prompt for a professional overhead or 45-degree food photograph of the finished dish: plating, props, surface, light, lens. Make it look like a magazine cover shot, and make the actual ingredients clearly visible. No people, no text."
}
Use every ingredient the user gives as a starring element. 5 to 9 ingredients total, 4 to 7 steps.`;

export async function POST({ request }) {
  const key = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }
  const items = Array.isArray(body.ingredients)
    ? body.ingredients.filter((s) => typeof s === 'string').map((s) => s.trim().slice(0, MAX_ITEM_CHARS)).filter(Boolean).slice(0, MAX_ITEMS)
    : [];
  if (items.length < 2) return json({ error: 'Need at least two ingredients' }, 400);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Tonight's combination: ${items.join(' + ')}` }],
    }),
  });
  if (!res.ok) return json({ error: `Claude ${res.status}: ${(await res.text()).slice(0, 200)}` }, 502);

  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const recipe = JSON.parse(match ? match[0] : text);
    if (!recipe.name || !Array.isArray(recipe.steps)) throw new Error('missing fields');
    return json({ recipe });
  } catch {
    return json({ error: 'Claude returned a recipe I could not read' }, 502);
  }
}
