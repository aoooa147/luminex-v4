/**
 * Redis Cache Client (with in-memory fallback)
 * Supports Redis for production and in-memory cache for development
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

// In-memory cache fallback
const memoryCache = new Map<string, { value: any; expires: number }>();

/**
 * Get value from cache
 */
export async function getCache<T>(key: string, options?: CacheOptions): Promise<T | null> {
  const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
  
  try {
    // Try Redis first (if available)
    if (process.env.REDIS_URL) {
      // Redis implementation would go here
      // For now, fallback to memory cache
    }
    
    // Fallback to in-memory cache
    const cached = memoryCache.get(fullKey);
    if (cached && cached.expires > Date.now()) {
      return cached.value as T;
    }
    
    // Expired or not found
    if (cached) {
      memoryCache.delete(fullKey);
    }
    
    return null;
  } catch (error) {
    console.warn('[cache] Error getting cache:', error);
    return null;
  }
}

/**
 * Set value in cache
 */
export async function setCache(
  key: string,
  value: any,
  options?: CacheOptions
): Promise<void> {
  const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
  const ttl = options?.ttl || 300; // Default 5 minutes
  const expires = Date.now() + (ttl * 1000);
  
  try {
    // Try Redis first (if available)
    if (process.env.REDIS_URL) {
      // Redis implementation would go here
      // For now, fallback to memory cache
    }
    
    // Fallback to in-memory cache
    memoryCache.set(fullKey, { value, expires });
    
    // Cleanup expired entries periodically
    if (memoryCache.size > 1000) {
      cleanupExpired();
    }
  } catch (error) {
    console.warn('[cache] Error setting cache:', error);
  }
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string, options?: CacheOptions): Promise<void> {
  const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
  
  try {
    // Try Redis first (if available)
    if (process.env.REDIS_URL) {
      // Redis implementation would go here
    }
    
    // Fallback to in-memory cache
    memoryCache.delete(fullKey);
  } catch (error) {
    console.warn('[cache] Error deleting cache:', error);
  }
}

/**
 * Clear all cache with prefix
 */
export async function clearCachePrefix(prefix: string): Promise<void> {
  try {
    if (process.env.REDIS_URL) {
      // Redis implementation would go here
    }
    
    // Fallback to in-memory cache
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  } catch (error) {
    console.warn('[cache] Error clearing cache prefix:', error);
  }
}

/**
 * Cleanup expired entries
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expires <= now) {
      memoryCache.delete(key);
    }
  }
}

// Periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpired, 5 * 60 * 1000);
}

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: CacheOptions & { keyGenerator?: (args: Parameters<T>) => string }
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = options?.keyGenerator
      ? options.keyGenerator(args)
      : `fn:${fn.name}:${JSON.stringify(args)}`;
    
    // Try cache first
    const cached = await getCache<ReturnType<T>>(key, options);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function
    const result = await fn(...args);
    
    // Store in cache
    await setCache(key, result, options);
    
    return result;
  }) as T;
}

