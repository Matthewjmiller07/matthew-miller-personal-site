export const prerender = false;

/**
 * Aptonym certificates (see aptonym-certificates-supabase-setup.sql).
 *
 *   POST { action: 'submit', name, part, profession, fits, proof, linkedin, email }
 *        → { code, claim }   the claimant's private status link is /aptonyms/certificate/<code>?t=<claim>
 *   POST { action: 'redeem', token, email?, linkedin? }
 *        → { code, claim }   a personal invite link for someone already in the registry: issued on the spot
 *   POST { action: 'decide', code, key, decision: 'issue'|'decline', part?, profession?, fits?, note? }
 *        → { status }        used by the review page linked from Matthew's email
 *
 * Both go through security-definer RPCs with the anon key; the table itself is closed. After either,
 * the aptonym-notify workflow is started so the email (to Matthew, or to the holder) goes out now
 * rather than at the hourly run.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const DISPATCH_TOKEN = import.meta.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_DISPATCH_TOKEN;
const NOTIFY_URL =
  'https://api.github.com/repos/Matthewjmiller07/matthew-miller-personal-site/actions/workflows/aptonym-notify.yml/dispatches';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PARTS = new Set(['First', 'Last', 'Both']);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const str = (v, max) => String(v ?? '').trim().slice(0, max);

/** Keep only http(s) links; anything else is dropped rather than stored. */
function url(v) {
  const s = str(v, 500);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.toString() : null;
  } catch {
    return null;
  }
}

async function notify() {
  if (!DISPATCH_TOKEN) return;
  try {
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DISPATCH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // The hourly run picks it up.
  }
}

export async function POST({ request }) {
  if (!SUPABASE_URL || !ANON_KEY) return json({ error: 'Not configured on the server.' }, 500);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  if (body?.action === 'submit') {
    // Honeypot: real visitors never see or fill the `website` field.
    if (body.website) return json({ code: null });
    const name = str(body.name, 120);
    const profession = str(body.profession, 200);
    const fits = str(body.fits, 1000);
    const email = str(body.email, 200).toLowerCase();
    if (!name || name.split(/\s+/).length < 2) return json({ error: 'Please give your full name, as it should appear on the certificate.' }, 400);
    if (!PARTS.has(body.part)) return json({ error: 'Pick which part of your name is the aptonym.' }, 400);
    if (!profession) return json({ error: 'What do you do? That’s the other half of the aptonym.' }, 400);
    if (fits.length < 10) return json({ error: 'Tell us, in a sentence, how your name fits what you do.' }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: 'That email address doesn’t look right.' }, 400);
    const linkedin = url(body.linkedin);
    if (body.linkedin && (!linkedin || !/(^|\.)linkedin\.com$/i.test(new URL(linkedin).hostname)))
      return json({ error: 'The LinkedIn field should be a linkedin.com/in/… link.' }, 400);

    const { data, error } = await supabase.rpc('aptonym_claim_submit', {
      p_name: name,
      p_part: body.part,
      p_profession: profession,
      p_fits: fits,
      p_proof: url(body.proof),
      p_linkedin: linkedin,
      p_email: email,
    });
    if (error) {
      const busy = /too many/.test(error.message || '');
      return json({ error: busy ? 'You already have claims waiting for review. Hang tight!' : 'Couldn’t send that just now. Please try again.' }, busy ? 429 : 500);
    }
    await notify();
    const row = Array.isArray(data) ? data[0] : data;
    return json({ code: row.code, claim: row.claim_token });
  }

  if (body?.action === 'redeem') {
    const email = str(body.email, 200).toLowerCase();
    if (email && !EMAIL_RE.test(email)) return json({ error: 'That email address doesn’t look right.' }, 400);
    const linkedin = url(body.linkedin);
    if (body.linkedin && (!linkedin || !/(^|\.)linkedin\.com$/i.test(new URL(linkedin).hostname)))
      return json({ error: 'The LinkedIn field should be a linkedin.com/in/… link.' }, 400);
    const { data, error } = await supabase.rpc('aptonym_invite_redeem', {
      p_token: str(body.token, 64),
      p_email: email || null,
      p_linkedin: linkedin,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return json({ error: 'That invite link isn’t valid.' }, 403);
    await notify();
    return json({ code: row.code, claim: row.claim_token });
  }

  if (body?.action === 'decide') {
    const decision = body.decision === 'issue' ? 'issue' : body.decision === 'decline' ? 'decline' : null;
    if (!decision) return json({ error: 'Pick issue or decline.' }, 400);
    const { data, error } = await supabase.rpc('aptonym_claim_decide', {
      p_code: str(body.code, 40),
      p_key: str(body.key, 64),
      p_decision: decision,
      p_part: PARTS.has(body.part) ? body.part : null,
      p_profession: str(body.profession, 200) || null,
      p_fits: str(body.fits, 1000) || null,
      p_note: str(body.note, 1000) || null,
    });
    if (error) return json({ error: /forbidden/.test(error.message || '') ? 'That review link isn’t valid.' : 'Couldn’t save that.' }, 403);
    await notify();
    return json({ status: data });
  }

  return json({ error: 'Unknown action.' }, 400);
}
