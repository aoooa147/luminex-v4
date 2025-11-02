import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { env } from '@/lib/utils/env';

const BodySchema = z.object({ payload: z.any(), action: z.string() });

export async function POST(request: NextRequest) {
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { payload, action } = BodySchema.parse(body);
    const { verifyCloudProof } = await import('@worldcoin/minikit-js');
    if (!env.NEXT_PUBLIC_WORLD_APP_ID) {
      return NextResponse.json({ success: false, error: 'Missing NEXT_PUBLIC_WORLD_APP_ID' }, { status: 500 });
    }
    const out = await verifyCloudProof(payload, env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`, action);
    return NextResponse.json({ success: out.success, detail: out }, { status: out.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Bad request' }, { status: 400 });
  }
}
