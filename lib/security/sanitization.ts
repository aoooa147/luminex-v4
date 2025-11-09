/**
 * Security Utilities: Input Sanitization and Output Encoding
 * Prevents XSS, SQL injection, and other injection attacks
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes or encodes dangerous characters
 */
export function sanitizeString(input: string | null | undefined, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Truncate to max length
  let sanitized = input.slice(0, maxLength);
  
  // Remove potentially dangerous characters
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, onerror=, etc.)
    .replace(/data:/gi, '') // Remove data: protocol (can be dangerous)
    .trim();
  
  return sanitized;
}

/**
 * Sanitize HTML content (more aggressive)
 */
export function sanitizeHTML(input: string | null | undefined, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.slice(0, maxLength);
  
  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove dangerous attributes and scripts
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim();
  
  return sanitized;
}

/**
 * Sanitize number input (prevent injection via number strings)
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  
  if (typeof input === 'number') {
    // Check for NaN and Infinity
    if (!isFinite(input)) return null;
    return input;
  }
  
  if (typeof input === 'string') {
    // Remove any non-numeric characters except decimal point and minus sign
    const cleaned = input.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    
    if (isNaN(num) || !isFinite(num)) return null;
    return num;
  }
  
  return null;
}

/**
 * Sanitize wallet address (Ethereum address format)
 */
export function sanitizeAddress(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  
  // Remove whitespace and convert to lowercase
  const cleaned = input.trim().toLowerCase();
  
  // Validate Ethereum address format
  if (!/^0x[a-f0-9]{40}$/.test(cleaned)) return null;
  
  return cleaned;
}

/**
 * Sanitize URL input
 */
export function sanitizeURL(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  
  const trimmed = input.trim();
  
  // Only allow http, https protocols
  if (!/^https?:\/\//i.test(trimmed)) return null;
  
  // Remove dangerous characters
  const sanitized = trimmed
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  try {
    // Validate URL format
    new URL(sanitized);
    return sanitized;
  } catch {
    return null;
  }
}

/**
 * HTML entity encoding (prevents XSS)
 */
export function encodeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * JavaScript string encoding (for use in script tags)
 */
export function encodeJS(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * URL encoding (for use in URLs)
 */
export function encodeURL(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  try {
    return encodeURIComponent(input);
  } catch {
    return '';
  }
}

/**
 * Sanitize object recursively (deep sanitization)
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    maxStringLength?: number;
    sanitizeKeys?: boolean;
  } = {}
): T {
  const { maxStringLength = 1000, sanitizeKeys = false } = options;
  
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'string' 
        ? sanitizeString(item, maxStringLength)
        : typeof item === 'object' && item !== null
        ? sanitizeObject(item as Record<string, any>, options)
        : item
    ) as unknown as T;
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = sanitizeKeys ? sanitizeString(key, 100) : key;
    
    if (typeof value === 'string') {
      sanitized[cleanKey] = sanitizeString(value, maxStringLength);
    } else if (typeof value === 'number') {
      sanitized[cleanKey] = sanitizeNumber(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[cleanKey] = sanitizeObject(value as Record<string, any>, options);
    } else {
      sanitized[cleanKey] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Prevent SQL injection by sanitizing SQL-like patterns
 * Note: This is a basic check. Always use parameterized queries with Prisma/ORM.
 */
export function sanitizeSQL(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove SQL injection patterns
  return input
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi, '')
    .replace(/[;'"]/g, '')
    .trim();
}

