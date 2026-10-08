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
    .select('id, slug, title, title_he, subtitle, intro, updated_at, sources:source_sheet_sources(id, position, section, ref, author, he_text, en_text, note, tags)')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  const sheet = data as Sheet;
  sheet.sources = [...(sheet.sources ?? [])].sort((a, b) => a.position - b.position);
  return sheet;
}

export const sefariaUrl = (ref: string) => `https://www.sefaria.org/${encodeURI(ref.replace(/ /g, '_'))}`;
