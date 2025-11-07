/**
 * API Handler Utilities
 * Wrapper functions for consistent API error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { isValidAddress } from './validation';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  context?: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error: any) {
      logger.error('API handler error', error, context);
      
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Internal server error';
      const code = error.code || 'INTERNAL_ERROR';

      return NextResponse.json(
        {
          success: false,
          error: code,
          message,
        },
        { status: statusCode }
      );
    }
  };
}

/**
 * Validate request body has required fields
 */
export function validateBody<T extends Record<string, any>>(
  body: any,
  requiredFields: (keyof T)[]
): { valid: boolean; missing?: string[] } {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    if (!body || body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(String(field));
    }
  }

  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Validate wallet addresses in request
 */
export function validateAddresses(addresses: string[]): { valid: boolean; invalid?: string[] } {
  const invalid: string[] = [];
  
  for (const address of addresses) {
    if (!isValidAddress(address)) {
      invalid.push(address);
    }
  }

  return {
    valid: invalid.length === 0,
    invalid: invalid.length > 0 ? invalid : undefined,
  };
}

/**
 * Create error response
 */
export function createErrorResponse(
  message: string,
  code: string = 'ERROR',
  statusCode: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: code,
      message,
    },
    { status: statusCode }
  );
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(typeof data === 'object' ? data : { data }),
    },
    { status: statusCode }
  );
}

