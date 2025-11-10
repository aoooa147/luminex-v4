import { NextRequest } from 'next/server';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import { readJSON, writeJSON } from '@/lib/game/storage';

export const runtime = 'nodejs';

const FAUCET_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const FAUCET_AMOUNT = 1; // 1 LUX

export const POST = withErrorHandler(async (request: NextRequest) => {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    logger.error('Failed to parse request body', { error }, 'faucet/init');
    return createErrorResponse('Invalid JSON in request body', 'INVALID_JSON', 400);
  }
  
  const { address } = body;

  logger.info('Faucet init API called', {
    address,
    hasAddress: !!address,
    addressType: typeof address
  }, 'faucet/init');

  // Validate required fields
  const bodyValidation = validateBody(body, ['address']);
  if (!bodyValidation.valid) {
    logger.error('Missing required fields', {
      missing: bodyValidation.missing,
      body
    }, 'faucet/init');
    return createErrorResponse(
      `Missing required fields: ${bodyValidation.missing?.join(', ')}`,
      'MISSING_FIELDS',
      400
    );
  }

  // Validate address format
  if (!isValidAddress(address)) {
    logger.error('Invalid address format', { address, addressType: typeof address }, 'faucet/init');
    return createErrorResponse(`Invalid address format: ${address}`, 'INVALID_ADDRESS', 400);
  }

  const addressLower = address.toLowerCase();

  // Check faucet cooldown
  const faucetCooldowns = readJSON<Record<string, number>>('faucet_cooldowns', {});
  const lastClaimTime = faucetCooldowns[addressLower] || 0;
  const now = Date.now();
  const timeSinceLastClaim = now - lastClaimTime;
  const isOnCooldown = timeSinceLastClaim < FAUCET_COOLDOWN_MS;

  if (isOnCooldown) {
    const remainingMs = FAUCET_COOLDOWN_MS - timeSinceLastClaim;
    const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    
    logger.warn('Faucet on cooldown', {
      address: addressLower,
      remainingHours,
      remainingMinutes
    }, 'faucet/init');
    
    return createErrorResponse(
      `Faucet is on cooldown. Please wait ${remainingHours}h ${remainingMinutes}m.`,
      'FAUCET_COOLDOWN',
      400
    );
  }

  // Check if reference already exists (prevent duplicate init calls)
  const faucetClaims = readJSON<Record<string, { reference?: string; claimed?: boolean; timestamp?: number }>>('faucet_claims', {});
  const existingClaim = faucetClaims[addressLower];

  if (existingClaim?.reference && !existingClaim.claimed) {
    logger.info('Reference already exists for faucet claim, returning existing reference', {
      address: addressLower,
      existingReference: existingClaim.reference
    }, 'faucet/init');
    
    // Return existing reference instead of creating a new one
    const responseData = {
      ok: true,
      success: true,
      reference: existingClaim.reference,
      amount: FAUCET_AMOUNT,
      message: 'Using existing transaction reference'
    };
    
    logger.info('Returning existing reference', {
      address: addressLower,
      reference: existingClaim.reference,
      responseData
    }, 'faucet/init');
    
    return createSuccessResponse(responseData);
  }

  // Generate reference ID for transaction
  const reference = (globalThis.crypto || require('crypto').webcrypto).randomUUID().replace(/-/g, '');
  
  // Store reference in faucet claims
  if (!faucetClaims[addressLower]) {
    faucetClaims[addressLower] = {};
  }
  faucetClaims[addressLower].reference = reference;
  faucetClaims[addressLower].timestamp = now;
  writeJSON('faucet_claims', faucetClaims);

  logger.success('Faucet transaction initiated', {
    address: addressLower,
    amount: FAUCET_AMOUNT,
    reference
  }, 'faucet/init');

  const responseData = {
    ok: true,
    success: true,
    reference,
    amount: FAUCET_AMOUNT,
    message: 'Transaction reference created successfully'
  };
  
  logger.info('Returning init response', {
    address: addressLower,
    amount: FAUCET_AMOUNT,
    reference,
    responseData
  }, 'faucet/init');
  
  return createSuccessResponse(responseData);
}, 'faucet/init');

