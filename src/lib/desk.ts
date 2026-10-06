// The newsletter desk: one unlinked place for everything in progress on The Workshop.
// Sources are every .md file in writing/desk/ plus the drafts and sent issues in
// writing/newsletter/. Pages under /desk/ turn them into a human page and plain-text
// dumps any LLM can fetch in one request.
import fs from 'node:fs';
import path from 'node:path';

export interface DeskItem {
  slug: string;
  title: string;
  date: string;
  status: string;
  tags: string[];
  source: string;
  body: string;
}

const DESK_DIR = 'writing/desk';
const NEWSLETTER_DIR = 'writing/newsletter';

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

function mtimeDate(file: string): string {
  return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

function fromMarkdown(file: string, defaults: Partial<DeskItem>): DeskItem {
  const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
  const base = path.basename(file, '.md');
  return {
    slug: defaults.slug ?? base,
    title: meta.title || firstHeading(body) || base,
    date: meta.date || defaults.date || mtimeDate(file),
    status: meta.status || defaults.status || 'draft',
    tags: (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    source: file,
    // The title is printed as the heading already, so don't repeat a matching H1.
    body: body.trim().replace(/^#\s+.+\r?\n+/, (h) => (h.replace(/^#\s+/, '').trim() === (meta.title || firstHeading(body)) ? '' : h)),
  };
}

export function loadDesk(): DeskItem[] {
  const items: DeskItem[] = [];

  if (fs.existsSync(DESK_DIR)) {
    for (const f of fs.readdirSync(DESK_DIR)) {
      if (!f.endsWith('.md') || f.startsWith('_')) continue;
      items.push(fromMarkdown(path.join(DESK_DIR, f), {}));
    }
  }

  // Sent issues and their social kits already live in writing/newsletter; fold them in
  // so the desk is the whole picture without copying files around.
  for (const f of fs.readdirSync(NEWSLETTER_DIR)) {
    const file = path.join(NEWSLETTER_DIR, f);
    if (f.endsWith('.md')) {
      items.push(fromMarkdown(file, { slug: `newsletter-${path.basename(f, '.md')}`, status: 'kit' }));
    }
  }
  const issues = JSON.parse(fs.readFileSync(path.join(NEWSLETTER_DIR, 'issues.json'), 'utf-8'));
  for (const issue of issues) {
    items.push({
      slug: `issue-${issue.slug}`,
      title: `Issue ${issue.date}: ${issue.title}`,
      date: issue.date,
      status: issue.published ? 'sent' : 'draft',
      tags: ['issue'],
      source: issue.html,
      body: `Subject: ${issue.subject}\nWeb version: https://theothermatthewmiller.com/newsletter/${issue.slug}/\n\n${htmlToText(fs.readFileSync(issue.html, 'utf-8'))}`,
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export const DESK_PREAMBLE = `This is Matthew Miller's newsletter desk for The Workshop, a weekly email (https://theothermatthewmiller.com/newsletter).
It collects everything in progress: ideas, drafts, notes on builds, social copy and every sent issue.
Use it as source material when drafting or editing an issue. Items are newest first.
Status values: idea, draft, ready, kit (social copy), sent.`;

export function itemToMarkdown(item: DeskItem): string {
  const meta = [`date: ${item.date}`, `status: ${item.status}`];
  if (item.tags.length) meta.push(`tags: ${item.tags.join(', ')}`);
  meta.push(`source: ${item.source}`);
  return `# ${item.title}\n\n${meta.join(' · ')}\n\n${item.body}\n`;
}
