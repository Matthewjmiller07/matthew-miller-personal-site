// Supabase database webhook receiver for the coffee project.
// Fires on INSERT to `sources`. For each new source:
//   1. Try Sefaria API → pull original_text, English translation, and url
//   2. If Sefaria has no English translation, use HuggingFace Llama to generate one
//   3. Patch the row back with whatever we found
//
// Required env vars:
//   COFFEE_WEBHOOK_SECRET        — shared secret in Supabase trigger function
//   COFFEE_SUPABASE_SERVICE_KEY  — service-role key for the coffee project
//   HF_TOKEN                     — HuggingFace token

export const prerender = false;

const COFFEE_SB_URL = 'https://knbyyykfwwlgnizutqyb.supabase.co/rest/v1';
const HF_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
const HF_API = `https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`;

function env(key) {
  return process.env[key] || import.meta.env?.[key] || '';
}

// ── Sefaria helpers ────────────────────────────────────────────────────────

function flattenText(arr) {
  if (!arr) return '';
  if (typeof arr === 'string') return arr.replace(/<[^>]+>/g, '').trim();
  return arr
    .flat(Infinity)
    .map((s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, '').trim() : ''))
    .filter(Boolean)
    .join(' ');
}

// Convert a short_name like "Mishnah Berurah 318:42" → "Mishnah_Berurah.318.42"
function toSefariaRef(shortName) {
  // Strip parenthetical notes and trailing qualifiers
  let s = shortName
    .replace(/\s*\(cited in.*?\)/gi, '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/—.*$/, '')
    .trim();

  // "Book Name X:Y" → Book_Name.X.Y
  let m = s.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (m) return `${m[1].replace(/\s+/g, '_')}.${m[2]}.${m[3]}`;

  // "Book Name X" → Book_Name.X
  m = s.match(/^(.+?)\s+(\d+)$/);
  if (m) return `${m[1].replace(/\s+/g, '_')}.${m[2]}`;

  return s.replace(/\s+/g, '_');
}

async function lookupSefaria(record) {
  const ref = toSefariaRef(record.short_name);
  let res;
  try {
    res = await fetch(
      `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=he&version=primary`,
      { headers: { 'User-Agent': 'coffee-enrich-bot/1.0' } }
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = await res.json();
  if (data.error || data.statusCode === 404) return null;

  const heText = flattenText(data.he);
  const enText = flattenText(data.text);
  const url = data.url
    ? `https://www.sefaria.org${data.url}`
    : `https://www.sefaria.org/${encodeURIComponent(ref)}`;

  return {
    original_text: heText || null,
    translation: enText || null,
    url,
    ref: data.ref || ref,
  };
}

// ── HuggingFace fallback ───────────────────────────────────────────────────

async function translateWithHF(record, heText) {
  const hfToken = env('HF_TOKEN');
  if (!hfToken || !heText) return null;

  const lang = record.language || 'Hebrew';
  const prompt =
    `Translate this ${lang} halachic text into clear, readable English. ` +
    `Source: "${record.short_name}" (${record.full_name}${record.author ? `, by ${record.author}` : ''}). ` +
    `Return ONLY the English translation — no preamble, no notes.\n\n${heText}`;

  const res = await fetch(HF_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a scholar of Jewish law and Hebrew texts. Translate and summarize halachic sources accurately and concisely.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 768,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    console.error('[coffee-enrich] HF error:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// ── Supabase write-back ────────────────────────────────────────────────────

async function patchSource(id, patch, serviceKey) {
  const res = await fetch(`${COFFEE_SB_URL}/sources?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) console.error('[coffee-enrich] PATCH error:', res.status, await res.text());
  return res.ok;
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function POST({ request }) {
  const secret = env('COFFEE_WEBHOOK_SECRET');
  if (secret) {
    const incoming =
      request.headers.get('x-webhook-secret') || request.headers.get('authorization');
    if (incoming !== secret && incoming !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  if (body.type !== 'INSERT' || body.table !== 'sources') {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const record = body.record;
  console.log('[coffee-enrich] New source:', record.id, record.short_name, record.language);

  const serviceKey = env('COFFEE_SUPABASE_SERVICE_KEY');
  if (!serviceKey) {
    console.warn('[coffee-enrich] No service key — skipping write-back');
    return new Response(JSON.stringify({ enriched: false, reason: 'no service key' }), { status: 200 });
  }

  const isHebrewish = record.language === 'Hebrew' || record.language === 'Aramaic';
  const patch = {};
  const tags = new Set(record.tags || []);

  // 1. Try Sefaria
  const sefaria = isHebrewish ? await lookupSefaria(record) : null;

  if (sefaria) {
    console.log('[coffee-enrich] Sefaria found:', sefaria.ref, '→', sefaria.url);
    if (!record.url && sefaria.url) patch.url = sefaria.url;
    if (!record.original_text && sefaria.original_text) patch.original_text = sefaria.original_text;

    if (!record.translation) {
      if (sefaria.translation) {
        patch.translation = sefaria.translation;
        patch.translation_model = 'sefaria';
        tags.add('sefaria');
      } else if (sefaria.original_text || record.original_text) {
        // Sefaria had the Hebrew but no English — use HF
        const hfText = await translateWithHF(record, sefaria.original_text || record.original_text);
        if (hfText) {
          patch.translation = hfText;
          patch.translation_model = HF_MODEL;
        }
      }
    }
  } else if (isHebrewish && !record.translation && record.original_text) {
    // No Sefaria hit, but we have original_text — translate with HF
    const hfText = await translateWithHF(record, record.original_text);
    if (hfText) {
      patch.translation = hfText;
      patch.translation_model = HF_MODEL;
    }
  }

  if (patch.translation_model) tags.add('claude-enriched');

  if (Object.keys(patch).length === 0) {
    return new Response(JSON.stringify({ enriched: false, reason: 'nothing to add' }), { status: 200 });
  }

  patch.tags = [...tags];
  const ok = await patchSource(record.id, patch, serviceKey);
  console.log('[coffee-enrich] Patch result:', ok, JSON.stringify(Object.keys(patch)));
  return new Response(JSON.stringify({ enriched: ok, fields: Object.keys(patch) }), { status: 200 });
}
