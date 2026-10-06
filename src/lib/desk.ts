// The newsletter desk: one unlinked place for everything in progress on The Workshop.
// Sources: .md files in writing/desk/, the sent issues and social kits in writing/newsletter/,
// every artifact in the /everything feed, and notes added live from /desk or /api/desk
// (Supabase desk_items). Files are bundled at build time so the desk pages can render on
// request and show new notes immediately.
import { createClient } from '@supabase/supabase-js';
import issues from '../../writing/newsletter/issues.json';
import everything from '../../public/data/everything.json';

export interface DeskItem {
  slug: string;
  title: string;
  date: string;
  status: string;
  tags: string[];
  source: string;
  body: string;
}

export const DESK_STATUSES = ['idea', 'draft', 'ready', 'kit', 'sent'] as const;

const deskFiles = import.meta.glob('/writing/desk/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const newsletterKits = import.meta.glob('/writing/newsletter/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const issueHtml = import.meta.glob('/writing/newsletter/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const basename = (file: string) => file.split('/').pop()!.replace(/\.md$/, '');

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { meta, body: m[2] };
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<(br|\/p|\/h\d|\/li|\/tr|\/div)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&middot;/g, '·')
    .replace(/[ \t]+/g, ' ')
    .replace(/^ +| +$/gm, '')
    .replace(/\n\s*\n\s*(\n\s*)+/g, '\n\n')
    .trim();
}

function firstHeading(body: string): string | undefined {
  return body.match(/^#\s+(.+)$/m)?.[1].trim();
}

// The title is printed as the heading already, so don't repeat a matching H1.
function withoutTitle(body: string, title?: string): string {
  return body.trim().replace(/^#\s+(.+)\r?\n+/, (h, t) => (t.trim() === title ? '' : h));
}

const latestIssueDate = [...issues].map((i) => i.date).sort().pop() ?? '';

function fromMarkdown(file: string, raw: string, defaults: Partial<DeskItem>): DeskItem {
  const { meta, body } = parseFrontmatter(raw);
  const base = basename(file);
  return {
    slug: defaults.slug ?? base,
    title: meta.title || firstHeading(body) || base,
    date: meta.date || defaults.date || latestIssueDate,
    status: meta.status || defaults.status || 'draft',
    tags: (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    source: file.slice(1),
    body: withoutTitle(body, meta.title || firstHeading(body)),
  };
}

function fileItems(): DeskItem[] {
  const items: DeskItem[] = [];
  for (const [file, raw] of Object.entries(deskFiles)) {
    if (basename(file).startsWith('_')) continue;
    items.push(fromMarkdown(file, raw, {}));
  }
  // Sent issues and their social kits already live in writing/newsletter; fold them in
  // so the desk is the whole picture without copying files around.
  for (const [file, raw] of Object.entries(newsletterKits)) {
    items.push(fromMarkdown(file, raw, { slug: `newsletter-${basename(file)}`, status: 'kit' }));
  }
  for (const issue of issues) {
    items.push({
      slug: `issue-${issue.slug}`,
      title: `Issue ${issue.date}: ${issue.title}`,
      date: issue.date,
      status: issue.published ? 'sent' : 'draft',
      tags: ['issue'],
      source: issue.html,
      body: `Subject: ${issue.subject}\nWeb version: https://theothermatthewmiller.com/newsletter/${issue.slug}/\n\n${htmlToText(issueHtml[`/${issue.html}`] ?? '')}`,
    });
  }
  return items;
}

// The /everything feed: every artifact the daily pipelines produced (reels, readers, audio...).
function everythingItems(): DeskItem[] {
  const types = everything.types as Record<string, string>;
  return (everything.entries as any[])
    .filter((e) => e.type !== 'newsletter') // issues are already on the desk in full
    .map((e) => {
      const details = Object.entries(e.details ?? {}).map(([k, v]) => `- ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
      return {
        slug: `everything-${e.id}`,
        title: e.title,
        date: e.date,
        status: 'shipped',
        tags: [e.type],
        source: 'public/data/everything.json',
        body: [types[e.type] ? `Type: ${types[e.type]}` : '', e.url ? `Link: ${e.url}` : '', '', e.summary ?? '', details.length ? `\n${details.join('\n')}` : '']
          .filter((l, i) => l || i === 2)
          .join('\n')
          .trim(),
      };
    });
}

function supabase(key?: string) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const k = key || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !k) return null;
  return createClient(url, k, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Writes need the service role; never fall back to the anon key, which can only read.
export function deskWriter() {
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? supabase(key) : null;
}

// Notes added from /desk or /api/desk. If Supabase isn't reachable the desk still renders.
async function liveItems(): Promise<DeskItem[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.from('desk_items').select('*').order('created_at', { ascending: false }).limit(500);
  if (error || !data) return [];
  return data.map((r) => ({
    slug: `note-${r.id.slice(0, 8)}`,
    title: r.title,
    date: r.created_at.slice(0, 10),
    status: r.status,
    tags: r.tags ?? [],
    source: `added via ${r.source}`,
    body: withoutTitle(r.body, r.title),
  }));
}

export async function loadDesk(): Promise<DeskItem[]> {
  const items = [...fileItems(), ...everythingItems(), ...(await liveItems())];
  return items.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export const DESK_PREAMBLE = `This is Matthew Miller's newsletter desk for The Workshop, a weekly email (https://theothermatthewmiller.com/newsletter).
It collects everything in progress: ideas, drafts, notes on builds, social copy and every sent issue.
Use it as source material when drafting or editing an issue. Items are newest first.
Status values: idea, draft, ready, kit (social copy), sent, shipped (an artifact from the /everything feed).
To add a note: POST JSON {title, body, status?, tags?, source?} to https://theothermatthewmiller.com/api/desk
with the header "Authorization: Bearer <desk passcode>", or paste it into the form at /desk/.`;

export function itemToMarkdown(item: DeskItem): string {
  const meta = [`date: ${item.date}`, `status: ${item.status}`];
  if (item.tags.length) meta.push(`tags: ${item.tags.join(', ')}`);
  meta.push(`source: ${item.source}`);
  return `# ${item.title}\n\n${meta.join(' · ')}\n\n${item.body}\n`;
}
