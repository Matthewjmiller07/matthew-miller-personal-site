// Supabase Edge Function "vapi-print-calls" (project qukziojymwlvmrzapgyo).
// Vapi posts its end-of-call report here; we store the call and its extracted quote.
// The assistant sends x-outreach-token, checked against print_outreach_config.webhook_token.
// Deployed with verify_jwt = false (Vapi can't send a Supabase JWT).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: true });

  const { data: cfg } = await db.from('print_outreach_config').select('value').eq('key', 'webhook_token').single();
  if (!cfg || req.headers.get('x-outreach-token') !== cfg.value) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => null);
  const msg = body?.message;
  if (!msg || msg.type !== 'end-of-call-report') return json({ ok: true, ignored: msg?.type ?? null });

  const call = msg.call ?? {};
  const phone: string | null = call.customer?.number ?? msg.customer?.number ?? null;
  const analysis = msg.analysis ?? {};
  const quote = analysis.structuredData ?? null;

  let shopId: number | null = Number(call.metadata?.shop_id ?? msg.assistant?.metadata?.shop_id) || null;
  if (!shopId && phone) {
    const { data: shop } = await db.from('print_shops').select('id').eq('phone', phone).maybeSingle();
    shopId = shop?.id ?? null;
  }

  const started = msg.startedAt ?? call.startedAt ?? null;
  const ended = msg.endedAt ?? call.endedAt ?? null;
  const duration =
    msg.durationSeconds ?? (started && ended ? (Date.parse(ended) - Date.parse(started)) / 1000 : null);

  const { data: row, error } = await db
    .from('print_shop_calls')
    .upsert(
      {
        vapi_call_id: call.id,
        shop_id: shopId,
        phone,
        started_at: started,
        ended_at: ended,
        duration_seconds: duration,
        cost_usd: msg.cost ?? call.cost ?? null,
        ended_reason: msg.endedReason ?? call.endedReason ?? null,
        recording_url: msg.recordingUrl ?? msg.artifact?.recordingUrl ?? msg.artifact?.recording?.mono?.combinedUrl ?? null,
        transcript: msg.transcript ?? msg.artifact?.transcript ?? null,
        summary: analysis.summary ?? null,
        quote,
        raw: msg,
      },
      { onConflict: 'vapi_call_id' },
    )
    .select('id')
    .single();
  if (error) return json({ error: error.message }, 500);

  if (shopId) {
    const answered = duration != null && duration > 20 && !/voicemail|no-answer|busy|failed/i.test(msg.endedReason ?? '');
    const gotPrice = quote && ['price_25', 'price_50', 'price_100', 'price_250', 'unit_price'].some((k) => quote[k] != null);
    const status = quote?.do_not_call ? 'do_not_call' : gotPrice ? 'quoted' : answered ? 'called' : 'no_answer';
    await db.from('print_shops').update({ status, last_called_at: ended ?? new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', shopId);

    if (gotPrice) {
      const { data: shop } = await db.from('print_shops').select('name').eq('id', shopId).single();
      await db.from('print_quotes').insert({
        business_name: shop?.name ?? phone ?? 'unknown',
        contact_name: quote.contact_name ?? null,
        phone,
        email: quote.email ?? null,
        size: quote.size ?? 'pocket',
        price_25: quote.price_25 ?? null,
        price_50: quote.price_50 ?? null,
        price_100: quote.price_100 ?? null,
        price_250: quote.price_250 ?? null,
        lead_time: quote.lead_time ?? null,
        multicolor: quote.multicolor ?? null,
        notes: quote.notes ?? analysis.summary ?? null,
        source: 'call',
        call_id: row.id,
      });
    }
  }
  return json({ ok: true, id: row.id });
});
