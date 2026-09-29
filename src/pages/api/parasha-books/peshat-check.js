// Jev (TypeSafe System One) peshat check for Parasha Books.
// For one spread, Jev reads the pesukim (Hebrew + English from Sefaria) next to the story and judges:
// is the story faithful to the plain meaning, does it slip in midrash as if it were the verse,
// is the "Look closely" answer right, and is it gentle enough for small children.
// The caller only names a book + page; state and questions are built here.
import { bookBySlug, castStory } from '../../../data/parasha-books/books.mjs';
import { defaultCast } from '../../../data/parasha-books/cast.mjs';
import verses from '../../../data/parasha-books/verses.json';

export const prerender = false;

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';

const QUESTIONS = {
  faithful: {
    type: 'score',
    instructions:
      'How faithful is `story` to the plain meaning (peshat) of `pesukim`? The explorer children in the story (named kids who watch, point, count and ask questions) are a framing device — judge only what the story says happened in the Torah.',
    criteria: [
      'Contradicts: the story states events or details that the pesukim contradict.',
      'Embellished: the story adds events, motives, or details the pesukim do not contain, as if they were part of the text.',
      'Mostly faithful: the story follows the pesukim, with small paraphrases that slightly stretch the plain meaning.',
      'Faithful: every event the story reports is stated in the pesukim; paraphrases keep the plain meaning.',
    ],
  },
  midrash: {
    type: 'noul',
    instructions:
      'Does `story` present a midrashic, aggadic, or later interpretive tradition (something not stated in `pesukim`) as if it happened in the text?',
    criteria: {
      true: 'The story reports a tradition or detail from outside the pesukim as part of the event.',
      false: 'Everything the story reports about the event comes from the pesukim themselves.',
    },
  },
  answer: {
    type: 'noul',
    instructions: 'According to `pesukim`, is `answer` a correct answer to `question`?',
    criteria: {
      true: 'The pesukim directly support the answer.',
      false: 'The answer is wrong, unsupported, or answers a different question.',
    },
  },
  gentle: {
    type: 'noul',
    instructions: 'Is `story` told in a way that is suitable to read aloud to children aged 1 to 6?',
    criteria: {
      true: 'Hard moments are told gently, without graphic or frightening detail.',
      false: 'The story includes graphic, frightening, or otherwise unsuitable detail for small children.',
    },
  },
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST({ request }) {
  const key = import.meta.env.TYPESAFE_API_KEY || process.env.TYPESAFE_API_KEY;
  if (!key) return json({ error: 'TYPESAFE_API_KEY is not configured' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const book = bookBySlug[body.slug];
  const page = book?.pages[Number(body.page)];
  if (!page) return json({ error: 'Unknown book or page' }, 400);

  const state = {
    pesukim: (verses[page.ref] || []).map((v) => `${v.v} ${v.he} — ${v.en}`).join('\n'),
    story: castStory(page.story, defaultCast),
    question: page.question,
    answer: page.answer,
  };

  try {
    const res = await fetch(TYPESAFE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, state, questions: QUESTIONS }),
    });
    if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const a = (await res.json()).answers;
    return json({
      ref: page.ref,
      faithful: a.faithful.score,
      confidence: a.faithful.confidence,
      midrash: a.midrash.noul,
      answerCorrect: a.answer.noul,
      gentle: a.gentle.noul,
    });
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}
