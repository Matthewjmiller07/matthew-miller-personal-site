// Jev (TypeSafe System One) for "Talk to Noa" at /kolnoa/noa. Noa asks a question from
// src/lib/kolnoa-noa.js; the learner answers; Jev decides whether the answer is Hebrew, which of
// Noa's prewritten replies fits it, and whether the Hebrew sounds natural. Jev picks, never writes.
import { QUESTIONS, OFFTOPIC_WHEN, g } from '../../lib/kolnoa-noa.js';

export const prerender = false;

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const MAX_ANSWER_CHARS = 200;

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

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }
  const q = QUESTIONS[body.q];
  const gender = body.g === 'f' ? 'f' : 'm';
  const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, MAX_ANSWER_CHARS) : '';
  if (!q) return json({ error: 'Unknown question' }, 404);
  if (!answer) return json({ error: 'Empty answer' }, 400);

  const hasHebrew = /[֐-׿]/.test(answer);
  const state = { noa_asked: `${g(q.he, gender)} (${q.en})`, learner_reply: answer };
  const criteria = Object.fromEntries(Object.entries(q.replies).map(([id, r]) => [id, r.when]));
  criteria.offtopic = OFFTOPIC_WHEN;
  const questions = {
    is_hebrew: {
      type: 'noul',
      instructions: 'Is `learner_reply` an attempt to answer in Hebrew, written in Hebrew letters or transliterated in Latin letters (e.g. "ani ohev pizza"), rather than in English or another language?',
      criteria: {
        true: 'It is Hebrew, in Hebrew script or transliterated, even if it has mistakes or borrows a name or one English word.',
        false: 'It is written in English or another non-Hebrew language.',
      },
    },
    reply: {
      type: 'choice',
      instructions: 'A seven-year-old named Noa asked a Hebrew learner `noa_asked`, and they answered `learner_reply` (possibly transliterated Hebrew, possibly with mistakes). Which option best describes their answer?',
      criteria,
    },
  };
  if (hasHebrew) {
    questions.natural = {
      type: 'noul',
      instructions: 'Is `learner_reply` grammatical Hebrew that an Israeli would accept as a reply to `noa_asked`? Short answers and single words are fine if correct.',
      criteria: {
        true: 'A native speaker would accept it as correct Hebrew (minor spelling slips are fine).',
        false: 'It has clear grammar errors (gender, agreement, verb form) or reads as a word-by-word calque.',
      },
    };
  }

  try {
    const a = await systemOne(state, questions);
    const hebrew = hasHebrew || a.is_hebrew.noul >= 0.5;
    return json({
      reply: hebrew ? a.reply.choice : 'english',
      natural: a.natural?.noul ?? null,
    });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
