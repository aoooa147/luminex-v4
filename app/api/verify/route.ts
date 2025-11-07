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

  const { verifyCloudProof } = await import('@worldcoin/minikit-js');
  if (!env.NEXT_PUBLIC_WORLD_APP_ID) {
    logger.error('Missing NEXT_PUBLIC_WORLD_APP_ID', null, 'verify');
    return createErrorResponse('Missing NEXT_PUBLIC_WORLD_APP_ID', 'MISSING_CONFIG', 500);
  }

  const out = await verifyCloudProof(payload, env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`, action);

  logger.info('World ID verification', { success: out.success, action, ip }, 'verify');

  return NextResponse.json({ success: out.success, detail: out }, { status: out.success ? 200 : 400 });
}, 'verify');
