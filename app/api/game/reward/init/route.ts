import { NextRequest } from 'next/server';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import { readJSON, writeJSON } from '@/lib/game/storage';

export const runtime = 'nodejs';

export const POST = withErrorHandler(async (request: NextRequest) => {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    logger.error('Failed to parse request body', { error }, 'game/reward/init');
    return createErrorResponse('Invalid JSON in request body', 'INVALID_JSON', 400);
  }
  
  const { address, gameId, amount } = body;

  logger.info('Init API called', {
    address,
    gameId,
    amount,
    amountType: typeof amount,
    bodyKeys: Object.keys(body || {})
  }, 'game/reward/init');

  // Validate required fields
  const bodyValidation = validateBody(body, ['address', 'gameId', 'amount']);
  if (!bodyValidation.valid) {
    logger.error('Missing required fields', {
      missing: bodyValidation.missing,
      body
    }, 'game/reward/init');
    return createErrorResponse(
      `Missing required fields: ${bodyValidation.missing?.join(', ')}`,
      'MISSING_FIELDS',
      400
    );
  }

  // Validate address format
  if (!isValidAddress(address)) {
    logger.error('Invalid address format', { address }, 'game/reward/init');
    return createErrorResponse('Invalid address format', 'INVALID_ADDRESS', 400);
  }

  // Validate amount - check for string "0" or number 0
  const amountNum = typeof amount === 'string' ? Number(amount) : amount;
  
  logger.info('Amount validation', {
    originalAmount: amount,
    amountType: typeof amount,
    convertedAmount: amountNum,
    convertedType: typeof amountNum,
    isFinite: Number.isFinite(amountNum),
    isPositive: amountNum > 0
  }, 'game/reward/init');
  
  if (typeof amountNum !== 'number' || !Number.isFinite(amountNum) || amountNum <= 0) {
    logger.error('Invalid amount received', { 
      originalAmount: amount,
      amountType: typeof amount,
      convertedAmount: amountNum,
      convertedType: typeof amountNum,
      address: body.address,
      gameId: body.gameId,
      body
    }, 'game/reward/init');
    return createErrorResponse(
      `Invalid amount: must be a positive number, got: ${amount} (type: ${typeof amount})`,
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

  // Get stored amount first (needed for reference check)
  const storedAmount = rewardInfo.amount;

  // Check if already claimed
  if (rewardInfo.claimed) {
    logger.warn('Reward already claimed', {
      address: addressLower,
      gameId,
      rewardInfo
    }, 'game/reward/init');
    return createErrorResponse(
      'Reward already claimed',
      'ALREADY_CLAIMED',
      400
    );
  }

  // Check if reference already exists (prevent duplicate init calls)
  if (rewardInfo.reference) {
    logger.warn('Reference already exists for this reward', {
      address: addressLower,
      gameId,
      existingReference: rewardInfo.reference,
      rewardInfo
    }, 'game/reward/init');
    // Return existing reference instead of creating a new one
    const responseData = {
      ok: true,
      success: true,
      reference: rewardInfo.reference,
      amount: storedAmount,
      gameId,
      message: 'Using existing transaction reference'
    };
    
    logger.info('Returning existing reference', {
      address: addressLower,
      gameId,
      reference: rewardInfo.reference,
      responseData
    }, 'game/reward/init');
    
    return createSuccessResponse(responseData);
  }

  // Verify reward amount matches
  const requestedAmountNum = typeof amount === 'string' ? Number(amount) : amount;
  
  logger.info('Amount verification', {
    address: addressLower,
    gameId,
    requestedAmount: amount,
    requestedAmountType: typeof amount,
    requestedAmountNum,
    storedAmount,
    storedAmountType: typeof storedAmount,
    match: storedAmount === requestedAmountNum
  }, 'game/reward/init');
  
  if (storedAmount !== requestedAmountNum) {
    logger.error('Reward amount mismatch', {
      address: addressLower,
      gameId,
      requestedAmount: amount,
      requestedAmountType: typeof amount,
      requestedAmountNum,
      storedAmount,
      storedAmountType: typeof storedAmount,
      rewardInfo
    }, 'game/reward/init');
    return createErrorResponse(
      `Reward amount mismatch: stored ${storedAmount}, requested ${amount} (converted: ${requestedAmountNum})`,
      'AMOUNT_MISMATCH',
      400
    );
  }
  
  // Double check stored amount is valid
  if (!storedAmount || storedAmount <= 0 || !Number.isFinite(storedAmount)) {
    logger.error('Invalid stored reward amount', {
      address: addressLower,
      gameId,
      storedAmount,
      storedAmountType: typeof storedAmount,
      rewardInfo
    }, 'game/reward/init');
    return createErrorResponse(
      `Invalid stored reward amount: ${storedAmount}`,
      'INVALID_STORED_AMOUNT',
      500
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

  // Use the numeric amount for response
  const responseAmount = typeof amount === 'string' ? Number(amount) : amount;
  
  const responseData = {
    ok: true,
    success: true,
    reference,
    amount: responseAmount, // Ensure it's a number
    gameId,
    message: 'Transaction reference created successfully'
  };
  
  logger.info('Returning init response', {
    address: addressLower,
    gameId,
    originalAmount: amount,
    responseAmount,
    reference,
    responseData
  }, 'game/reward/init');
  
  return createSuccessResponse(responseData);
}, 'game/reward/init');

