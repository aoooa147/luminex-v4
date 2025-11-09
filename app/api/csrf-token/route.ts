import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security/csrf';
import { createSuccessResponse, createErrorResponse, withErrorHandler } from '@/lib/utils/apiHandler';

/**
 * GET /api/csrf-token
 * Generate and return CSRF token for client
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  try {
    const token = generateCSRFToken();
    
    // Create response with token using createSuccessResponse
    const response = createSuccessResponse({
      token,
    });
    
    // Set token in HTTP-only cookie using NextResponse cookies API
    // This should work correctly in both test and production environments
    response.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    return createErrorResponse(
      'Failed to generate CSRF token',
      'CSRF_TOKEN_GENERATION_FAILED',
      500
    );
  }
}, 'csrf-token');

