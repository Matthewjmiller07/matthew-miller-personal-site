// Talks to the site's /api/tefillin-trials (Supabase behind it).
const API = '/api/tefillin-trials';

export async function fetchBoard(level, limit = 10) {
  const r = await fetch(`${API}?level=${encodeURIComponent(level)}&limit=${limit}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'The leaderboard is unavailable right now.');
  return j.scores || [];
}

export async function postScore(run) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(run) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Could not save the score.');
  return j; // { rank, scores }
}
