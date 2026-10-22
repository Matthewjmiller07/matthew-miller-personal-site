// Jev (TypeSafe System One) judgments for the Source Finder (/source-finder).
// The browser gathers candidates from Sefaria and the site's own shiurim; this route only asks Jev
// about them, so the TypeSafe key stays server-side. Questions are built here — callers can't send
// arbitrary ones.
export const prerender = false;

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const MAX_QUESTION_CHARS = 300;
const MAX_TOPICS = 30;
const MAX_SOURCES = 12;
const MAX_TEXT_CHARS = 1500;

// The shelves of the library the finder searches. Keys must match SHELVES in source-finder.astro.
const SHELVES = {
  torah: 'The Five Books of Moses, read in synagogue as the weekly parsha',
  prophets: "Nevi'im: Joshua through Malachi, including the haftarot",
  writings: 'Ketuvim: Psalms, Proverbs, Job, Daniel, Chronicles and the five megillot (Esther, Ruth, Song of Songs, Lamentations, Ecclesiastes)',
  mishnah: 'The Mishnah',
  talmud: 'The Babylonian Talmud (Gemara)',
  midrash: 'Midrash and aggadah',
  halakhah: 'Codes of Jewish law: Rambam, Shulchan Arukh, Sefer HaChinukh, Mishnah Berurah',
  liturgy: 'The siddur and machzor: prayers, blessings and holiday readings',
};

const RELEVANCE = {
  type: 'score',
  instructions: 'How relevant is `source` to `question` for someone who wants to learn about it?',
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
    'Does `source` contain its own teaching, argument, story, law, prayer, or verse content, rather than only a citation, a list of references, a heading, or a table of contents?',
  criteria: {
    true: 'The passage says something in its own words that a student could study and discuss.',
    false: 'The passage is only a pointer to other texts, a heading, a list, or a fragment with no content.',
  },
};

// What the passage contributes to learning about the question. Drives the study-path order.
const ROLE = {
  type: 'choice',
  instructions: 'What does `source` mainly contribute to someone learning about `question`?',
  criteria: {
    origin: 'The root: it states the verse, commandment, event, or practice the question is about.',
    story: 'A narrative, parable, or account of what someone did.',
    meaning: 'An explanation of reasons, values, symbolism, or what the idea means.',
    law: 'A practical ruling about what one should do, when, or how.',
    debate: 'Sages disagree, or a difficulty is raised and argued back and forth.',
  },
};

const LEVEL = {
  type: 'score',
  instructions: 'How much background does a reader need to follow `source` in English translation?',
  criteria: [
    'None: a newcomer with no Jewish learning could follow it.',
    'Some: it uses terms, names, or references that assume basic familiarity with Jewish texts.',
    'A lot: it assumes fluency in Talmudic or halakhic reasoning and its technical vocabulary.',
  ],
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

// Which shelves hold key sources, and which fuzzy Sefaria topic matches are on-subject:
// independent questions over the same state, so one call.
async function route(question, topics) {
  const questions = {};
  for (const k of Object.keys(SHELVES)) {
    questions[`s_${k}`] = {
      type: 'noul',
      instructions: `Would someone studying \`question\` find a key primary source in \`shelves.${k}\`?`,
      criteria: {
        true: 'A central text, law, story, or prayer about this question is found on this shelf.',
        false: 'This shelf has at most passing mentions of it.',
      },
    };
  }
  topics.forEach((_, i) => {
    questions[`t${i}`] = {
      type: 'noul',
      instructions: `Is \`topics[${i}]\` a main subject of \`question\`?`,
      criteria: {
        true: 'The topic names what the question is about: its central commandment, practice, concept, figure, or event.',
        false: 'The topic is only loosely associated, merely shares a word, or is a different subject.',
      },
    };
  });
  const a = await systemOne({ question, shelves: SHELVES, topics }, questions);
  return {
    shelves: Object.fromEntries(Object.keys(SHELVES).map((k) => [k, a[`s_${k}`].noul])),
    topics: topics.map((_, i) => a[`t${i}`].noul),
  };
}

// Each source is judged on its own (question + one source per call), in parallel.
async function judge(question, sources) {
  return Promise.all(
    sources.map(async (s) => {
      const source = {
        citation: str(s.citation, 200),
        genre: str(s.genre, 200),
        hebrew: str(s.hebrew, MAX_TEXT_CHARS),
        english: str(s.english, MAX_TEXT_CHARS),
      };
      try {
        const a = await systemOne(
          { question, source },
          { relevance: RELEVANCE, substantive: SUBSTANTIVE, role: ROLE, level: LEVEL },
        );
        return {
          relevance: a.relevance.score,
          substantive: a.substantive.noul,
          role: a.role.choice,
          roleConfidence: a.role.confidence,
          level: a.level.score,
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
  const question = str(body.question, MAX_QUESTION_CHARS).trim();
  if (!question) return json({ error: 'question is required' }, 400);

  try {
    if (body.action === 'route') {
      const topics = (Array.isArray(body.topics) ? body.topics : []).slice(0, MAX_TOPICS).map((t) => str(t, 120));
      return json(await route(question, topics));
    }
    if (body.action === 'judge') {
      const sources = (Array.isArray(body.sources) ? body.sources : []).slice(0, MAX_SOURCES);
      return json({ results: await judge(question, sources) });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}
