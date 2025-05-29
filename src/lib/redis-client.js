// Redis client for caching
import { createClient } from 'redis';

let client;

/**
 * Get or create a Redis client instance
 */
export async function getRedisClient() {
  if (!client) {
    // Use environment variable for Redis URL or default to localhost
    const redisUrl = import.meta.env.REDIS_URL || 'redis://localhost:6379';
    
    client = createClient({
      url: redisUrl
    });
    
    client.on('error', (err) => {
      console.error('Redis client error:', err);
      client = null; // Reset on error
    });
    
    await client.connect().catch(err => {
      console.error('Redis connection error:', err);
      client = null;
    });
  }
  
  return client;
}

/**
 * Get data from Redis cache or fetch it using the provided function
 * @param {string} key - Redis cache key
 * @param {Function} fetchFn - Function to call if cache miss
 * @param {number} expireTime - Time in seconds to cache the data
 */
export async function getCachedData(key, fetchFn, expireTime = 3600) {
  try {
    const redis = await getRedisClient();
    
    // Try to get from cache first
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      console.log(`Cache hit for ${key}`);
      return JSON.parse(cachedData);
    }
    
    // Cache miss - fetch fresh data
    console.log(`Cache miss for ${key}, fetching data...`);
    const freshData = await fetchFn();
    
    // Store in cache
    await redis.setEx(key, expireTime, JSON.stringify(freshData));
    
    return freshData;
  } catch (error) {
    console.error('Redis cache error:', error);
    // Fallback to direct fetch on cache error
    return fetchFn();
  }
}
