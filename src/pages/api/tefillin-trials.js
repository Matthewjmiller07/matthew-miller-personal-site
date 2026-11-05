export const prerender = false;

/**
 * Leaderboard for Hineni: The Tefillin Trials (/tefillin-trials).
 *
 *   GET  /api/tefillin-trials?level=stand[&limit=10]  → best run per player on that level
 *   GET  /api/tefillin-trials                         → the same, for every level: {levels: {stand: [...], ...}}
 *   POST /api/tefillin-trials {player, level, score, stars, minhag} → save a finished run
 *
 * Rows live in Supabase `tefillin_trials_scores` (tefillin-trials-supabase-setup.sql). Reads use the
 * anon key; writes use SUPABASE_SERVICE_ROLE_KEY after the checks below. It's a game for a chabura,
 * so the checks keep out junk and floods rather than a determined cheater.
 */

import { createClient } from '@supabase/supabase-js';

const LEVELS = ['gauntlet', 'catch', 'table', 'stand'];
const MAX_SCORE = 5000;
const TABLE = 'tefillin_trials_scores';

const CORS = { 'Access-Control-Allow-Origin': '*' };
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });

function client(write = false) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const key = write
    ? import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    : import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Names: letters (any script), digits, spaces and a little punctuation; 1-24 characters.
function cleanName(raw) {
  const name = String(raw || '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N} .'’\-_]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
  return name || null;
}

async function top(db, level, limit) {
  // Pull a generous slice and keep each player's best run.
  const { data, error } = await db
    .from(TABLE)
    .select('player, score, stars, minhag, created_at')
    .eq('level', level)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(500);
  if (error || !data) return [];
  const seen = new Set();
  const best = [];
  for (const row of data) {
    const k = row.player.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    best.push(row);
    if (best.length >= limit) break;
  }
  return best;
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}

export async function GET({ url }) {
  const db = client();
  if (!db) return json({ error: 'The leaderboard is not configured on the server.' }, 503);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
  const level = url.searchParams.get('level');
  const cache = { 'Cache-Control': 'public, max-age=15' };
  if (level) {
    if (!LEVELS.includes(level)) return json({ error: `level must be one of ${LEVELS.join(', ')}` }, 400);
    return json({ level, scores: await top(db, level, limit) }, 200, cache);
  }
  const levels = {};
  await Promise.all(LEVELS.map(async (l) => { levels[l] = await top(db, l, limit); }));
  return json({ levels }, 200, cache);
}

// A light per-instance flood guard: at most 10 posts a minute from one address.
const recent = new Map();
function flooded(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 10;
}

export async function POST({ request, clientAddress }) {
  const db = client(true);
  if (!db) return json({ error: 'The leaderboard is not configured on the server.' }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send JSON: {"player": "Moshe", "level": "stand", "score": 420, "stars": 3}' }, 400);
  }
  const ip = request.headers.get('x-nf-client-connection-ip') || clientAddress || 'unknown';
  if (flooded(ip)) return json({ error: 'Too many scores at once. Try again in a minute.' }, 429);

  const player = cleanName(body.player);
  const level = String(body.level || '');
  const score = Math.round(Number(body.score));
  const stars = Math.round(Number(body.stars) || 0);
  const minhag = ['ashkenaz', 'sefard'].includes(body.minhag) ? body.minhag : null;
  if (!player) return json({ error: 'Pick a name (letters and numbers, up to 24).' }, 400);
  if (!LEVELS.includes(level)) return json({ error: `level must be one of ${LEVELS.join(', ')}` }, 400);
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return json({ error: 'That score is off the charts.' }, 400);
  if (stars < 0 || stars > 3) return json({ error: 'stars must be 0-3' }, 400);

  const { error } = await db.from(TABLE).insert({ player, level, score, stars, minhag });
  if (error) return json({ error: 'Could not save the score.' }, 500);

  // Where did it land? Rank among players' best runs.
  const board = await top(db, level, 50);
  const rank = board.findIndex((r) => r.player.toLowerCase() === player.toLowerCase() && r.score === score) + 1 || null;
  return json({ ok: true, rank, scores: board.slice(0, 10) });
}
