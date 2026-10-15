// Jev (TypeSafe System One) grading for Kolnoa, the subtitle language lab at /kolnoa.
// The learner translates one subtitle line; this route looks the line up in our own data and asks
// Jev how much of its meaning came through, word by word. Callers send only slug + line index +
// their answer, so the TypeSafe key and the questions stay server-side.
export const prerender = false;

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const MAX_ANSWER_CHARS = 400;
const MAX_WORDS = 24;

const lessons = Object.fromEntries(
  Object.values(import.meta.glob('../../data/kolnoa/*.json', { eager: true })).map((m) => {
    const d = m.default ?? m;
    return [d.slug, d];
  }),
);

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

const MEANING = (from, to) => ({
  type: 'score',
  instructions: `A ${from === 'he' ? 'Hebrew' : 'English'} learner heard \`original\` in a video and wrote \`learner_translation\` in ${to === 'he' ? 'Hebrew' : 'English'}. \`reference_translation\` is the professional subtitle. How much of the original's meaning does the learner's translation convey? Ignore spelling, word order, and wording differences that keep the meaning.`,
  criteria: [
    'Missed: unrelated, empty, or the opposite meaning.',
    'Fragment: one or two words or ideas are right, but the main point is missing.',
    'Gist: the main idea comes through, but important details are missing or wrong.',
    'Close: everything important is there, with a small slip or omission.',
    'Spot on: the full meaning comes through.',
  ],
});

const NATURAL = {
  type: 'noul',
  instructions: 'Is `learner_translation` grammatical, natural-sounding Hebrew that an Israeli would accept, regardless of whether it matches the reference?',
  criteria: {
    true: 'A native speaker would read it as correct Hebrew (minor spelling slips are fine).',
    false: 'It has clear grammar errors (gender, agreement, verb form, word order) or reads as a word-by-word calque.',
  },
};

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }
  const lesson = lessons[body.slug];
  const line = lesson?.lines?.[body.line];
  const direction = body.direction === 'en2he' ? 'en2he' : 'he2en';
  const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, MAX_ANSWER_CHARS) : '';
  if (!line) return json({ error: 'Unknown line' }, 404);
  if (!answer) return json({ error: 'Empty answer' }, 400);

  // Words to check: the original's words that Jev aligned at build time (content words, not particles).
  const he2en = direction === 'he2en';
  const origWords = he2en ? line.heWords : line.enWords;
  const aligned = he2en
    ? line.align.map((a, k) => (a == null ? null : k)).filter((k) => k != null)
    : [...new Set(line.align.filter((a) => a != null))].sort((a, b) => a - b);
  const check = aligned.slice(0, MAX_WORDS);

  const state = {
    original: he2en ? line.he : line.en,
    reference_translation: he2en ? line.en : line.he,
    learner_translation: answer,
  };
  const questions = { meaning: MEANING(he2en ? 'he' : 'en', he2en ? 'en' : 'he') };
  if (!he2en) questions.natural = NATURAL;
  for (const k of check) {
    questions[`w${k}`] = {
      type: 'noul',
      instructions: `Does \`learner_translation\` express the meaning of the word "${origWords[k]}" as it is used in \`original\` (the reference renders it as "${he2en ? line.enWords[line.align[k]] : line.heWords[line.align.indexOf(k)]}")? Synonyms and paraphrases count.`,
      criteria: {
        true: 'That idea is present in the learner translation.',
        false: 'That idea is missing or mistranslated in the learner translation.',
      },
    };
  }

  try {
    const a = await systemOne(state, questions);
    return json({
      direction,
      meaning: a.meaning.score, // 0..4
      natural: a.natural?.noul ?? null,
      words: Object.fromEntries(check.map((k) => [k, a[`w${k}`].noul])),
    });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
