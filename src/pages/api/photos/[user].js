import { getCachedData } from '../../../lib/redis-client';

export async function get({ params }) {
  const { user } = params;
  
  // Define cache key based on user param
  const cacheKey = `photos:${user}`;
  
  // Function to fetch photos when cache misses
  const fetchPhotos = async () => {
    // Original API logic - this is what would have run server-side
    const apiUrl = import.meta.env.PROD 
      ? `https://theothermatthewmiller.com/api/photos/${user}` 
      : `http://localhost:4321/api/photos/${user}`;
      
    console.log(`Fetching photos from ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }
    
    return await response.json();
  };
  
  try {
    // Get from cache or fetch fresh with 1-hour expiration
    const photos = await getCachedData(cacheKey, fetchPhotos, 3600);
    
    return new Response(JSON.stringify(photos), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600' // Browser can cache for 10 minutes
      }
    });
  } catch (error) {
    console.error(`Error fetching photos for ${user}:`, error);
    
    return new Response(JSON.stringify({ error: 'Failed to fetch photos', message: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
