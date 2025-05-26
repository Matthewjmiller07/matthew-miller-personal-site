// src/pages/api/list-albums.ts
import type { APIRoute } from 'astro';
import axios from 'axios';

export const GET: APIRoute = async () => {
  try {
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: import.meta.env.GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.GOOGLE_CLIENT_SECRET,
        refresh_token: import.meta.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }
    );

    const accessToken = tokenRes.data.access_token;

    const albumsRes = await axios.get('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return new Response(JSON.stringify(albumsRes.data.albums, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (err: any) {
    console.error('API Error:', err.response?.data || err.message);
    return new Response(
      JSON.stringify({ error: err.response?.data || err.message }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};