export const prerender = false;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);
const BUCKET = 'schedule-images';

export async function POST({ request }) {
  try {
    const { imagePath } = await request.json();

    if (!imagePath) {
      return new Response(JSON.stringify({ error: 'Missing imagePath' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // imagePath may be a full public URL or just the storage path
    const storageKey = imagePath.includes('/storage/v1/object/public/' + BUCKET + '/')
      ? imagePath.split('/storage/v1/object/public/' + BUCKET + '/')[1]
      : imagePath;

    const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
