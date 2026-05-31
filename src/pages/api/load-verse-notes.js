export const prerender = false;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

export async function GET({ url }) {
  const date = url.searchParams.get('date');
  const schedule = url.searchParams.get('schedule') || 'default';

  if (!date) {
    return new Response(JSON.stringify({ error: 'Missing date' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data, error } = await supabase
      .from('schedule_notes')
      .select('general_notes, verse_notes')
      .eq('date', date)
      .eq('schedule', schedule)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({
      notes: data?.general_notes || '',
      verseNotes: data?.verse_notes || {},
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error loading notes:', error);
    return new Response(JSON.stringify({ notes: '', verseNotes: {} }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
}
