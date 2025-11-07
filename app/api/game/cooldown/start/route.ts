import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/game/storage';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { address, gameId } = body;

  // Validate required fields
  const bodyValidation = validateBody(body, ['address', 'gameId']);
  if (!bodyValidation.valid) {
    return createErrorResponse(
      `Missing required fields: ${bodyValidation.missing?.join(', ')}`,
      'MISSING_FIELDS',
      400
    );
  }

  // Validate address format
  if (!isValidAddress(address)) {
    return createErrorResponse('Invalid address format', 'INVALID_ADDRESS', 400);
  }

  // Global cooldown: playing ANY game locks ALL games for 24 hours
  const cooldowns = readJSON<Record<string, number>>('game_cooldowns_global', {});
  const addressLower = address.toLowerCase();

  // Set current time as last play time for ALL games
  cooldowns[addressLower] = Date.now();
  writeJSON('game_cooldowns_global', cooldowns);

  logger.info('Global cooldown started', { address: addressLower, gameId }, 'game/cooldown/start');

  return NextResponse.json({
    ok: true,
    message: 'Global cooldown started - all games locked for 24 hours',
    lastPlayTime: cooldowns[addressLower],
    gameId: 'all' // Indicate all games are locked
  });
}, 'game/cooldown/start');
