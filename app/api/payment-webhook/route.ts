import { NextRequest, NextResponse } from 'next/server';

import { takeToken } from '@/lib/utils/rateLimit';

export async function POST(request: NextRequest) {
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  
  if (!takeToken(ip, 20, 2)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }
  
  try {
    const body = await request.json();
    console.log('[payment-webhook] body=', body);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[payment-webhook] error:', error);
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
