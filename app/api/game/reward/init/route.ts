import { NextRequest } from 'next/server';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import { readJSON, writeJSON } from '@/lib/game/storage';

export const runtime = 'nodejs';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { address, gameId, amount } = body;

  // Validate required fields
  const bodyValidation = validateBody(body, ['address', 'gameId', 'amount']);
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

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
    logger.error('Invalid amount received', { 
      amount, 
      type: typeof amount,
      address: body.address,
      gameId: body.gameId
    }, 'game/reward/init');
    return createErrorResponse(
      `Invalid amount: must be a positive number, got: ${amount}`,
      'INVALID_AMOUNT',
      400
    );
  }

  const addressLower = address.toLowerCase();

  // Check if reward was already calculated
  const rewards = readJSON<Record<string, Record<string, { amount: number; timestamp: number; claimed?: boolean; reference?: string }>>>('game_rewards', {});
  
  if (!rewards[addressLower] || !rewards[addressLower][gameId]) {
    return createErrorResponse(
      'No reward found. Please complete a game first.',
      'NO_REWARD',
      400
    );
  }

  const rewardInfo = rewards[addressLower][gameId];

  // Check if already claimed
  if (rewardInfo.claimed) {
    return createErrorResponse(
      'Reward already claimed',
      'ALREADY_CLAIMED',
      400
    );
  }

  // Verify reward amount matches
  if (rewardInfo.amount !== amount) {
    return createErrorResponse(
      'Reward amount mismatch',
      'AMOUNT_MISMATCH',
      400
    );
  }

  // Generate reference ID for transaction
  const reference = (globalThis.crypto || require('crypto').webcrypto).randomUUID().replace(/-/g, '');
  
  // Store reference in reward info
  rewards[addressLower][gameId].reference = reference;
  writeJSON('game_rewards', rewards);

  logger.success('Game reward transaction initiated', {
    address: addressLower,
    gameId,
    amount,
    reference
  }, 'game/reward/init');

  return createSuccessResponse({
    ok: true,
    reference,
    amount,
    gameId,
    message: 'Transaction reference created successfully'
  });
}, 'game/reward/init');

