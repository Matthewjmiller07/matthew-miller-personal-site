/**
 * Mega Bible API - Cloudflare Worker
 * theothermatthewmiller.com/api/bible/*
 *
 * AUTH MODES (set via wrangler.toml [vars]):
 *   API_MODE = "public"   → anyone can read, no key needed
 *   API_MODE = "private"  → all requests require X-API-Key header
 *   API_MODE = "hybrid"   → public can read; write/admin routes require key (future use)
 *
 * Set your secret key via:
 *   wrangler secret put API_SECRET_KEY
 */

const SUPABASE_URL = "https://qukziojymwlvmrzapgyo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1a3ppb2p5bXdsdm1yemFwZ3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjMxNzAsImV4cCI6MjA2OTYzOTE3MH0.I7oR9fcypn-BKb9AS4d2UlXrgvMbpTQtWySqxgAWGzo";

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In public mode: allow all origins (so your site JS can call it too)
// In private mode: still set CORS but auth blocks unauthorized callers
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    "Content-Type": "application/json",
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);

    // Strip /api/bible prefix if coming through site routing
    // e.g. theothermatthewmiller.com/api/bible/verse/Genesis/1/1
    //   → /api/verse/Genesis/1/1
    let path = url.pathname.replace(/^\/api\/bible/, "/api");

    // ── Auth check ────────────────────────────────────────────────────────────
    const mode = (env.API_MODE || "public").toLowerCase();

    if (mode === "private") {
      const providedKey = request.headers.get("X-API-Key");
      if (!providedKey || providedKey !== env.API_SECRET_KEY) {
        return jsonResponse(
          { error: "Unauthorized", hint: "Pass your key as X-API-Key header" },
          401,
          headers
        );
      }
    }

    // ── Routing ───────────────────────────────────────────────────────────────
    try {
      // Root / docs
      if (path === "/" || path === "/api" || path === "/api/") {
        return jsonResponse(apiDocs(mode), 200, headers);
      }

      // /api/verse/:book/:chapter/:verse
      const verseMatch = path.match(/^\/api\/verse\/(.+)\/(\d+)\/(\d+)$/);
      if (verseMatch) {
        const [, book, chapter, verse] = verseMatch;
        return await handleVerse(decodeURIComponent(book), parseInt(chapter), parseInt(verse), headers);
      }

      // /api/book/:book
      const bookMatch = path.match(/^\/api\/book\/(.+)$/);
      if (bookMatch) {
        return await handleBook(decodeURIComponent(bookMatch[1]), headers);
      }

      // /api/device/:device
      const deviceMatch = path.match(/^\/api\/device\/(.+)$/);
      if (deviceMatch) {
        return await handleDevice(decodeURIComponent(deviceMatch[1]), headers);
      }

      // /api/search?q=
      if (path === "/api/search") {
        const q = url.searchParams.get("q") || "";
        return await handleSearch(q, headers);
      }

      // /api/devices
      if (path === "/api/devices") return await handleListDevices(headers);

      // /api/books
      if (path === "/api/books") return await handleListBooks(headers);

      return jsonResponse({ error: "Not found" }, 404, headers);

    } catch (err) {
      return jsonResponse({ error: err.message }, 500, headers);
    }
  },
};

// ─── Route Handlers ───────────────────────────────────────────────────────────

async function handleVerse(book, chapter, verse, headers) {
  const [tanakhRows, literaryRows, sefaria, crossRefs] = await Promise.allSettled([
    supabaseQuery("Tanakh Annotations", { book, chapter, verse }),
    supabaseQuery("literary_bible", { book, chapter, verse }),
    fetchSefaria(book, chapter, verse),
    fetchCrossRefs(book, chapter, verse),
  ]);

  return jsonResponse({
    reference: { book, chapter, verse },
    sefaria: settled(sefaria),
    annotations: settled(tanakhRows) || [],
    literary_devices: settled(literaryRows) || [],
    cross_references: settled(crossRefs) || [],
  }, 200, headers);
}

async function handleBook(book, headers) {
  const [tanakhRows, literaryRows] = await Promise.allSettled([
    supabaseQuery("Tanakh Annotations", { book }),
    supabaseQuery("literary_bible", { book }),
  ]);

  return jsonResponse({
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

  return jsonResponse({
    device,
    annotations: settled(tanakhRows) || [],
    literary_devices: settled(literaryRows) || [],
  }, 200, headers);
}

async function handleSearch(q, headers) {
  if (!q || q.length < 2) {
    return jsonResponse({ error: "Query too short — use ?q=your+search+term" }, 400, headers);
  }

  const [tanakhRows, literaryRows] = await Promise.allSettled([
    supabaseSearch("Tanakh Annotations", q),
    supabaseSearch("literary_bible", q),
  ]);

  return jsonResponse({
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

  return jsonResponse({ devices: [...combined].filter(Boolean).sort() }, 200, headers);
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

  return jsonResponse({ books: [...combined].filter(Boolean).sort() }, 200, headers);
}

// ─── Supabase Helpers ─────────────────────────────────────────────────────────

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

// ─── External APIs ────────────────────────────────────────────────────────────

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

// ─── Utilities ────────────────────────────────────────────────────────────────

function settled(result) {
  return result.status === "fulfilled" ? result.value : null;
}

function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function apiDocs(mode) {
  return {
    name: "Mega Bible API",
    author: "Matthew Miller — theothermatthewmiller.com",
    mode,
    description: "Unified Tanakh annotation and literary analysis API combining personal scholarship with Sefaria and Open Bible data.",
    endpoints: {
      "GET /api/bible/verse/:book/:chapter/:verse": "Verse text (Hebrew + English), annotations, literary devices, cross-references",
      "GET /api/bible/book/:book":                  "All annotations for a book",
      "GET /api/bible/device/:device":              "All verses tagged with a literary device",
      "GET /api/bible/search?q=":                   "Full-text search across comments, words, and notes",
      "GET /api/bible/devices":                     "List all literary devices in the database",
      "GET /api/bible/books":                       "List all annotated books",
    },
    sources: [
      "Tanakh Annotations (217 entries, personal scholarship)",
      "Literary Bible (220 entries, literary devices)",
      "Sefaria.org — Hebrew + English text",
      "Open Bible — cross-references",
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
