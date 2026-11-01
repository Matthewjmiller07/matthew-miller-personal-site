// The bookshelf at /books: Supabase `books` (see books-supabase-setup.sql).
// Reads use the anon key; writes go through /api/books with the service role.
// resolveBookLink() turns a pasted link (archive.org, HebrewBooks.org, a PDF) or an ISBN into
// book details, so adding a book is usually one paste.
import { createClient } from '@supabase/supabase-js';

export const BOOK_STATUSES = ['shelf', 'digital', 'gone'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];
export const DIGITAL_SOURCES = ['archive', 'hebrewbooks', 'pdf', 'other'] as const;
export type DigitalSource = (typeof DIGITAL_SOURCES)[number];

export interface Book {
  id: string;
  title: string;
  title_he: string | null;
  author: string | null;
  year: string | null;
  language: string | null;
  isbn: string | null;
  status: BookStatus;
  digital_source: DigitalSource | null;
  digital_id: string | null;
  digital_url: string | null;
  pdf_url: string | null;
  cover_url: string | null;
  notes: string | null;
  tags: string[];
  parted_on: string | null;
  created_at: string;
  updated_at: string;
}

export type BookDetails = Partial<Omit<Book, 'id' | 'created_at' | 'updated_at'>> & { warning?: string };

function client(key?: string) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const k = key || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !k) return null;
  return createClient(url, k, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Writes need the service role; never fall back to the anon key, which can only read.
export function booksWriter() {
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? client(key) : null;
}

export async function listBooks(): Promise<Book[]> {
  const db = client();
  if (!db) return [];
  const { data, error } = await db.from('books').select('*').order('created_at', { ascending: false }).limit(5000);
  if (error || !data) return [];
  return data as Book[];
}

// ---- Links -----------------------------------------------------------------

const HEBREW = /[֐-׿]/;

export function hebrewBooksLinks(req: string) {
  return {
    page: `https://hebrewbooks.org/${req}`,
    viewer: `https://hebrewbooks.org/pdfpager.aspx?req=${req}&pgnum=1`,
    pdf: `https://download.hebrewbooks.org/downloadhandler.ashx?req=${req}`,
  };
}

export function archiveLinks(id: string) {
  return {
    page: `https://archive.org/details/${id}`,
    embed: `https://archive.org/embed/${id}`,
    cover: `https://archive.org/services/img/${id}`,
  };
}

/** Where a book's "Preview" button should point, for an iframe. */
export function previewUrl(b: Pick<Book, 'digital_source' | 'digital_id' | 'pdf_url' | 'digital_url'>): string | null {
  if (b.digital_source === 'archive' && b.digital_id) return archiveLinks(b.digital_id).embed;
  if (b.digital_source === 'hebrewbooks' && b.digital_id) return hebrewBooksLinks(b.digital_id).viewer;
  if (b.pdf_url) return b.pdf_url;
  return null;
}

/** Work out what a pasted string points at, without touching the network. */
export function parseBookLink(input: string):
  | { kind: 'archive'; id: string }
  | { kind: 'hebrewbooks'; id: string }
  | { kind: 'isbn'; id: string }
  | { kind: 'pdf'; url: string }
  | { kind: 'other'; url: string }
  | null {
  const s = input.trim();
  if (!s) return null;

  const isbn = s.replace(/[\s-]/g, '');
  if (/^(97[89])?\d{9}[\dXx]$/.test(isbn)) return { kind: 'isbn', id: isbn.toUpperCase() };
  if (/^\d{1,7}$/.test(s)) return { kind: 'hebrewbooks', id: s }; // a bare HebrewBooks number

  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'archive.org' || host.endsWith('.archive.org')) {
    // archive.org/details/<id>/…, or a storage-server link like ia800.us.archive.org/12/items/<id>/x.pdf
    const m = u.pathname.match(/^\/(?:details|download|stream|embed|metadata|\d+\/items)\/([^/?#]+)/);
    if (m && !m[1].startsWith('@')) return { kind: 'archive', id: decodeURIComponent(m[1]) };
  }
  if (host === 'hebrewbooks.org' || host.endsWith('.hebrewbooks.org')) {
    const req = u.searchParams.get('req') || u.pathname.match(/^\/(\d+)(?:\/|$)/)?.[1];
    if (req && /^\d+$/.test(req)) return { kind: 'hebrewbooks', id: req };
  }
  if (/\.pdf$/i.test(u.pathname)) return { kind: 'pdf', url: u.toString() };
  return { kind: 'other', url: u.toString() };
}

const UA = { 'User-Agent': 'theothermatthewmiller.com bookshelf (+https://theothermatthewmiller.com/books)' };

async function fetchWithTimeout(url: string, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers: UA, signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

const first = (v: unknown): string | null => {
  const x = Array.isArray(v) ? v[0] : v;
  return x == null || x === '' ? null : String(x);
};

function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Split a title into the English/Hebrew fields the shelf uses. */
function titleFields(title: string | null): Pick<BookDetails, 'title' | 'title_he'> {
  if (!title) return {};
  return HEBREW.test(title) && !/[A-Za-z]{3}/.test(title) ? { title, title_he: title } : { title };
}

async function resolveArchive(id: string): Promise<BookDetails> {
  const links = archiveLinks(id);
  const base: BookDetails = { digital_source: 'archive', digital_id: id, digital_url: links.page, cover_url: links.cover };
  const res = await fetchWithTimeout(`https://archive.org/metadata/${encodeURIComponent(id)}`);
  if (!res.ok) return { ...base, warning: `archive.org answered ${res.status}; details not filled in.` };
  const data: any = await res.json();
  const md = data?.metadata;
  if (!md) return { ...base, warning: 'archive.org has no item with that identifier.' };

  const restricted = String(md['access-restricted-item'] ?? '') === 'true';
  const pdfs = ((data.files ?? []) as any[]).filter(
    (f) => /\.pdf$/i.test(f.name) && f.private !== 'true' && !/encrypted|lcp/i.test(`${f.name} ${f.format}`),
  );
  const pdf = pdfs.find((f) => /text pdf/i.test(f.format)) ?? pdfs.find((f) => f.source === 'original') ?? pdfs[0];
  const pdf_url =
    pdf && !restricted ? `https://archive.org/download/${encodeURIComponent(id)}/${String(pdf.name).split('/').map(encodeURIComponent).join('/')}` : null;

  return {
    ...base,
    ...titleFields(first(md.title)),
    author: Array.isArray(md.creator) ? md.creator.join('; ') : first(md.creator),
    year: first(md.year) ?? first(md.date)?.slice(0, 4) ?? null,
    language: first(md.language),
    pdf_url,
    warning: restricted ? 'This is a borrow-only item on archive.org: it can be read there but has no free PDF.' : pdf_url ? undefined : 'No PDF in this archive.org item; it links to the reader instead.',
  };
}

async function resolveHebrewBooks(req: string): Promise<BookDetails> {
  const links = hebrewBooksLinks(req);
  const base: BookDetails = { digital_source: 'hebrewbooks', digital_id: req, digital_url: links.page, pdf_url: links.pdf, language: 'Hebrew' };
  let html = '';
  try {
    const res = await fetchWithTimeout(links.page);
    if (res.ok) html = await res.text();
  } catch {
    /* fall through to the bare links */
  }
  if (!html) return { ...base, title: `HebrewBooks #${req}`, warning: 'Couldn’t reach HebrewBooks for the title; fill it in by hand.' };

  const meta = (name: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, 'i'))?.[1];
  // Their <title> reads "HebrewBooks.org Sefer Detail: <title> -- <author>".
  const raw = decodeEntities(meta('og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    .replace(/\s+/g, ' ')
    .replace(/^.*?Sefer Detail:\s*/i, '')
    .replace(/^HebrewBooks(?:\.org)?\s*[-:|]\s*/i, '')
    .trim();
  const [title, author] = raw.split(/\s+--\s+/);
  const year = html.match(/(?:Year|שנה)\s*:?\s*<[^>]*>\s*([^<]{2,30})</i)?.[1]?.trim();
  return {
    ...base,
    ...titleFields(title || `HebrewBooks #${req}`),
    author: author?.trim() || null,
    year: year ? decodeEntities(year) : null,
    warning: title ? undefined : 'Couldn’t read the title from HebrewBooks; fill it in by hand.',
  };
}

async function resolveIsbn(isbn: string): Promise<BookDetails> {
  const base: BookDetails = { isbn, cover_url: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false` };
  const res = await fetchWithTimeout(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  if (!res.ok) return { ...base, warning: 'Open Library didn’t answer; fill in the details by hand.' };
  const b: any = (await res.json())[`ISBN:${isbn}`];
  if (!b) return { ...base, cover_url: null, warning: 'Open Library doesn’t know that ISBN; fill in the details by hand.' };
  return {
    ...base,
    ...titleFields(b.subtitle ? `${b.title}: ${b.subtitle}` : b.title),
    author: (b.authors ?? []).map((a: any) => a.name).join('; ') || null,
    year: b.publish_date?.match(/\d{4}/)?.[0] ?? null,
    cover_url: b.cover?.medium ?? null,
  };
}

/** Turn a pasted link or ISBN into book details. Never throws; problems come back as `warning`. */
export async function resolveBookLink(input: string): Promise<BookDetails | null> {
  const parsed = parseBookLink(input);
  if (!parsed) return null;
  try {
    switch (parsed.kind) {
      case 'archive':
        return await resolveArchive(parsed.id);
      case 'hebrewbooks':
        return await resolveHebrewBooks(parsed.id);
      case 'isbn':
        return await resolveIsbn(parsed.id);
      case 'pdf': {
        const name = decodeURIComponent(parsed.url.split('/').pop() || '').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
        return { digital_source: 'pdf', digital_url: parsed.url, pdf_url: parsed.url, ...titleFields(name || null) };
      }
      default:
        return { digital_source: 'other', digital_url: parsed.url };
    }
  } catch (e: any) {
    const id = 'id' in parsed ? parsed.id : null;
    const fallback: BookDetails =
      parsed.kind === 'hebrewbooks'
        ? { digital_source: 'hebrewbooks', digital_id: id, digital_url: hebrewBooksLinks(id!).page, pdf_url: hebrewBooksLinks(id!).pdf, title: `HebrewBooks #${id}` }
        : parsed.kind === 'archive'
          ? { digital_source: 'archive', digital_id: id, digital_url: archiveLinks(id!).page, cover_url: archiveLinks(id!).cover }
          : parsed.kind === 'isbn'
            ? { isbn: id }
            : {};
    return { ...fallback, warning: `Lookup failed (${e?.name === 'AbortError' ? 'timed out' : 'network error'}); fill in the details by hand.` };
  }
}
