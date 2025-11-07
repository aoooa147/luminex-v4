import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { requestId } from '@/lib/utils/requestId';
import { logger } from '@/lib/utils/logger';

const BodySchema = z.object({
  amount: z.string().or(z.number()).transform((v) => Number(v)).refine((n) => !isNaN(n), 'amount must be a number').refine((n) => n > 0, 'amount must be positive').refine((n)=> n >= 0.01, 'amount too small (>= 0.01)'),
  symbol: z.enum(['WLD','USDC']).optional().default('WLD')
});

export async function POST(request: NextRequest) {
  const rid = requestId();
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return NextResponse.json({ success: false, error: 'Too many requests', rid }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { amount, symbol } = BodySchema.parse(body);
    const uuid = (globalThis.crypto || require('crypto').webcrypto).randomUUID().replace(/-/g, '');
    logger.info('Payment initiated', { amount, symbol, reference: uuid, ip }, 'initiate-payment');
    return NextResponse.json({ id: uuid, amount, symbol, message: 'Payment reference created successfully', rid });
  } catch (e: any) {
    logger.warn('Bad request in initiate payment', e, 'initiate-payment');
    return NextResponse.json({ success: false, error: e?.message || 'Bad request', rid }, { status: 400 });
  }
}
