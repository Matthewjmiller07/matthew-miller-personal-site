// Jev (TypeSafe System One) sugya map for Mega Talmud (/mega-talmud).
// The browser sends the daf's segments from Sefaria; Jev labels what each one does in the
// argument and whether it opens a new sugya. Questions are built here — callers can't send
// arbitrary ones — and the TypeSafe key stays server-side.
export const prerender = false;

import { MOVE_QUESTION as MOVE, NEW_SUGYA_QUESTION as NEW_SUGYA } from '../../lib/sugya.js';

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const MAX_SEGMENTS = 12;
const MAX_TEXT_CHARS = 1500;
const MAX_PREV_CHARS = 700;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

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

// Each segment is judged on its own (with the one before it as context), in parallel.
async function mapSegments(daf, segments) {
  return Promise.all(
    segments.map(async (s) => {
      const state = {
        daf,
        previous: str(s.previous, MAX_PREV_CHARS) || '(start of the daf)',
        segment: { hebrew: str(s.hebrew, MAX_TEXT_CHARS), english: str(s.english, MAX_TEXT_CHARS) },
      };
      try {
        const a = await systemOne(state, { move: MOVE, newSugya: NEW_SUGYA });
        return {
          move: a.move.choice,
          confidence: a.move.confidence,
          probabilities: a.move.probabilities,
          newSugya: a.newSugya.noul,
        };
      } catch (err) {
        return { error: err.message };
      }
    }),
  );
}

export async function POST({ request: req }) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const daf = str(body.daf, 60).trim();
  if (!daf) return json({ error: 'daf is required' }, 400);
  const segments = (Array.isArray(body.segments) ? body.segments : []).slice(0, MAX_SEGMENTS);
  try {
    return json({ results: await mapSegments(daf, segments) });
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}
