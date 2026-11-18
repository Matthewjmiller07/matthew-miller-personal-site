// Responsa received by email, living in Supabase (responsa_rabbis + responsa).
// Add a rabbi and their exchanges in the database and the pages update on
// the next request. The anon key can only read published rows.
// If Supabase is unreachable or the tables don't exist yet, callers get empty results.
import { createClient } from '@supabase/supabase-js';

export interface Rabbi {
  slug: string;
  name: string;
  name_he: string | null;
  bio: string | null;
}

export interface Responsum {
  id: string;
  rabbi_slug: string;
  position: number;
  title: string;
  title_he: string | null;
  question_text: string;
  question_lang: 'he' | 'en';
  question_date: string | null;
  answer_text: string | null;
  answer_lang: 'he' | 'en' | null;
  answer_date: string | null;
  followup_text: string | null;
  followup_date: string | null;
  note: string | null;
  tags: string[];
}

function db() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function listRabbis(): Promise<(Rabbi & { answered: number; asked: number })[]> {
  const client = db();
  if (!client) return [];
  const { data: rabbis, error } = await client
    .from('responsa_rabbis')
    .select('slug, name, name_he, bio')
    .order('name');
  if (error || !rabbis) return [];
  const { data: rows } = await client
    .from('responsa')
    .select('rabbi_slug, answer_text')
    .eq('status', 'published');
  const counts = new Map<string, { answered: number; asked: number }>();
  for (const r of rows ?? []) {
    const c = counts.get(r.rabbi_slug) ?? { answered: 0, asked: 0 };
    if (r.answer_text) c.answered += 1;
    else c.asked += 1;
    counts.set(r.rabbi_slug, c);
  }
  return rabbis.map((rb) => ({ ...rb, ...(counts.get(rb.slug) ?? { answered: 0, asked: 0 }) }));
}

export async function getRabbi(slug: string): Promise<(Rabbi & { responsa: Responsum[] }) | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = await client
    .from('responsa_rabbis')
    .select('slug, name, name_he, bio, responsa:responsa(id, rabbi_slug, position, title, title_he, question_text, question_lang, question_date, answer_text, answer_lang, answer_date, followup_text, followup_date, note, tags)')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  const rabbi = data as Rabbi & { responsa: Responsum[] };
  // Only published rows belong on the page; the anon policy already filters,
  // but keep the sort deterministic either way.
  rabbi.responsa = [...(rabbi.responsa ?? [])].sort((a, b) => a.position - b.position);
  return rabbi;
}
