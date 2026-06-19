// Supabase database webhook receiver for the coffee project.
// Supabase fires a POST here on INSERT to the `sources` table.
// If the new source is Hebrew/Aramaic and lacks a translation, we call a
// HuggingFace LLM to generate one and write it back via the service-role key.
//
// Required env vars:
//   COFFEE_WEBHOOK_SECRET        — shared secret set in the Supabase trigger function
//   COFFEE_SUPABASE_SERVICE_KEY  — service-role (secret) key for the coffee project
//   HF_TOKEN                     — HuggingFace token (already set in Netlify)

export const prerender = false;

const COFFEE_SB_URL = 'https://knbyyykfwwlgnizutqyb.supabase.co/rest/v1';
const HF_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
const HF_API = `https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`;

function env(key) {
  return process.env[key] || import.meta.env?.[key] || '';
}

async function enrichSource(record) {
  const hfToken = env('HF_TOKEN');
  if (!hfToken) return null;

  const needsTranslation =
    !record.translation && (record.language === 'Hebrew' || record.language === 'Aramaic');

  if (!needsTranslation) return null;

  let userMessage;
  if (record.original_text) {
    userMessage =
      `Translate this ${record.language} halachic text into clear, readable English. ` +
      `Source: "${record.short_name}" (${record.full_name}${record.author ? `, by ${record.author}` : ''}). ` +
      `Return ONLY the English translation — no preamble, no notes.\n\n${record.original_text}`;
  } else {
    userMessage =
      `This is a ${record.language} responsum or halachic source: ` +
      `"${record.short_name}" — ${record.full_name}${record.author ? ` by ${record.author}` : ''}. ` +
      `Write a concise 1–2 sentence English summary of what this text discusses, ` +
      `specifically in relation to coffee in Jewish law. Return ONLY the summary.`;
  }

  const res = await fetch(HF_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a scholar of Jewish law and Hebrew texts. You translate and summarize halachic sources accurately and concisely.',
        },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 512,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    console.error('[coffee-enrich] HuggingFace error:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) return null;

  return { translation: text, translation_model: HF_MODEL };
}

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
  if (!res.ok) {
    console.error('[coffee-enrich] Supabase PATCH error:', res.status, await res.text());
  }
  return res.ok;
}

export async function POST({ request }) {
  // Verify shared secret
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
    return new Response(
      JSON.stringify({ enriched: false, reason: 'no service key' }),
      { status: 200 }
    );
  }

  const enrichment = await enrichSource(record);
  if (!enrichment) {
    return new Response(
      JSON.stringify({ enriched: false, reason: 'not needed or enrichment skipped' }),
      { status: 200 }
    );
  }

  const tags = Array.from(new Set([...(record.tags || []), 'claude-enriched']));
  const ok = await patchSource(record.id, { ...enrichment, tags }, serviceKey);

  console.log('[coffee-enrich] Patch result:', ok, 'for', record.id);
  return new Response(JSON.stringify({ enriched: ok }), { status: 200 });
}
