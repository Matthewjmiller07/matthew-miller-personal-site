export const prerender = false;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

export async function GET({ url }) {
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const page_filter = url.searchParams.get('page') || null;

  let query = supabase
    .from('ai_images')
    .select('id, image_url, prompt, page, model, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (page_filter) query = query.eq('page', page_filter);

  const { data, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
