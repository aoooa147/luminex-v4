import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/game/storage';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

export const POST = withErrorHandler(async (request: NextRequest) => {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    logger.error('Failed to parse request body', { error }, 'game/cooldown/check');
    return createErrorResponse('Invalid JSON in request body', 'INVALID_JSON', 400);
  }
  
  const { address, gameId } = body;

  logger.info('Cooldown check API called', {
    address,
    gameId,
    hasAddress: !!address,
    hasGameId: !!gameId,
    addressType: typeof address,
    gameIdType: typeof gameId,
    bodyKeys: Object.keys(body || {})
  }, 'game/cooldown/check');

  // Validate required fields
  const bodyValidation = validateBody(body, ['address', 'gameId']);
  if (!bodyValidation.valid) {
    logger.error('Missing required fields', {
      missing: bodyValidation.missing,
      body
    }, 'game/cooldown/check');
    return createErrorResponse(
      `Missing required fields: ${bodyValidation.missing?.join(', ')}`,
      'MISSING_FIELDS',
      400
    );
  }

  // Validate address format
  if (!isValidAddress(address)) {
    logger.error('Invalid address format', { address, addressType: typeof address }, 'game/cooldown/check');
    return createErrorResponse(`Invalid address format: ${address}`, 'INVALID_ADDRESS', 400);
  }

  // Global cooldown: playing ANY game locks ALL games for 24 hours
  const cooldowns = readJSON<Record<string, number>>('game_cooldowns_global', {});
  const addressLower = address.toLowerCase();

  // Get the last time this user played ANY game
  const lastPlayTime = cooldowns[addressLower] || 0;
  const now = Date.now();
  const timeSinceLastPlay = now - lastPlayTime;
  const isOnCooldown = timeSinceLastPlay < COOLDOWN_MS;
  const remainingMs = Math.max(0, COOLDOWN_MS - timeSinceLastPlay);
  const remainingHours = remainingMs / (60 * 60 * 1000);
  const remainingMinutes = (remainingMs % (60 * 60 * 1000)) / (60 * 1000);

  logger.debug('Cooldown checked', { address: addressLower, gameId, isOnCooldown }, 'game/cooldown/check');

  return createSuccessResponse({
    ok: true,
    isOnCooldown,
    lastPlayTime,
    remainingMs,
    remainingHours: Math.floor(remainingHours),
    remainingMinutes: Math.floor(remainingMinutes),
    canPlay: !isOnCooldown,
    lastPlayedGame: 'any' // Indicate this is a global cooldown
  });
}, 'game/cooldown/check');
