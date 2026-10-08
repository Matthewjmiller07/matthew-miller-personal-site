// Latest additions across the Mega readers: the newest devices, notes,
// books & papers, Modern Hebrew notes, NLI evidence and siddur commentary,
// newest first. Read straight from Supabase with the anon key (every table
// here is public-read; unpublished siddur notes are hidden by RLS).
//
// mountLatest(el, opts) renders a filterable list into `el`. Each entry is a
// real link to the deep-linked spot; a page that can open it in place passes
// `onOpen` and returns true to keep the visitor on the page.

export type LatestKind = 'device' | 'note' | 'book' | 'modern' | 'nli' | 'siddur';

export interface LatestItem {
  kind: LatestKind;
  at: string;          // ISO created_at
  ref: string;         // "Genesis 1:3" / "Shacharit › Modeh Ani"
  title: string;
  snippet: string;
  href: string;
  app: 'bible' | 'siddur';
  book?: string; chapter?: number; verse?: number; focus?: string; noteId?: number;
}

export const LATEST_KINDS: Record<LatestKind, { label: string; short: string; color: string }> = {
  device: { label: 'Devices',        short: 'Devices', color: '#c9a257' },
  note:   { label: 'My notes',       short: 'Notes',   color: '#d9c49a' },
  book:   { label: 'Books & papers', short: 'Books',   color: '#b89bd6' },
  modern: { label: 'Modern Hebrew',  short: 'Modern',  color: '#79b8a4' },
  nli:    { label: 'NLI evidence',   short: 'NLI',     color: '#8fb4d9' },
  siddur: { label: 'Siddur',         short: 'Siddur',  color: '#e0a35c' },
};

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

async function rows(table: string, query: string): Promise<any[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

const clip = (s: any, n = 160) => {
  const t = String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
};

function bibleItem(kind: LatestKind, focus: string, r: any, title: string, snippet: string): LatestItem {
  const qs = new URLSearchParams({ book: r.book, chapter: String(r.chapter), verse: String(r.verse), focus });
  return {
    kind, at: r.created_at, ref: `${r.book} ${r.chapter}:${r.verse}`, title, snippet: clip(snippet),
    href: `/mega-bible?${qs}`, app: 'bible', book: r.book, chapter: r.chapter, verse: r.verse, focus,
  };
}

// "Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani" → "Shacharit › Modeh Ani"
function siddurRef(n: any): string {
  if (n.ref) {
    const parts = String(n.ref).split(/,\s*/).slice(1).filter(p => !/^(Weekday|Shabbat)$/i.test(p));
    if (parts.length) return parts.length > 2 ? `${parts[0]} › ${parts[parts.length - 1]}` : parts.join(' › ');
  }
  const name = (n.prayer_names || [])[0];
  return name ? `Every “${name}”` : 'Siddur';
}

export async function fetchLatest(kinds: LatestKind[], limit = 40): Promise<LatestItem[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const want = new Set(kinds);
  const n = String(limit);
  const jobs: Promise<LatestItem[]>[] = [];

  if (want.has('device') || want.has('note') || want.has('book')) {
    jobs.push(rows('literary_bible',
      'select=id,book,chapter,verse,device,words,notes,my_comments,book_paper,book_pages,book_notes,created_at'
      + `&order=created_at.desc&limit=${n}`).then(rs => rs.flatMap(r => {
      const out: LatestItem[] = [];
      if (want.has('device') && r.device) out.push(bibleItem('device', 'devices', r, r.device, [r.words, r.notes].filter(Boolean).join(' — ')));
      if (want.has('note') && r.my_comments) out.push(bibleItem('note', 'notes', r, 'My note', r.my_comments));
      if (want.has('book') && r.book_paper) out.push(bibleItem('book', 'books', r, r.book_paper, [r.book_pages && `pp. ${r.book_pages}`, r.book_notes].filter(Boolean).join(' — ')));
      return out;
    })));
  }
  if (want.has('modern')) {
    jobs.push(rows('Tanakh Annotations',
      'select=id,book,chapter,verse,literary_device,words,comments,created_at&literary_device=ilike.Biblical*'
      + `&order=created_at.desc&limit=${n}`).then(rs => rs.map(r => bibleItem('modern', 'modern', r,
        String(r.literary_device || '').replace(/^Biblical\s*(?:→|->)\s*Modern Hebrew\s*:?\s*/i, '') || 'Modern Hebrew',
        [r.words, r.comments].filter(Boolean).join(' — ')))));
  }
  if (want.has('nli')) {
    jobs.push(rows('tanakh_nli_poster_evidence',
      'select=id,book,chapter,verse,matched_word,nli_title,nli_date_text,modern_context_gloss,created_at'
      + `&order=created_at.desc&limit=${n}`).then(rs => rs.map(r => bibleItem('nli', 'nli', r,
        r.matched_word ? `${r.matched_word} — ${r.nli_title || 'NLI'}` : (r.nli_title || 'NLI evidence'),
        [r.nli_date_text, r.modern_context_gloss].filter(Boolean).join(' · ')))));
  }
  if (want.has('siddur')) {
    jobs.push(rows('siddur_commentary',
      'select=id,ref,segment,prayer_names,kind,title,body,created_at'
      + `&order=created_at.desc&limit=${n}`).then(rs => rs.map(r => ({
        kind: 'siddur' as const, at: r.created_at, ref: siddurRef(r) + (r.segment ? ` ¶${r.segment}` : ''),
        title: r.title || (r.kind ? r.kind[0].toUpperCase() + r.kind.slice(1) : 'Commentary'),
        snippet: clip(r.body), href: `/mega-siddur?note=${r.id}`, app: 'siddur' as const, noteId: r.id,
      }))));
  }

  const all = (await Promise.all(jobs)).flat().filter(x => x.at);
  all.sort((a, b) => b.at.localeCompare(a.at));
  return all.slice(0, limit);
}

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function when(iso: string): string {
  const d = new Date(iso);
  const mins = (Date.now() - d.getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  if (mins < 60 * 24 * 7) return `${Math.round(mins / 1440)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CSS = `
.ml { font-family:var(--display, 'Cormorant Garamond', Georgia, serif); color:var(--text, #e8d4aa); }
.ml-chips { display:flex; flex-wrap:wrap; gap:.3rem; margin-bottom:.6rem; }
.ml.compact .ml-chips { gap:.2rem; }
.ml.compact .ml-chip { padding:.1rem .3rem; letter-spacing:.08em; }
.ml-chip {
  font-family:var(--sc, 'Cormorant SC', Georgia, serif); font-size:.52rem; letter-spacing:.14em; text-transform:uppercase;
  background:none; border:1px solid var(--border, rgba(201,162,87,.15)); color:var(--muted, #8a7a5a);
  padding:.15rem .45rem; cursor:pointer; transition:color .12s, border-color .12s;
}
.ml-chip:hover { color:var(--text, #e8d4aa); }
.ml-chip.on { border-color:var(--gold, #c9a257); color:var(--gold, #c9a257); }
.ml-chip i { font-style:normal; opacity:.6; margin-left:.25rem; }
.ml-list { list-style:none; margin:0; padding:0; }
.ml-item { border-top:1px solid var(--border, rgba(201,162,87,.15)); }
.ml-item:first-child { border-top:none; }
.ml-item a { display:block; padding:.45rem 0 .45rem .6rem; border-left:2px solid var(--ml-c); color:inherit; text-decoration:none; }
.ml-item a:hover { background:rgba(201,162,87,.06); }
.ml-meta { display:flex; flex-wrap:wrap; align-items:baseline; gap:.15rem .5rem; }
.ml-kind { font-family:var(--sc, 'Cormorant SC', Georgia, serif); font-size:.5rem; letter-spacing:.14em; text-transform:uppercase; color:var(--ml-c); }
.ml-ref { font-family:var(--sc, 'Cormorant SC', Georgia, serif); font-size:.62rem; letter-spacing:.06em; color:var(--gold, #c9a257); }
.ml-when { font-family:var(--mono, ui-monospace, monospace); font-size:.55rem; color:var(--muted, #8a7a5a); margin-left:auto; }
.ml-title, .ml-snip { text-align:left; }
.ml-title { font-size:.92rem; line-height:1.35; margin-top:.1rem; overflow-wrap:anywhere; }
.ml-snip { font-size:.8rem; line-height:1.45; color:var(--muted, #8a7a5a); margin-top:.1rem; overflow-wrap:anywhere; }
.ml-empty { font-size:.82rem; font-style:italic; color:var(--muted, #8a7a5a); padding:.3rem 0; }
.ml-more {
  margin-top:.5rem; font-family:var(--sc, 'Cormorant SC', Georgia, serif); font-size:.55rem; letter-spacing:.16em; text-transform:uppercase;
  background:none; border:1px solid var(--border, rgba(201,162,87,.15)); color:var(--muted, #8a7a5a); padding:.25rem .6rem; cursor:pointer;
}
.ml-more:hover { color:var(--gold, #c9a257); border-color:var(--gold, #c9a257); }
.ml.compact .ml-title { font-size:.82rem; }
.ml.compact .ml-snip { font-size:.72rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
`;

export interface MountOpts {
  kinds: LatestKind[];
  limit?: number;      // rows fetched
  show?: number;       // rows shown before "Show more"
  compact?: boolean;
  onOpen?: (item: LatestItem) => boolean | void;
}

export function mountLatest(el: HTMLElement, opts: MountOpts) {
  if (!document.getElementById('ml-css')) {
    const st = document.createElement('style');
    st.id = 'ml-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const step = opts.show ?? 15;
  let items: LatestItem[] = [];
  let filter: LatestKind | 'all' = 'all';
  let shown = step;

  el.classList.add('ml');
  el.classList.toggle('compact', !!opts.compact);
  el.innerHTML = '<div class="ml-empty">Loading the latest…</div>';

  const render = () => {
    const present = opts.kinds.filter(k => items.some(i => i.kind === k));
    const list = filter === 'all' ? items : items.filter(i => i.kind === filter);
    const chip = (k: LatestKind | 'all', label: string, count: number) =>
      `<button type="button" class="ml-chip${filter === k ? ' on' : ''}" data-k="${k}">${esc(label)}<i>${count}</i></button>`;
    el.innerHTML =
      (present.length > 1
        ? `<div class="ml-chips">${chip('all', 'All', items.length)}${present.map(k => chip(k, LATEST_KINDS[k][opts.compact ? 'short' : 'label'], items.filter(i => i.kind === k).length)).join('')}</div>`
        : '')
      + (list.length
        ? `<ul class="ml-list">${list.slice(0, shown).map((it) => `
            <li class="ml-item" style="--ml-c:${LATEST_KINDS[it.kind].color}">
              <a href="${esc(it.href)}" data-i="${items.indexOf(it)}">
                <div class="ml-meta"><span class="ml-kind">${esc(LATEST_KINDS[it.kind].label)}</span><span class="ml-ref">${esc(it.ref)}</span><span class="ml-when" title="${esc(new Date(it.at).toLocaleString())}">${when(it.at)}</span></div>
                <div class="ml-title" dir="auto">${esc(it.title)}</div>
                ${it.snippet ? `<div class="ml-snip" dir="auto">${esc(it.snippet)}</div>` : ''}
              </a>
            </li>`).join('')}</ul>`
          + (list.length > shown ? `<button type="button" class="ml-more">Show more</button>` : '')
        : '<div class="ml-empty">Nothing added yet.</div>');
  };

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const c = t.closest('.ml-chip') as HTMLElement | null;
    if (c) { filter = c.dataset.k as any; shown = step; render(); return; }
    if (t.closest('.ml-more')) { shown += step; render(); return; }
    const a = t.closest('a[data-i]') as HTMLAnchorElement | null;
    if (!a || !opts.onOpen) return;
    const me = e as MouseEvent;
    if (me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
    if (opts.onOpen(items[Number(a.dataset.i)]) === true) e.preventDefault();
  });

  fetchLatest(opts.kinds, opts.limit ?? 60).then((r) => { items = r; render(); });
}
