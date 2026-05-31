export const prerender = false;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

export async function POST({ request }) {
  try {
    const { date, notes, verseNotes, sheet: schedule = 'default' } = await request.json();

    if (!date) {
      return new Response(JSON.stringify({ error: 'Missing date' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('schedule_notes')
      .upsert(
        { date, schedule, general_notes: notes || '', verse_notes: verseNotes || {}, updated_at: new Date().toISOString() },
        { onConflict: 'date,schedule' }
      );

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true, message: 'Notes saved' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving notes:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
