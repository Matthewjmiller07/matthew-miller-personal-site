export const prerender = false;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);
const BUCKET = 'schedule-images';

export async function POST({ request }) {
  try {
    const { image: dataUrl, date, schedule = 'default' } = await request.json();

    if (!date || !dataUrl) {
      return new Response(JSON.stringify({ error: 'Missing date or image' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/s);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Invalid image data' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const mimeType = match[1];
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const imageBuffer = Buffer.from(match[2], 'base64');
    const filename = `${date}/${schedule}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, imageBuffer, { contentType: mimeType, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    return new Response(JSON.stringify({ success: true, imageUrl: publicUrl }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
