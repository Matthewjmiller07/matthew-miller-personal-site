// Backfill existing coffee sources with Sefaria text + HF translation.
// Run: node scripts/backfill-coffee-sources.mjs
// Needs: COFFEE_SUPABASE_SERVICE_KEY and HF_TOKEN in .env

import 'dotenv/config';

const SB_URL = 'https://knbyyykfwwlgnizutqyb.supabase.co/rest/v1';
const SERVICE_KEY = process.env.COFFEE_SUPABASE_SERVICE_KEY;
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
const HF_API = `https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SERVICE_KEY) { console.error('Missing COFFEE_SUPABASE_SERVICE_KEY'); process.exit(1); }

// ── helpers ────────────────────────────────────────────────────────────────

function flattenText(arr) {
  if (!arr) return '';
  if (typeof arr === 'string') return arr.replace(/<[^>]+>/g, '').trim();
  return arr.flat(Infinity)
    .map(s => typeof s === 'string' ? s.replace(/<[^>]+>/g, '').trim() : '')
    .filter(Boolean).join(' ');
}

// Common book-name normalizations to match Sefaria's index names
const SEFARIA_NAMES = {
  'Aruch Hashulchan YD': 'Aruch HaShulchan, Yoreh Deah',
  'Aruch Hashulchan OC': 'Aruch HaShulchan, Orach Chayim',
  'Aruch Hashulchan EH': 'Aruch HaShulchan, Even HaEzer',
  'Aruch HaShulchan YD': 'Aruch HaShulchan, Yoreh Deah',
  'Igros Moshe OC': 'Igrot Moshe, Orach Chayim',
  'Igros Moshe YD': 'Igrot Moshe, Yoreh Deah',
  'Igrot Moshe OC': 'Igrot Moshe, Orach Chayim',
  'Shulchan Aruch OC': 'Shulchan Aruch, Orach Chayim',
  'Shulchan Aruch YD': 'Shulchan Aruch, Yoreh Deah',
  'Orach Chayim': 'Shulchan Aruch, Orach Chayim',
  'Ben Ish Chai': 'Ben Ish Hai',
  'Mishna Berura': 'Mishnah Berurah',
  'Mishneh LaMelech': 'Mishneh LaMelech',
  'Pri Chadash YD': 'Pri Chadash, Yoreh Deah',
  'Pri Chadash OC': 'Pri Chadash, Orach Chayim',
  'Minchas Yitzchak': 'Minchat Yitzchak',
};

function toSefariaRef(shortName) {
  let s = shortName
    .replace(/\s*\(cited in.*?\)/gi, '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/—.*$/, '')
    .trim();

  // Try known name mappings first (longest match wins)
  for (const [alias, canonical] of Object.entries(SEFARIA_NAMES).sort((a,b) => b[0].length - a[0].length)) {
    if (s.startsWith(alias)) {
      s = s.replace(alias, canonical);
      break;
    }
  }

  let m = s.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (m) return `${m[1].replace(/\s+/g, '_')}.${m[2]}.${m[3]}`;
  m = s.match(/^(.+?)\s+(\d+)$/);
  if (m) return `${m[1].replace(/\s+/g, '_')}.${m[2]}`;
  return s.replace(/\s+/g, '_');
}

async function lookupSefaria(shortName) {
  const ref = toSefariaRef(shortName);
  try {
    const res = await fetch(
      `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=he&version=primary`,
      { headers: { 'User-Agent': 'coffee-backfill/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || data.statusCode === 404) return null;

    const heText = flattenText(data.he);
    const enText = flattenText(data.text);
    const url = data.url
      ? `https://www.sefaria.org${data.url}`
      : `https://www.sefaria.org/${encodeURIComponent(ref)}`;

    return { original_text: heText || null, translation: enText || null, url, ref: data.ref || ref };
  } catch { return null; }
}

async function translateWithHF(record, heText) {
  if (!HF_TOKEN || !heText) return null;
  const lang = record.language || 'Hebrew';
  const prompt =
    `Translate this ${lang} halachic text into clear, readable English. ` +
    `Source: "${record.short_name}" (${record.full_name}${record.author ? `, by ${record.author}` : ''}). ` +
    `Return ONLY the English translation — no preamble.\n\n${heText}`;

  let res;
  try {
    res = await fetch(HF_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: 'system', content: 'You are a scholar of Jewish law. Translate halachic texts accurately.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 768, temperature: 0.3,
      }),
    });
  } catch (e) {
    console.log(`  HF unreachable (${e.cause?.code || e.message}) — skipping translation`);
    return null;
  }
  if (!res.ok) { console.error('  HF error:', res.status); return null; }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function resolveAuthorId(authorText) {
  if (!authorText) return null;
  const clean = authorText.replace(/\(.*?\)/g, '').trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 4 && !/^(rabbi|rav|the|and)$/i.test(w));
  if (!words.length) return null;
  const keyword = encodeURIComponent(words[words.length - 1]);
  try {
    const res = await fetch(
      `${SB_URL}/authors?name=ilike.*${keyword}*&select=id&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0]?.id || null;
  } catch { return null; }
}

async function patchSource(id, patch) {
  if (DRY_RUN) { console.log('  [dry-run] would patch:', Object.keys(patch)); return true; }
  const res = await fetch(`${SB_URL}/sources?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) console.error('  PATCH error:', res.status, await res.text());
  return res.ok;
}

// ── main ───────────────────────────────────────────────────────────────────

const res = await fetch(
  `${SB_URL}/sources?select=id,short_name,full_name,author,author_id,language,url,original_text,translation,tags&order=language.asc,short_name.asc`,
  { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
);
const sources = await res.json();

const candidates = sources.filter(s =>
  (s.language === 'Hebrew' || s.language === 'Aramaic') &&
  (!s.url || !s.original_text || !s.translation)
);

console.log(`Found ${candidates.length} Hebrew/Aramaic sources needing enrichment.`);
if (DRY_RUN) console.log('[DRY RUN — no writes]');

let enriched = 0, sefariaHit = 0, hfUsed = 0, skipped = 0;

for (const source of candidates) {
  console.log(`\n→ ${source.short_name}`);
  const patch = {};
  const tags = new Set(source.tags || []);

  // 1. Try Sefaria
  const sf = await lookupSefaria(source.short_name);
  if (sf) {
    console.log(`  ✓ Sefaria: ${sf.ref}`);
    sefariaHit++;
    if (!source.url && sf.url) { patch.url = sf.url; console.log(`  url → ${sf.url}`); }
    if (!source.original_text && sf.original_text) {
      patch.original_text = sf.original_text.slice(0, 3000); // cap length
      console.log(`  original_text → ${patch.original_text.slice(0, 80)}…`);
    }
    if (!source.translation) {
      if (sf.translation) {
        patch.translation = sf.translation.slice(0, 3000);
        patch.translation_model = 'sefaria';
        tags.add('sefaria');
        console.log(`  translation (Sefaria) → ${patch.translation.slice(0, 80)}…`);
      } else {
        const heText = sf.original_text || source.original_text;
        if (heText && !DRY_RUN) {
          const t = await translateWithHF(source, heText);
          if (t) {
            patch.translation = t;
            patch.translation_model = HF_MODEL;
            hfUsed++;
            console.log(`  translation (HF) → ${t.slice(0, 80)}…`);
          }
        } else if (heText) {
          console.log(`  [dry-run] would translate with HF`);
        }
      }
    }
  } else if (source.original_text && !source.translation) {
    // No Sefaria, but has Hebrew — translate
    if (!DRY_RUN) {
      const t = await translateWithHF(source, source.original_text);
      if (t) {
        patch.translation = t;
        patch.translation_model = HF_MODEL;
        hfUsed++;
        console.log(`  translation (HF, no Sefaria) → ${t.slice(0, 80)}…`);
      }
    } else {
      console.log(`  [dry-run] would translate original_text with HF`);
    }
  } else {
    console.log('  – no Sefaria hit, no original_text to translate');
    skipped++;
  }

  // Auto-link author_id if missing
  if (!source.author_id && source.author) {
    const authorId = await resolveAuthorId(source.author);
    if (authorId) { patch.author_id = authorId; console.log(`  author_id → ${authorId}`); }
  }

  if (Object.keys(patch).length > 0) {
    if (patch.translation_model) tags.add('claude-enriched');
    patch.tags = [...tags];
    await patchSource(source.id, patch);
    enriched++;
    // Brief pause to avoid rate-limiting
    await new Promise(r => setTimeout(r, 400));
  }
}

console.log(`\nDone. Enriched: ${enriched} | Sefaria hits: ${sefariaHit} | HF translations: ${hfUsed} | Skipped: ${skipped}`);
