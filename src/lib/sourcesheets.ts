// Source sheets that live in Supabase (source_sheets + source_sheet_sources, see
// source-sheets-supabase-setup.sql). The anon key can only read published sheets.
// If Supabase is unreachable or the tables don't exist yet, callers get empty results.
import { createClient } from '@supabase/supabase-js';

export interface SheetSource {
  id: string;
  position: number;
  section: string | null;
  ref: string;
  author: string | null;
  he_text: string | null;
  en_text: string | null;
  note: string | null;
  tags: string[];
  video_url: string | null;
  video_start: number | null;
  video_summary: string | null;
  video_transcript: string | null;
}

export interface Sheet {
  id: string;
  slug: string;
  title: string;
  title_he: string | null;
  subtitle: string | null;
  intro: string | null;
  updated_at: string;
  sources?: SheetSource[];
}

function db() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function listSheets(): Promise<(Sheet & { count: number })[]> {
  const client = db();
  if (!client) return [];
  const { data, error } = await client
    .from('source_sheets')
    .select('id, slug, title, title_he, subtitle, intro, updated_at, source_sheet_sources(count)')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data.map(({ source_sheet_sources, ...s }: any) => ({ ...s, count: source_sheet_sources?.[0]?.count ?? 0 }));
}

export async function getSheet(slug: string): Promise<Sheet | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = await client
    .from('source_sheets')
    .select('id, slug, title, title_he, subtitle, intro, updated_at, sources:source_sheet_sources(id, position, section, ref, author, he_text, en_text, note, tags, video_url, video_start, video_summary, video_transcript)')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  const sheet = data as Sheet;
  sheet.sources = [...(sheet.sources ?? [])].sort((a, b) => a.position - b.position);
  return sheet;
}

export const sefariaUrl = (ref: string) => `https://www.sefaria.org/${encodeURI(ref.replace(/ /g, '_'))}`;

// Pull the video id and start time out of any YouTube link (watch, youtu.be, shorts, embed, live).
export function parseYouTube(url: string | null, startOverride?: number | null): { id: string; start: number } | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v');
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?]+)/);
    if (!id && m) id = m[1];
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  let start = startOverride ?? 0;
  if (!start) {
    const t = u.searchParams.get('t') ?? u.searchParams.get('start') ?? '';
    const hms = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
    if (hms) start = (+(hms[1] ?? 0)) * 3600 + (+(hms[2] ?? 0)) * 60 + (+(hms[3] ?? 0));
  }
  return { id, start: start || 0 };
}
