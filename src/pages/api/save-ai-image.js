export const prerender = false;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

export async function POST({ request }) {
  try {
    const { imageUrl, prompt = '', page = '', model = '' } = await request.json();
    if (!imageUrl) return new Response(JSON.stringify({ error: 'imageUrl required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // Download image from Replicate and re-upload to Supabase storage for permanence
    let savedUrl = imageUrl;
    try {
      const imgResp = await fetch(imageUrl);
      if (imgResp.ok) {
        const buf = Buffer.from(await imgResp.arrayBuffer());
        const ext = imageUrl.includes('.png') ? 'png' : 'webp';
        const filename = `ai-matthew/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('schedule-images')
          .upload(filename, buf, { contentType: `image/${ext}`, upsert: false });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('schedule-images').getPublicUrl(filename);
          savedUrl = publicUrl;
        }
      }
    } catch { /* keep imageUrl if upload fails */ }

    const { error } = await supabase.from('ai_images').insert({
      image_url: savedUrl,
      prompt: prompt.slice(0, 1000),
      page,
      model,
    });
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true, savedUrl }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
