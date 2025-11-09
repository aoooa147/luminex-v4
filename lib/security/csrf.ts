/**
 * CSRF Protection Utilities
 * Implements CSRF token generation and validation
 */

import { NextRequest } from 'next/server';

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

/**
 * Generate a secure random CSRF token
 */
export function generateCSRFToken(): string {
  // Use crypto.randomBytes for secure random generation
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // Convert to hex string
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get CSRF token from request cookie
 */
export function getCSRFTokenFromRequest(req: NextRequest): string | null {
  const cookieToken = req.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  return cookieToken || null;
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(req: NextRequest): boolean {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }
  
  // Get token from cookie
  const cookieToken = req.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  
  if (!cookieToken) {
    return false;
  }
  
  // Get token from header
  const headerToken = req.headers.get(CSRF_TOKEN_HEADER);
  
  if (!headerToken) {
    return false;
  }
  
  // Compare tokens (use constant-time comparison to prevent timing attacks)
  return constantTimeCompare(cookieToken, headerToken);
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Set CSRF token in response headers (for client to read)
 */
export function setCSRFTokenHeader(response: Response, token: string): void {
  response.headers.set(CSRF_TOKEN_HEADER, token);
}

/**
 * Middleware to validate CSRF token for API routes
 * Use this in API routes that need CSRF protection
 */
export function requireCSRFToken(req: NextRequest): { valid: boolean; error?: string } {
  const isValid = validateCSRFToken(req);
  
  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid or missing CSRF token',
    };
  }
  
  return { valid: true };
}

