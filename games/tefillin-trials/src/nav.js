// Deep links into the game, and keeping the address bar in step with where you are.
//   ?level=stand | gauntlet | catch | table   (aliases below)  → straight into that level
//   ?shiur=4 or ?world=2                                       → that shiur's world (its level, or the shul)
//   ?leaderboard                                               → open the leaderboard
// Debug flags (?nopost, ?nofx, …) are left alone.
import { SHIURIM } from './content.js';

export const LEVEL_IDS = ['gauntlet', 'catch', 'table', 'stand'];
const ALIASES = {
  hefsek: 'gauntlet', gauntlet: 'gauntlet', kaddish: 'gauntlet',
  catch: 'catch', bracha: 'catch', brachot: 'catch', rashi: 'catch',
  table: 'table', hum: 'table', niggun: 'table', shabbat: 'table',
  stand: 'stand', 'yad-keha': 'stand', yadkeha: 'stand', arm: 'stand',
};

export const shiurFor = (level) => SHIURIM.find((s) => s.levels.some((l) => l.id === level));

/** Where the URL says to start: { screen, leaderboard }. */
export function fromUrl(search = typeof location !== 'undefined' ? location.search : '') {
  const q = new URLSearchParams(search);
  let screen = null;
  const level = ALIASES[(q.get('level') || '').toLowerCase()];
  if (level) screen = level;
  else {
    const n = Number(q.get('shiur'));
    const w = Number(q.get('world'));
    const s = SHIURIM.find((x) => (n && x.shiur === n) || (w && x.world === w));
    // A world with one level opens it; a world with several opens the shul with its portals.
    if (s) screen = s.levels.length === 1 ? s.levels[0].id : 'hub';
  }
  return { screen, leaderboard: q.has('leaderboard') };
}

/** Rewrite ?level= / ?shiur= to match the screen, keeping any other params. */
export function syncUrl(screen) {
  if (typeof history === 'undefined') return;
  const q = new URLSearchParams(location.search);
  for (const k of ['level', 'shiur', 'world']) q.delete(k);
  if (LEVEL_IDS.includes(screen)) q.set('level', screen);
  const s = q.toString();
  const next = location.pathname + (s ? `?${s.replace(/=(&|$)/g, '$1')}` : '') + location.hash;
  if (next !== location.pathname + location.search + location.hash) history.replaceState(null, '', next);
}

/** A shareable link to a level. */
export const levelLink = (level) => `${location.origin}${location.pathname}?level=${level}`;
