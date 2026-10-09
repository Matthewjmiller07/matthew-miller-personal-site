// Live cards for /lost-in-translation.
//
// GET  → one attempt at a card, built from a real verse:
//   1. Pick a random Tanakh chapter (or Pirkei Avot) and verse from Sefaria.
//   2. Translate single words with no context through Helsinki-NLP's
//      opus-mt-tc-big-he-en (free hf-inference tier). Out of context it
//      misreads homographs and prefix splits, which is the game.
//   3. Drop words the machine got right (its output shows up in Sefaria's English).
//   4. A judge LLM picks the best genuine misreading, and has to quote the
//      phrase in Sefaria's English that renders the word. We check that quote
//      against the real translation before serving the card.
//   Returns { card } or { retry: true, reason } when this verse had nothing good.
//
// POST { action: 'grade', guess, card } → { correct } for guesses the
//   client's fuzzy match couldn't settle.
//
// Env: HF_TOKEN. Optional LIT_JUDGE_MODEL (default openai/gpt-oss-120b:fastest).

export const prerender = false;

const MT_URL = 'https://router.huggingface.co/hf-inference/models/Helsinki-NLP/opus-mt-tc-big-he-en';
const CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';
const FALLBACK_MODEL = 'meta-llama/Llama-3.3-70B-Instruct:fastest';

function env(key) {
  return process.env[key] || import.meta.env?.[key] || '';
}

const TANAKH = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34],
  ['Joshua', 24], ['Judges', 21], ['I Samuel', 31], ['II Samuel', 24], ['I Kings', 22], ['II Kings', 25],
  ['Isaiah', 66], ['Jeremiah', 52], ['Ezekiel', 48], ['Hosea', 14], ['Joel', 4], ['Amos', 9],
  ['Obadiah', 1], ['Jonah', 4], ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3],
  ['Haggai', 2], ['Zechariah', 14], ['Malachi', 3], ['Psalms', 150], ['Proverbs', 31], ['Job', 42],
  ['Song of Songs', 8], ['Ruth', 4], ['Lamentations', 5], ['Ecclesiastes', 12], ['Esther', 10],
  ['Daniel', 12], ['Ezra', 10], ['Nehemiah', 13], ['I Chronicles', 29], ['II Chronicles', 36],
];
const SOURCES = {
  tanakh: () => {
    const [book, n] = TANAKH[Math.floor(Math.random() * TANAKH.length)];
    return { book, chapter: 1 + Math.floor(Math.random() * n), cat: 'Tanakh' };
  },
  avot: () => ({ book: 'Pirkei Avot', chapter: 1 + Math.floor(Math.random() * 6), cat: 'Pirkei Avot' }),
};

// Function words not worth a card.
const HE_STOP = new Set([
  'את', 'אשר', 'על', 'אל', 'כי', 'לא', 'כל', 'יהוה', 'אלהים', 'הוא', 'היא', 'גם', 'עד', 'מן', 'אם',
  'הם', 'הן', 'אני', 'אנכי', 'אתה', 'זה', 'זאת', 'לו', 'לה', 'לי', 'בו', 'בה', 'עם', 'אין', 'יש',
  'ויאמר', 'לאמר', 'ואת', 'וכל', 'כן', 'אז', 'הנה', 'מה', 'מי', 'לך', 'לכם', 'אתם', 'אלה', 'ה',
]);
const EN_STOP = new Set([
  'the', 'a', 'an', 'of', 'to', 'and', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'is', 'are', 'was',
  'be', 'it', 'that', 'this', 'as', 'or', 'not', 'no',
]);
// Also ignored when checking whether the machine got a word right: "her ways"
// for "its ways" is not a misreading.
const EN_GLUE = new Set([
  'he', 'she', 'they', 'we', 'you', 'i', 'him', 'her', 'his', 'its', 'their', 'them', 'my', 'your', 'our',
  'me', 'us', 'will', 'shall', 'have', 'has', 'had', 'do', 'did', 'let', 'o',
]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function cleanHe(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/[־׀׃]/g, ' ') // maqaf, paseq, sof pasuq
    .replace(/[֑-ׇ]/g, '') // vowels and cantillation
    .replace(/[^א-ת\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEn(s) {
  return String(s || '')
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/<i class="footnote">.*?<\/i>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const stem = w => w.replace(/(ing|ed|es|s)$/, '');
const contentWords = s =>
  s.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w && !EN_STOP.has(w));

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchVerse(source) {
  const pick = (SOURCES[source] || SOURCES.tanakh)();
  const ref = `${pick.book} ${pick.chapter}`;
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref.replace(/ /g, '_'))}?context=0&commentary=0&pad=0`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`Sefaria ${res.status}`);
  const data = await res.json();
  const he = (Array.isArray(data.he) ? data.he : [data.he]).flat(Infinity);
  const en = (Array.isArray(data.text) ? data.text : [data.text]).flat(Infinity);
  const verses = he
    .map((h, i) => ({ n: i + 1, he: cleanHe(h), en: cleanEn(en[i]) }))
    .filter(v => v.en && v.he.split(' ').length >= 4);
  if (!verses.length) throw new Error(`No usable verses in ${ref}`);
  const v = verses[Math.floor(Math.random() * verses.length)];
  return { ref: `${ref}:${v.n}`, cat: pick.cat, he: v.he, en: v.en };
}

async function translateWord(word, token) {
  try {
    const res = await fetch(MT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: word }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = (Array.isArray(data) ? data[0] : data)?.translation_text;
    return out ? out.replace(/[.!?]+$/, '').trim() : null;
  } catch {
    return null;
  }
}

async function chat(messages, token, maxTokens) {
  const models = [env('LIT_JUDGE_MODEL') || 'openai/gpt-oss-120b:fastest', FALLBACK_MODEL];
  for (const model of models) {
    try {
      const body = { model, messages, max_tokens: maxTokens, temperature: 0.2 };
      if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.error('[lost-in-translation] judge', model, res.status, (await res.text()).slice(0, 200));
        continue;
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return { model, out: JSON.parse(m[0]) };
    } catch (err) {
      // A timeout leaves no time for the fallback inside the function limit.
      console.error('[lost-in-translation] judge', model, err.message);
      if (err.name === 'TimeoutError') return null;
    }
  }
  return null;
}

async function makeCard(source, token) {
  const verse = await fetchVerse(source);

  const words = shuffle([...new Set(verse.he.split(' '))].filter(w => w.length >= 2 && !HE_STOP.has(w))).slice(0, 8);
  const translated = await Promise.all(words.map(w => translateWord(w, token)));

  // Keep only words the machine got wrong: some content word of its output
  // has to be missing from Sefaria's English.
  const enWords = new Set(contentWords(verse.en).map(stem));
  const candidates = words
    .map((he, i) => ({ he, mt: translated[i] }))
    .filter(c => {
      if (!c.mt || c.mt.length > 40 || /[א-ת]/.test(c.mt)) return false;
      const cw = contentWords(c.mt).filter(w => !EN_GLUE.has(w));
      return cw.length > 0 && cw.some(w => !enWords.has(stem(w)));
    });
  if (!candidates.length) return { retry: true, reason: `machine got ${verse.ref} right` };

  const list = candidates.map((c, i) => `${i}. ${c.he} → "${c.mt}"`).join('\n');
  const judged = await chat(
    [
      { role: 'system', content: 'You are a careful Hebrew philologist and a puzzle editor. You answer with JSON only.' },
      {
        role: 'user',
        content: `A machine translator was given single Hebrew words from a real verse, one at a time, with no context. Find its best genuine mistranslation for a guessing game: players see the machine's English and must work back to what the word really means here.

Source: ${verse.ref}
Hebrew: ${verse.he}
English translation (authoritative): ${verse.en}

Candidates (index. Hebrew word → machine output):
${list}

Choose a candidate only if the machine output is a REAL alternative reading of the same Hebrew letters: a different word spelled the same, a different vocalization, or a wrong split into prefix, suffix or two words. Its meaning must clearly differ from what the word means in this verse. Reject synonyms, slightly-off senses, grammatical variants, transliterations of names, and outputs with no basis in Hebrew. If none qualify, use index -1.

Return ONLY this JSON:
{"index": <number or -1>, "score": <0-10, how surprising and fair a puzzle it is>, "en_span": "<exact words copied from the English translation above that render this Hebrew word>", "answer": "<what the word means in this verse, 1-3 plain English words>", "alternates": ["<other acceptable answers>"], "why": "<One or two sentences: how the letters can be read as the machine's output, and what they mean in this verse. Transliterate the Hebrew.>"}`,
      },
    ],
    token,
    700
  );
  if (!judged) return { retry: true, reason: 'judge unavailable' };

  const j = judged.out;
  const c = candidates[j.index];
  if (!c || !(j.score >= 6)) return { retry: true, reason: `judge passed on ${verse.ref}` };
  const span = String(j.en_span || '').trim();
  const at = span ? verse.en.toLowerCase().indexOf(span.toLowerCase()) : -1;
  if (at < 0 || !j.answer) return { retry: true, reason: 'judge answer not grounded in the translation' };

  const answers = [j.answer, ...(Array.isArray(j.alternates) ? j.alternates : []), span]
    .map(a => String(a).trim())
    .filter((a, i, all) => a && a.length <= 40 && all.findIndex(b => b.toLowerCase() === a.toLowerCase()) === i);

  return {
    card: {
      live: true,
      bad: c.mt.toLowerCase(),
      he: c.he,
      answer: answers,
      cat: `${verse.cat} · ${verse.ref.replace(/ \d+:\d+$/, '')}`,
      why: String(j.why || ''),
      ref: verse.ref,
      span,
      verseHe: verse.he,
      verseEn: verse.en,
      blanked: verse.en.slice(0, at) + '_____' + verse.en.slice(at + span.length),
      sefaria: `https://www.sefaria.org/${verse.ref.replace(/ (\d+):(\d+)$/, '.$1.$2').replace(/ /g, '_')}`,
      score: j.score,
      models: { translator: 'Helsinki-NLP/opus-mt-tc-big-he-en', judge: judged.model },
    },
  };
}

export async function GET({ url }) {
  const token = env('HF_TOKEN');
  if (!token) return json({ error: 'HF_TOKEN not configured' }, 500);
  try {
    return json(await makeCard(url.searchParams.get('source') || 'tanakh', token));
  } catch (err) {
    return json({ retry: true, reason: err.message });
  }
}

export async function POST({ request }) {
  const token = env('HF_TOKEN');
  if (!token) return json({ error: 'HF_TOKEN not configured' }, 500);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const { guess, card } = body || {};
  if (body?.action !== 'grade' || typeof guess !== 'string' || !card) return json({ error: 'bad request' }, 400);
  const g = guess.trim().slice(0, 60);
  const field = (v, n) => String(v || '').slice(0, n);
  if (!g) return json({ correct: false });

  const judged = await chat(
    [
      { role: 'system', content: 'You grade answers in a translation game. You answer with JSON only.' },
      {
        role: 'user',
        content: `In ${field(card.ref, 60)}, the Hebrew word ${field(card.he, 30)} means "${field(card.answer?.[0], 40)}" (the English translation renders it "${field(card.span, 60)}").
Verse: ${field(card.verseEn, 600)}
A player guessed: "${g}"
Is the guess the same meaning here: a synonym, a close paraphrase, or the same word in another form? Be fair but not lax.
Return ONLY {"correct": true} or {"correct": false}.`,
      },
    ],
    token,
    300
  );
  return json({ correct: judged?.out?.correct === true });
}
