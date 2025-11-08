/**
 * Rate Limiter (with in-memory storage)
 * Prevents abuse by limiting requests per IP/user
 */

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: any) => string; // Custom key generator
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiter middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyGenerator } = options;
  
  return async (req: any): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
    // Generate key (default: IP address)
    const key = keyGenerator
      ? keyGenerator(req)
      : getClientIP(req) || 'unknown';
    
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    
    // Check if entry exists and is valid
    if (entry && entry.resetAt > now) {
      // Within window
      if (entry.count >= maxRequests) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          resetAt: entry.resetAt,
        };
      }
      
      // Increment count
      entry.count++;
      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }
    
    // Create new entry or reset expired entry
    const resetAt = now + windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  };
}

/**
 * Get client IP from request
 */
function getClientIP(req: any): string | null {
  if (!req) return null;
  
  // Try various headers
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers?.['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = req.headers?.['cf-connecting-ip'];
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return req.ip || null;
}

/**
 * Cleanup expired rate limit entries
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Periodic cleanup (every minute)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpired, 60 * 1000);
}

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
  // Strict rate limit (100 requests per 15 minutes)
  strict: rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  }),
  
  // Standard rate limit (1000 requests per hour)
  standard: rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000,
  }),
  
  // API rate limit (100 requests per minute)
  api: rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  
  // Game action rate limit (10 actions per minute)
  gameAction: rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),
};

