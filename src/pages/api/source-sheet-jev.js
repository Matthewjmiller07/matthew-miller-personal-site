// Jev (TypeSafe System One) judgments for the Source Sheet Creator.
// The browser gathers candidates from Sefaria; this route only asks Jev about them, so the
// TypeSafe key stays server-side. Questions are built here — callers can't send arbitrary ones.
export const prerender = false;

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const MAX_REQUEST_CHARS = 300;
const MAX_TOPICS = 40;
const MAX_SOURCES = 12;
const MAX_TEXT_CHARS = 1500;

const RELEVANCE = {
  type: 'score',
  instructions:
    'How relevant is `source` to `request` for someone putting together a study source sheet on that topic or question?',
  criteria: [
    'Unrelated: the source does not discuss the topic at all.',
    'Passing mention: a word or idea from the topic appears, but the source is about something else.',
    'Related: the source discusses a connected idea or one aspect of the topic.',
    'Central: the source directly teaches, rules on, tells a story about, or explores the topic itself.',
  ],
};

const SUBSTANTIVE = {
  type: 'noul',
  instructions:
    'Does `source` contain its own teaching, argument, story, law, or verse content, rather than only a citation, a list of references, or a table of contents?',
  criteria: {
    true: 'The passage says something in its own words that a student could study and discuss.',
    false: 'The passage is only a pointer to other texts, a heading, a list, or a fragment with no content.',
  },
};

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

// Which fuzzy name matches are actually the subject of the request? One Noul per topic, one call.
async function judgeTopics(request, topics) {
  const questions = Object.fromEntries(
    topics.map((_, i) => [
      `t${i}`,
      {
        type: 'noul',
        instructions: `Is \`topics[${i}]\` a main subject of \`request\`?`,
        criteria: {
          true: 'The topic names what the request is about: its central commandment, practice, concept, or figure.',
          false: 'The topic is only loosely associated, merely shares a word, or is a different subject.',
        },
      },
    ]),
  );
  const answers = await systemOne({ request, topics }, questions);
  return topics.map((_, i) => answers[`t${i}`].noul);
}

// Each source is judged on its own (request + one source per call), in parallel.
async function judgeSources(request, sources) {
  return Promise.all(
    sources.map(async (s) => {
      const source = {
        citation: str(s.citation, 200),
        genre: str(s.genre, 200),
        hebrew: str(s.hebrew, MAX_TEXT_CHARS),
        english: str(s.english, MAX_TEXT_CHARS),
      };
      try {
        const a = await systemOne({ request, source }, { relevance: RELEVANCE, substantive: SUBSTANTIVE });
        return {
          relevance: a.relevance.score,
          confidence: a.relevance.confidence,
          substantive: a.substantive.noul,
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
  const request = str(body.request, MAX_REQUEST_CHARS).trim();
  if (!request) return json({ error: 'request is required' }, 400);

  try {
    if (body.action === 'topics') {
      const topics = (Array.isArray(body.topics) ? body.topics : [])
        .slice(0, MAX_TOPICS)
        .map((t) => str(t, 120));
      if (!topics.length) return json({ nouls: [] });
      return json({ nouls: await judgeTopics(request, topics) });
    }
    if (body.action === 'score') {
      const sources = (Array.isArray(body.sources) ? body.sources : []).slice(0, MAX_SOURCES);
      return json({ results: await judgeSources(request, sources) });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}
