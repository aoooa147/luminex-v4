/**
 * Security Middleware Utilities
 * Provides security checks for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCSRFToken } from './csrf';
import { sanitizeObject } from './sanitization';
import { logger } from '@/lib/utils/logger';
import { checkSecurityThreats, checkURLThreats, detectSuspiciousActivity } from './threatDetection';
import { logSecurityEvent } from './monitoring';

/**
 * Security middleware options
 */
export interface SecurityMiddlewareOptions {
  requireCSRF?: boolean;
  sanitizeInput?: boolean;
  maxBodySize?: number;
  allowedMethods?: string[];
}

/**
 * Apply security middleware to API route
 */
export async function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
): Promise<(req: NextRequest) => Promise<NextResponse>> {
  const {
    requireCSRF = false,
    sanitizeInput = true,
    maxBodySize = 1024 * 1024, // 1MB default
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Check URL for security threats
      const urlThreats = checkURLThreats(req);
      if (urlThreats.hasThreat) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_REQUEST',
            message: 'Invalid request detected',
          },
          { status: 400 }
        );
      }

      // Detect suspicious activity
      const suspiciousActivity = detectSuspiciousActivity(req);
      if (suspiciousActivity.suspicious) {
        logSecurityEvent(
          req,
          'suspicious_activity',
          'medium',
          `Suspicious activity detected: ${suspiciousActivity.reasons.join(', ')}`,
          {
            reasons: suspiciousActivity.reasons,
            endpoint: req.nextUrl.pathname,
            method: req.method,
          }
        );
      }

      // Check allowed methods
      if (!allowedMethods.includes(req.method)) {
        return NextResponse.json(
          {
            success: false,
            error: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} is not allowed`,
          },
          { status: 405 }
        );
      }

      // CSRF protection
      if (requireCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const csrfCheck = requireCSRFToken(req);
        if (!csrfCheck.valid) {
          logSecurityEvent(
            req,
            'csrf',
            'high',
            'CSRF token validation failed',
            {
              method: req.method,
              path: req.nextUrl.pathname,
              error: csrfCheck.error,
            }
          );
          
          logger.warn('CSRF token validation failed', {
            method: req.method,
            path: req.nextUrl.pathname,
            ip: req.headers.get('x-forwarded-for'),
          }, 'security');
          
          return NextResponse.json(
            {
              success: false,
              error: 'CSRF_TOKEN_INVALID',
              message: csrfCheck.error || 'Invalid CSRF token',
            },
            { status: 403 }
          );
        }
      }

      // Check body size
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > maxBodySize) {
        return NextResponse.json(
          {
            success: false,
            error: 'PAYLOAD_TOO_LARGE',
            message: `Request body exceeds maximum size of ${maxBodySize} bytes`,
          },
          { status: 413 }
        );
      }

      // Sanitize input if needed
      if (sanitizeInput && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        // Note: Request body can only be read once, so we'll sanitize in the handler
        // This is just a placeholder for the concept
      }

      // Call the actual handler
      return await handler(req);
    } catch (error: any) {
      logger.error('Security middleware error', error, 'security');
      
      return NextResponse.json(
        {
          success: false,
          error: 'SECURITY_ERROR',
          message: 'Security check failed',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Validate request origin (basic check)
 */
export function validateOrigin(req: NextRequest, allowedOrigins: string[]): boolean {
  const origin = req.headers.get('origin');
  
  if (!origin) {
    // Same-origin requests don't have origin header
    return true;
  }
  
  return allowedOrigins.some(allowed => origin.startsWith(allowed));
}


