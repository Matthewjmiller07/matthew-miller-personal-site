// Random facts that live in Supabase (random_facts table).
// The anon key can only read rows with status = 'published'.
import { createClient } from '@supabase/supabase-js';

export interface RandomFact {
  id: string;
  fact: string;
  details: string | null;
  tags: string[];
  researched_by: string | null;
  sources: string[];
  created_at: string;
}

function db() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function listFacts(limit = 100): Promise<RandomFact[]> {
  const client = db();
  if (!client) return [];
  const { data, error } = await client
    .from('random_facts')
    .select('id, fact, details, tags, researched_by, sources, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as RandomFact[];
}
