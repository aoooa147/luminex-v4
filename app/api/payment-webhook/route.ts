import { NextRequest, NextResponse } from 'next/server';

import { takeToken } from '@/lib/utils/rateLimit';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  
  if (!takeToken(ip, 20, 2)) {
    return createErrorResponse('Too many requests', 'RATE_LIMIT', 429);
  }
  
  const body = await request.json();
  logger.info('Payment webhook received', { body, ip }, 'payment-webhook');
  
  return NextResponse.json({ ok: true });
}, 'payment-webhook');
