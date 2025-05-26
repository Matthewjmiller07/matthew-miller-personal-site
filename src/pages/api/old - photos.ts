import type { APIRoute } from 'astro';
import axios from 'axios';

const albumMap: Record<string, string> = {
  matthew: 'AIX4u03uYapVCROiKswpayU8OafPksFGsy_sA8G8ebCp69pZdPH_gBxplRuVZHLmb1LDAHsi5ao1',
  aiRoshHashanah: 'AIX4u00wr0Rc67oSatu7a3A_Hl5yRLRCp9moTOGs_SO2h_ye6GISLXmcor_A3-WsgTkIvgPjaTBF',
};

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Method 1: Use the url parameter directly
    let albumKey = url.searchParams.get('album');
    
    // Method 2: Parse from request.url manually
    if (!albumKey) {
      const requestUrl = new URL(request.url);
      albumKey = requestUrl.searchParams.get('album');
    }
    
    // Method 3: Regex extraction as fallback
    if (!albumKey) {
      const match = request.url.match(/[?&]album=([^&]+)/);
      albumKey = match ? decodeURIComponent(match[1]) : null;
    }
    
    // Default fallback
    albumKey = albumKey || 'matthew';
    
    const albumId = albumMap[albumKey];

    console.log('=== API REQUEST DEBUG ===');
    console.log('🔗 Full URL:', request.url);
    console.log('🔍 URL object:', url);
    console.log('🔍 URL Search Params (from url param):', url?.searchParams?.toString());
    console.log('🔍 URL Search Params (from request):', new URL(request.url).searchParams.toString());
    console.log('🎯 Resolved Album Key:', albumKey);
    console.log('🆔 Mapped Album ID:', albumId);

    if (!albumId) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid album key', 
          availableKeys: Object.keys(albumMap),
          requestedKey: albumKey,
          fullUrl: request.url
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: import.meta.env.GOOGLE_CLIENT_ID,
      client_secret: import.meta.env.GOOGLE_CLIENT_SECRET,
      refresh_token: import.meta.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });

    const accessToken = tokenRes.data.access_token;

    const mediaRes = await axios.post(
      'https://photoslibrary.googleapis.com/v1/mediaItems:search',
      { 
        albumId: albumId,
        pageSize: 50 
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      }
    );
    
    const mediaItems = mediaRes.data.mediaItems || [];
    const images = mediaItems.filter(item => item.baseUrl && item.mimeType?.startsWith('image/'));

    console.log('✅ Successfully returning', images.length, 'images for album:', albumKey);
    console.log('🔍 First image ID:', images[0]?.id);
    console.log('=== END API REQUEST DEBUG ===\n');

    return new Response(JSON.stringify(images), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Album-Key': albumKey,
        'X-Album-Id': albumId,
        'X-Image-Count': images.length.toString()
      },
    });

  } catch (error) {
    console.error('❌ API Error:', error?.response?.data || error.message);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch photos', 
        details: error?.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};