import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { env } from '@/lib/utils/env';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

const BodySchema = z.object({ payload: z.any(), nonce: z.string().optional() });

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return createErrorResponse('Too many requests', 'RATE_LIMIT', 429);
  }

  const body = await request.json();
  const { payload, nonce } = BodySchema.parse(body);

  const { verifySiweMessage } = await import('@worldcoin/minikit-js');
  const result = await verifySiweMessage(payload, nonce || '');

  logger.info('SIWE verification', { isValid: result.isValid, ip }, 'complete-siwe');

  return NextResponse.json({ 
    status: 'ok', 
    isValid: result.isValid,
    siweMessageData: result.siweMessageData
  });
}, 'complete-siwe');
