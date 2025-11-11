import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { env } from '@/lib/utils/env';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

// Updated to match official example format
interface IRequestPayload {
  payload: any;
  action: string;
  signal: string | undefined;
}

const BodySchema = z.object({ 
  payload: z.any(), 
  action: z.string(),
  signal: z.string().optional()
});

/**
 * This route is used to verify the proof of the user
 * It is critical proofs are verified from the server side
 * Read More: https://docs.world.org/mini-apps/commands/verify#verifying-the-proof
 * Updated to match official example format
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return createErrorResponse('Too many requests', 'RATE_LIMIT', 429);
  }

  const body = await request.json();
  const { payload, action, signal } = BodySchema.parse(body) as IRequestPayload;

  // Check environment variables
  const app_id = env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`;
  if (!app_id || !app_id.startsWith('app_')) {
    logger.error('Missing or invalid NEXT_PUBLIC_WORLD_APP_ID', { action, ip }, 'verify');
    return createErrorResponse('Missing or invalid NEXT_PUBLIC_WORLD_APP_ID', 'MISSING_CONFIG', 500);
  }

  try {
    const { verifyCloudProof } = await import('@worldcoin/minikit-js');
    
    // Validate payload
    if (!payload || typeof payload !== 'object') {
      logger.warn('Invalid payload format', { action, ip, payloadType: typeof payload }, 'verify');
      return createErrorResponse('Invalid payload format', 'INVALID_PAYLOAD', 400);
    }

    // Use same format as official example
    const verifyRes = await verifyCloudProof(
      payload,
      app_id,
      action,
      signal,
    );

    logger.info('World ID verification', { 
      success: verifyRes.success, 
      action, 
      ip,
      signal: signal || null
    }, 'verify');

    if (verifyRes.success) {
      // This is where you should perform backend actions if the verification succeeds
      // Such as, setting a user as "verified" in a database
      return NextResponse.json({ verifyRes, status: 200 });
    } else {
      // This is where you should handle errors from the World ID /verify endpoint.
      // Usually these errors are due to a user having already verified.
      logger.warn('World ID verification failed', { 
        action, 
        ip, 
        verifyRes 
      }, 'verify');
      return NextResponse.json({ verifyRes, status: 400 });
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
