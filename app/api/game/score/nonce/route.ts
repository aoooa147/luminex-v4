import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { readJSON, writeJSON } from '@/lib/game/storage';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const address = (body?.address || '').toLowerCase();

  if (!address || !isValidAddress(address)) {
    return createErrorResponse('Valid address is required', 'MISSING_ADDRESS', 400);
  }

  const ns = readJSON<Record<string, string>>('nonces', {});
  const nonce = crypto.randomBytes(16).toString('hex');
  ns[address] = nonce;
  writeJSON('nonces', ns);

  logger.debug('Nonce generated', { address }, 'game/score/nonce');

  return NextResponse.json({ ok: true, nonce });
}, 'game/score/nonce');
