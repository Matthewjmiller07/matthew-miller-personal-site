export const prerender = false;
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = 'torah-audio';

export async function POST({ request }) {
  try {
    const { date, schedule = 'default', ext = 'mp3' } = await request.json();

    if (!date) {
      return new Response(JSON.stringify({ error: 'Missing date' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const filename = `${date}/${schedule}-${Date.now()}.${ext}`;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(filename);

    if (error) throw new Error(error.message);

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    return new Response(JSON.stringify({ signedUrl: data.signedUrl, filename, publicUrl }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating signed upload URL:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
