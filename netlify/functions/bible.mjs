const SUPABASE_URL = "https://qukziojymwlvmrzapgyo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1a3ppb2p5bXdsdm1yemFwZ3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjMxNzAsImV4cCI6MjA2OTYzOTE3MH0.I7oR9fcypn-BKb9AS4d2UlXrgvMbpTQtWySqxgAWGzo";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    "Content-Type": "application/json",
  };
}

function json(data, statusCode, headers) {
  return { statusCode, headers, body: JSON.stringify(data, null, 2) };
}

export const handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Strip /api/bible prefix
  let path = event.path.replace(/^\/api\/bible/, "/api");
  const qs = event.queryStringParameters || {};

  const mode = (process.env.API_MODE || "public").toLowerCase();
  if (mode === "private") {
    const providedKey = event.headers["x-api-key"] || event.headers["X-API-Key"];
    if (!providedKey || providedKey !== process.env.API_SECRET_KEY) {
      return json({ error: "Unauthorized", hint: "Pass your key as X-API-Key header" }, 401, headers);
    }
  }

  try {
    if (path === "/" || path === "/api" || path === "/api/") {
      return json(apiDocs(mode), 200, headers);
    }

    const verseMatch = path.match(/^\/api\/verse\/(.+)\/(\d+)\/(\d+)$/);
    if (verseMatch) {
      const [, book, chapter, verse] = verseMatch;
      return await handleVerse(decodeURIComponent(book), parseInt(chapter), parseInt(verse), headers);
    }

    const bookMatch = path.match(/^\/api\/book\/(.+)$/);
    if (bookMatch) {
      return await handleBook(decodeURIComponent(bookMatch[1]), headers);
    }

    const deviceMatch = path.match(/^\/api\/device\/(.+)$/);
    if (deviceMatch) {
      return await handleDevice(decodeURIComponent(deviceMatch[1]), headers);
    }

    // /api/translation/:code/:book/:chapter
    const translationMatch = path.match(/^\/api\/translation\/([a-z0-9]+)\/(.+)\/(\d+)$/i);
    if (translationMatch) {
      const [, code, book, chapter] = translationMatch;
      return await handleTranslationChapter(code.toLowerCase(), decodeURIComponent(book), parseInt(chapter), headers);
    }

    // /api/translation/:code/:book  (whole book, all chapters at once)
    const translationBookMatch = path.match(/^\/api\/translation\/([a-z0-9]+)\/(.+)$/i);
    if (translationBookMatch) {
      const [, code, book] = translationBookMatch;
      return await handleTranslationBook(code.toLowerCase(), decodeURIComponent(book), headers);
    }

    if (path === "/api/translations") return await handleListTranslations(headers);

    if (path === "/api/search") {
      return await handleSearch(qs.q || "", headers);
    }

    if (path === "/api/devices") return await handleListDevices(headers);
    if (path === "/api/books") return await handleListBooks(headers);

    return json({ error: "Not found" }, 404, headers);
  } catch (err) {
    return json({ error: err.message }, 500, headers);
  }
};

async function handleVerse(book, chapter, verse, headers) {
  const [tanakhRows, literaryRows, sefaria, crossRefs, translations] = await Promise.allSettled([
    supabaseQuery("Tanakh Annotations", { book, chapter, verse }),
    supabaseQuery("literary_bible", { book, chapter, verse }),
    fetchSefaria(book, chapter, verse),
    fetchCrossRefs(book, chapter, verse),
    supabaseQuery("bible_translations", { book, chapter, verse }),
  ]);

  return json({
    reference: { book, chapter, verse },
    sefaria: settled(sefaria),
    annotations: settled(tanakhRows) || [],
    literary_devices: settled(literaryRows) || [],
    cross_references: settled(crossRefs) || [],
    translations: settled(translations) || [],
  }, 200, headers);
}

async function handleTranslationChapter(code, book, chapter, headers) {
  if (!TRANSLATIONS[code]) {
    return json({ error: `Unknown translation code "${code}"`, available: Object.keys(TRANSLATIONS) }, 400, headers);
  }
  const rows = await supabaseQuery("bible_translations", { translation: code, book, chapter });
  return json({
    translation: code,
    name: TRANSLATIONS[code],
    book,
    chapter,
    verses: rows.map(r => ({ verse: r.verse, text: r.text })),
  }, 200, headers);
}

async function handleTranslationBook(code, book, headers) {
  if (!TRANSLATIONS[code]) {
    return json({ error: `Unknown translation code "${code}"`, available: Object.keys(TRANSLATIONS) }, 400, headers);
  }
  const rows = await supabaseQuery("bible_translations", { translation: code, book });
  const chapters = {};
  for (const r of rows) {
    (chapters[r.chapter] ||= []).push({ verse: r.verse, text: r.text });
  }
  for (const arr of Object.values(chapters)) arr.sort((a, b) => a.verse - b.verse);
  return json({
    translation: code,
    name: TRANSLATIONS[code],
    book,
    chapters,
  }, 200, headers);
}

async function handleListTranslations(headers) {
  return json({
    translations: Object.entries(TRANSLATIONS).map(([code, name]) => ({ code, name })),
  }, 200, headers);
}

async function handleBook(book, headers) {
  const [tanakhRows, literaryRows] = await Promise.allSettled([
    supabaseQuery("Tanakh Annotations", { book }),
    supabaseQuery("literary_bible", { book }),
  ]);

  return json({
    book,
    annotations: settled(tanakhRows) || [],
    literary_devices: settled(literaryRows) || [],
  }, 200, headers);
}

async function handleDevice(device, headers) {
  const [tanakhRows, literaryRows] = await Promise.allSettled([
    supabaseQueryFilter("Tanakh Annotations", "literary_device", device),
    supabaseQueryFilter("literary_bible", "device", device),
  ]);

  return json({
    device,
    annotations: settled(tanakhRows) || [],
    literary_devices: settled(literaryRows) || [],
  }, 200, headers);
}

async function handleSearch(q, headers) {
  if (!q || q.length < 2) {
    return json({ error: "Query too short — use ?q=your+search+term" }, 400, headers);
  }

  const [tanakhRows, literaryRows] = await Promise.allSettled([
    supabaseSearch("Tanakh Annotations", q),
    supabaseSearch("literary_bible", q),
  ]);

  return json({
    query: q,
    annotations: settled(tanakhRows) || [],
    literary_devices: settled(literaryRows) || [],
  }, 200, headers);
}

async function handleListDevices(headers) {
  const [tanakhDevices, literaryDevices] = await Promise.allSettled([
    supabaseDistinct("Tanakh Annotations", "literary_device"),
    supabaseDistinct("literary_bible", "device"),
  ]);

  const combined = new Set([
    ...(settled(tanakhDevices) || []),
    ...(settled(literaryDevices) || []),
  ]);

  return json({ devices: [...combined].filter(Boolean).sort() }, 200, headers);
}

async function handleListBooks(headers) {
  const [tanakhBooks, literaryBooks] = await Promise.allSettled([
    supabaseDistinct("Tanakh Annotations", "book"),
    supabaseDistinct("literary_bible", "book"),
  ]);

  const combined = new Set([
    ...(settled(tanakhBooks) || []),
    ...(settled(literaryBooks) || []),
  ]);

  return json({ books: [...combined].filter(Boolean).sort() }, 200, headers);
}

async function supabaseQuery(table, filters) {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(filters)) {
    params.set(key, `eq.${val}`);
  }
  params.set("order", "id.asc");

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${params}`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

async function supabaseQueryFilter(table, column, value) {
  const params = new URLSearchParams();
  params.set(column, `ilike.*${value}*`);
  params.set("order", "id.asc");

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${params}`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

async function supabaseSearch(table, q) {
  const encoded = encodeURIComponent(q);
  const isAnnotations = table === "Tanakh Annotations";
  const textCol = isAnnotations ? "comments" : "notes";
  const params = `or=(words.ilike.*${encoded}*,${textCol}.ilike.*${encoded}*)&order=id.asc`;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${params}`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) throw new Error(`Supabase search error: ${res.status}`);
  return res.json();
}

async function supabaseDistinct(table, column) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?select=${column}`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) throw new Error(`Supabase distinct error: ${res.status}`);
  const rows = await res.json();
  return [...new Set(rows.map(r => r[column]).filter(Boolean))];
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function fetchSefaria(book, chapter, verse) {
  const ref = `${book}.${chapter}.${verse}`;
  const res = await fetch(
    `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?commentary=0&context=0`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return {
    ref: data.ref,
    heRef: data.heRef,
    hebrew: data.he,
    english: data.text,
  };
}

async function fetchCrossRefs(book, chapter, verse) {
  const abbr = BOOK_ABBR[book];
  if (!abbr) return [];

  const res = await fetch(
    `https://www.openbible.info/labs/cross-references/search?q=${abbr}+${chapter}:${verse}&format=json`
  );
  if (!res.ok) return [];
  try {
    return await res.json();
  } catch {
    return [];
  }
}

function settled(result) {
  return result.status === "fulfilled" ? result.value : null;
}

function apiDocs(mode) {
  return {
    name: "Mega Bible API",
    author: "Matthew Miller — theothermatthewmiller.com",
    mode,
    description: "Unified Tanakh annotation and literary analysis API combining personal scholarship with Sefaria and Open Bible data.",
    endpoints: {
      "GET /api/bible/verse/:book/:chapter/:verse":      "Verse text (Hebrew + English), annotations, literary devices, cross-references, classic translations",
      "GET /api/bible/book/:book":                        "All annotations for a book",
      "GET /api/bible/device/:device":                    "All verses tagged with a literary device",
      "GET /api/bible/translation/:code/:book/:chapter":  "One classic translation's verses for a chapter (codes: wyc, cov, bis, gnv, kjv1611)",
      "GET /api/bible/translations":                      "List available classic translation codes/names",
      "GET /api/bible/search?q=":                         "Full-text search across comments, words, and notes",
      "GET /api/bible/devices":                           "List all literary devices in the database",
      "GET /api/bible/books":                              "List all annotated books",
    },
    sources: [
      "Tanakh Annotations (217 entries, personal scholarship)",
      "Literary Bible (220 entries, literary devices)",
      "Sefaria.org — Hebrew + English text",
      "Open Bible — cross-references",
      "Classic English translations (Wycliffe, Coverdale, Bishops', Geneva, KJV 1611) — Old Testament, public domain",
    ],
    auth: mode === "private"
      ? "Private mode: pass X-API-Key header with all requests"
      : "Public mode: no authentication required",
    example: "/api/bible/verse/Genesis/22/14",
  };
}

const BOOK_ABBR = {
  Genesis: "Gen", Exodus: "Exod", Leviticus: "Lev", Numbers: "Num",
  Deuteronomy: "Deut", Joshua: "Josh", Judges: "Judg", Ruth: "Ruth",
  "1 Samuel": "1Sam", "2 Samuel": "2Sam", "1 Kings": "1Kgs", "2 Kings": "2Kgs",
  "1 Chronicles": "1Chr", "2 Chronicles": "2Chr", Ezra: "Ezra", Nehemiah: "Neh",
  Esther: "Esth", Job: "Job", Psalms: "Ps", Proverbs: "Prov",
  Ecclesiastes: "Eccl", "Song of Songs": "Song", Isaiah: "Isa", Jeremiah: "Jer",
  Lamentations: "Lam", Ezekiel: "Ezek", Daniel: "Dan", Hosea: "Hos",
  Joel: "Joel", Amos: "Amos", Obadiah: "Obad", Jonah: "Jonah",
  Micah: "Mic", Nahum: "Nah", Habakkuk: "Hab", Zephaniah: "Zeph",
  Haggai: "Hag", Zechariah: "Zech", Malachi: "Mal",
};

const TRANSLATIONS = {
  wyc: "Wycliffe Bible (1395)",
  cov: "Coverdale Bible (1535)",
  bis: "Bishops' Bible (1568)",
  gnv: "Geneva Bible (1587)",
  kjv1611: "King James Version (1611)",
};
