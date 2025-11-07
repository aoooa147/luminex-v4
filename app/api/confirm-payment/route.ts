import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { env } from '@/lib/utils/env';
import { requestId } from '@/lib/utils/requestId';
import { logger } from '@/lib/utils/logger';

const BodySchema = z.object({ 
  payload: z.union([
    z.object({ transaction_id: z.string(), reference: z.string() }),
    z.object({ transaction_id: z.string().optional(), reference: z.string().optional() }).passthrough()
  ])
});

export async function POST(request: NextRequest) {
  const rid = requestId();
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return NextResponse.json({ success: false, error: 'Too many requests', rid }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = BodySchema.parse(body);
    
    // Extract transaction_id from payload (could be direct or nested)
    // Use type assertion to handle union type
    const payloadAny = parsed.payload as any;
    const transactionId = payloadAny.transaction_id || payloadAny.transactionId;
    
    if (!transactionId) {
      logger.warn('Missing transaction_id in payload', { payload: payloadAny }, 'confirm-payment');
      return NextResponse.json({
        success: false,
        error: 'Missing transaction_id in payload',
        code: 'user_cancelled', // Clear error code for client to handle
        rid
      }, { status: 400 });
    }
    
    if (!env.WORLD_API_KEY || !env.NEXT_PUBLIC_WORLD_APP_ID) {
      return NextResponse.json({ 
        success: false, 
        error: 'Server missing WORLD_API_KEY or NEXT_PUBLIC_WORLD_APP_ID', 
        rid 
      }, { status: 500 });
    }

    const url = `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${encodeURIComponent(env.NEXT_PUBLIC_WORLD_APP_ID)}&type=miniapp`;

    const controller = () => {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 10000);
      return { signal: ac.signal, cancel: () => clearTimeout(t) };
    };

    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < maxAttempts) {
      attempt++;
      const c = controller();
      try {
        const r = await fetch(url, { headers: { Authorization: `Api-Key ${env.WORLD_API_KEY}` }, signal: c.signal });
        c.cancel();
        if (r.ok) {
          const data = await r.json();
          const ref = payloadAny.reference || payloadAny.referenceId || 'unknown';
          logger.info('Payment confirmed', { 
            transactionId, 
            ref, 
            status: data?.transaction_status || data?.status, 
            attempt,
            ip 
          }, 'confirm-payment');
          return NextResponse.json({ success: true, transaction: data, rid });
        } else if (r.status >= 400 && r.status < 500) {
          const text = await r.text();
          logger.warn('Client error from Developer API', { status: r.status, body: text }, 'confirm-payment');
          return NextResponse.json({ 
            success: false, 
            error: 'Developer API 4xx', 
            status: r.status, 
            body: text, 
            rid 
          }, { status: r.status });
        } else {
          lastErr = new Error(`Developer API ${r.status}`);
        }
      } catch (e: any) {
        lastErr = e;
        logger.warn(`Payment confirmation attempt ${attempt} failed`, e, 'confirm-payment');
      }
      await new Promise(r => setTimeout(r, attempt * 500));
    }
    const ref = payloadAny.reference || payloadAny.referenceId || 'unknown';
    logger.error('Payment confirmation failed after all attempts', { 
      transactionId, 
      ref, 
      error: lastErr?.message 
    }, 'confirm-payment');
    return NextResponse.json({ success: false, error: 'Developer API error or timeout', rid }, { status: 502 });
  } catch (e: any) {
    logger.error('Bad request in payment confirmation', e, 'confirm-payment');
    return NextResponse.json({ success: false, error: e?.message || 'Bad request', rid }, { status: 400 });
  }
}
