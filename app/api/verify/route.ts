import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { env } from '@/lib/utils/env';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

const BodySchema = z.object({ payload: z.any(), action: z.string() });

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return createErrorResponse('Too many requests', 'RATE_LIMIT', 429);
  }

  const body = await request.json();
  const { payload, action } = BodySchema.parse(body);

  // Check environment variables
  if (!env.NEXT_PUBLIC_WORLD_APP_ID) {
    logger.error('Missing NEXT_PUBLIC_WORLD_APP_ID', { action, ip }, 'verify');
    return createErrorResponse('Missing NEXT_PUBLIC_WORLD_APP_ID', 'MISSING_CONFIG', 500);
  }

  // Validate WORLD_APP_ID format
  if (!env.NEXT_PUBLIC_WORLD_APP_ID.startsWith('app_')) {
    logger.error('Invalid NEXT_PUBLIC_WORLD_APP_ID format', { 
      appId: env.NEXT_PUBLIC_WORLD_APP_ID, 
      action, 
      ip 
    }, 'verify');
    return createErrorResponse('Invalid NEXT_PUBLIC_WORLD_APP_ID format', 'INVALID_CONFIG', 500);
  }

  try {
    const { verifyCloudProof } = await import('@worldcoin/minikit-js');
    
    // Validate payload
    if (!payload || typeof payload !== 'object') {
      logger.warn('Invalid payload format', { action, ip, payloadType: typeof payload }, 'verify');
      return createErrorResponse('Invalid payload format', 'INVALID_PAYLOAD', 400);
    }

    const out = await verifyCloudProof(
      payload, 
      env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`, 
      action
    );

    // Type assertion to access properties safely
    const outAny = out as any;

    logger.info('World ID verification', { 
      success: out.success, 
      action, 
      ip,
      detail: outAny.detail || null
    }, 'verify');

    if (out.success) {
      return createSuccessResponse({ success: true, detail: out });
    } else {
      // Provide more detailed error message
      const errorMessage = outAny.error || outAny.detail?.error || 'Verification failed';
      logger.warn('World ID verification failed', { 
        action, 
        ip, 
        error: errorMessage,
        detail: outAny.detail 
      }, 'verify');
      return createErrorResponse(
        errorMessage || 'Verification failed', 
        'VERIFICATION_FAILED', 
        400
      );
    }
  } catch (error: any) {
    logger.error('World ID verification error', { 
      action, 
      ip, 
      error: error.message,
      stack: error.stack 
    }, 'verify');
    return createErrorResponse(
      error.message || 'Verification error', 
      'VERIFICATION_ERROR', 
      500
    );
  }
}, 'verify');
