import type { APIRoute } from 'astro';
import axios from 'axios';

export const prerender = false;

const albumMap: Record<string, string> = {
  matthew: 'AIX4u03uYapVCROiKswpayU8OafPksFGsy_sA8G8ebCp69pZdPH_gBxplRuVZHLmb1LDAHsi5ao1',
  aiRoshHashanah: 'AIX4u00EMW3JPS3dK2Ouu5zVvvc_j6sEybHVct4XgfIbItkJsG_koW4IU21H2LpDjE8NwEfEeoRJ',
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const albumKey = params.album || 'matthew';
    const albumId = albumMap[albumKey];

    console.log('=== PATH-BASED API REQUEST ===');
    console.log('🎯 Album Key from path:', albumKey);
    console.log('🆔 Mapped Album ID:', albumId);
    console.log('🗂️ Available Albums:', Object.keys(albumMap));

    if (!albumId) {
      return new Response(
        JSON.stringify({
          error: 'Invalid album key',
          availableKeys: Object.keys(albumMap),
          requestedKey: albumKey,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 🔐 Get fresh access token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: import.meta.env.GOOGLE_CLIENT_ID,
      client_secret: import.meta.env.GOOGLE_CLIENT_SECRET,
      refresh_token: import.meta.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });

    const accessToken = tokenRes.data.access_token;

    // 📸 Fetch all photos using pagination
    let mediaItems: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const res = await axios.post(
        'https://photoslibrary.googleapis.com/v1/mediaItems:search',
        {
          albumId,
          pageSize: 100, // Max allowed
          pageToken: nextPageToken,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.data.mediaItems) {
        mediaItems.push(...res.data.mediaItems);
      }

      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    const images = mediaItems.filter(
      (item) => item.baseUrl && item.mimeType?.startsWith('image/')
    );

    console.log('✅ Returning', images.length, 'images for album:', albumKey);
    console.log('🔍 First image ID:', images[0]?.id);
    console.log('=== END PATH-BASED API REQUEST ===\n');

    return new Response(JSON.stringify(images), {
      headers: {
        'Content-Type': 'application/json',
        'X-Album-Key': albumKey,
        'X-Album-Id': albumId,
        'X-Image-Count': images.length.toString(),
      },
    });
  } catch (error) {
    console.error(
      '❌ Path-based API Error:',
      error?.response?.data || error.message
    );
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch photos',
        details: error?.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};