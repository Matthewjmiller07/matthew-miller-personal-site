// Balashon (balashon.com, David Curwin's "Hebrew Language Detective") files its posts under a
// label per parasha, e.g. "Parashat Noach". It's a Blogger blog, so the labels and each label's
// posts come from the public Blogger JSON feeds. Fetched live at request time (the build
// machines can't always reach it), and the page sets a CDN cache so Blogger sees ~1 hit a day.
const BASE = 'https://www.balashon.com';

export interface BalashonPost {
  title: string;
  url: string;
  published: string; // ISO
  he: string | null; // first Hebrew word in the post, usually the word it's about
  excerpt: string; // plain text, trimmed to a word budget by the page
  words: number; // length of the whole post
  otherParshiot: string[]; // other parasha labels the post is filed under
}

export interface BalashonWeek {
  label: string | null; // the matched Blogger label, e.g. "Parashat Noach"
  labelUrl: string;
  posts: BalashonPost[];
  error?: string;
}

const PARSHA_LABEL = /^parash?at\s+|^parshat\s+/i;

// A spelling-insensitive skeleton for transliterations: Bereishit/Breishit/Bereshit,
// Behaalotcha/Beha'alotecha, Chukat/Chukkat, Vayetzei/Vayetze and Pinchas/Pinhas all collapse.
export function skeleton(name: string) {
  return name
    .toLowerCase()
    .replace(PARSHA_LABEL, '')
    .replace(/[^a-z]/g, '')
    .replace(/[ck]h/g, 'h')
    .replace(/t[sz]/g, 'z')
    .replace(/ck/g, 'k')
    .replace(/w/g, 'v')
    .replace(/[aeiouy]/g, '')
    .replace(/(.)\1+/g, '$1');
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Balashon feed answered ${res.status}`);
  return res.json();
}

let labelCache: { at: number; labels: string[] } | null = null;

async function parshaLabels(): Promise<string[]> {
  if (labelCache && Date.now() - labelCache.at < 6 * 3600_000) return labelCache.labels;
  // max-results=0 returns just the feed header, whose category list is every label on the blog.
  const data = await getJson(`${BASE}/feeds/posts/summary?alt=json&max-results=0`);
  const labels = (data.feed?.category ?? []).map((c: { term: string }) => c.term).filter((t: string) => PARSHA_LABEL.test(t));
  labelCache = { at: Date.now(), labels };
  return labels;
}

export function matchLabel(parsha: string, labels: string[]) {
  const want = skeleton(parsha);
  return labels.find((l) => skeleton(l) === want) ?? null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function toText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export function trimWords(text: string, n: number) {
  const words = text.split(/\s+/);
  if (words.length <= n) return text;
  return `${words.slice(0, n).join(' ').replace(/[,;:.\-–—]+$/, '')}…`;
}

export async function balashonFor(parsha: string): Promise<BalashonWeek> {
  let label: string | null = null;
  try {
    label = matchLabel(parsha, await parshaLabels());
    if (!label) {
      return { label: null, labelUrl: `${BASE}/search?q=${encodeURIComponent(parsha)}`, posts: [] };
    }
    const labelUrl = `${BASE}/search/label/${encodeURIComponent(label)}`;
    const data = await getJson(`${BASE}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=60`);
    const posts: BalashonPost[] = (data.feed?.entry ?? []).map((e: any) => {
      const text = toText(e.content?.$t ?? e.summary?.$t ?? '');
      return {
        title: toText(e.title?.$t ?? ''),
        url: (e.link ?? []).find((l: any) => l.rel === 'alternate')?.href ?? labelUrl,
        published: e.published?.$t ?? '',
        he: text.match(/[א-ת][֑-ׇא-ת'"״׳]*/)?.[0] ?? null,
        excerpt: text.replace(/\n+/g, ' '),
        words: text.split(/\s+/).length,
        otherParshiot: (e.category ?? [])
          .map((c: { term: string }) => c.term)
          .filter((t: string) => PARSHA_LABEL.test(t) && t !== label)
          .map((t: string) => t.replace(PARSHA_LABEL, '')),
      };
    });
    // Oldest first: the blog's own order of discovery, and it puts the classics up front.
    posts.sort((a, b) => a.published.localeCompare(b.published));
    return { label, labelUrl, posts };
  } catch (err) {
    return {
      label,
      labelUrl: label ? `${BASE}/search/label/${encodeURIComponent(label)}` : BASE,
      posts: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
