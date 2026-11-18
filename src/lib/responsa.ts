// Responsa received by email, living in Supabase (responsa_rabbis + responsa).
// Questions live in responsa_questions: one question can carry answers from
// several rabbis (/responsa/questions/<slug>), while rabbi pages keep working
// as before (/responsa/<rabbi-slug>). Add a rabbi, a question or an exchange
// in the database and the pages update on the next request. The anon key can
// only read published rows.
// If Supabase is unreachable or the tables don't exist yet, callers get empty results.
import { createClient } from '@supabase/supabase-js';

export interface Rabbi {
  slug: string;
  name: string;
  name_he: string | null;
  bio: string | null;
}

export interface Question {
  id: string;
  slug: string;
  title: string;
  title_he: string | null;
  question_text: string;
  question_lang: 'he' | 'en';
  question_date: string | null;
  note: string | null;
  tags: string[];
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
  question?: { slug: string; title: string } | null;
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
    .select('slug, name, name_he, bio, responsa:responsa(id, rabbi_slug, position, title, title_he, question_text, question_lang, question_date, answer_text, answer_lang, answer_date, followup_text, followup_date, note, tags, question:responsa_questions(slug, title))')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  const rabbi = data as Rabbi & { responsa: Responsum[] };
  // Only published rows belong on the page; the anon policy already filters,
  // but keep the sort deterministic either way.
  rabbi.responsa = [...(rabbi.responsa ?? [])].sort((a, b) => a.position - b.position);
  return rabbi;
}

export async function listQuestions(): Promise<(Question & { answers: number; rabbis: number })[]> {
  const client = db();
  if (!client) return [];
  const { data: qs, error } = await client
    .from('responsa_questions')
    .select('id, slug, title, title_he, question_text, question_lang, question_date, note, tags')
    .eq('status', 'published')
    .order('question_date', { ascending: false });
  if (error || !qs) return [];
  const { data: rows } = await client
    .from('responsa')
    .select('question_id, rabbi_slug, answer_text')
    .eq('status', 'published')
    .not('question_id', 'is', null);
  const counts = new Map<string, { answers: number; rabbis: Set<string> }>();
  for (const r of rows ?? []) {
    const c = counts.get(r.question_id) ?? { answers: 0, rabbis: new Set<string>() };
    if (r.answer_text) c.answers += 1;
    c.rabbis.add(r.rabbi_slug);
    counts.set(r.question_id, c);
  }
  return (qs as Question[]).map((q) => {
    const c = counts.get(q.id) ?? { answers: 0, rabbis: new Set<string>() };
    return { ...q, answers: c.answers, rabbis: c.rabbis.size };
  });
}

export interface QuestionAnswer extends Responsum {
  rabbi_name: string;
}

export async function getQuestion(slug: string): Promise<(Question & { answers: QuestionAnswer[] }) | null> {
  const client = db();
  if (!client) return null;
  const { data: q, error } = await client
    .from('responsa_questions')
    .select('id, slug, title, title_he, question_text, question_lang, question_date, note, tags')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error || !q) return null;
  const { data: rows } = await client
    .from('responsa')
    .select('id, rabbi_slug, position, title, title_he, question_text, question_lang, question_date, answer_text, answer_lang, answer_date, followup_text, followup_date, note, tags, rabbi:responsa_rabbis(name)')
    .eq('question_id', q.id)
    .eq('status', 'published')
    .order('position');
  const answers = ((rows ?? []) as unknown as (Responsum & { rabbi: { name: string } | null })[]).map((r) => ({
    ...r,
    rabbi_name: r.rabbi?.name ?? r.rabbi_slug,
  }));
  return { ...(q as Question), answers };
}
