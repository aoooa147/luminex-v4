import { NextRequest, NextResponse } from 'next/server';
import { takeToken } from '@/lib/utils/rateLimit';
import { TREASURY_ADDRESS } from '@/lib/utils/constants';
import { ethers } from 'ethers';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

// In-memory storage for membership status
// In production, use a database (PostgreSQL, MongoDB, etc.)
const membershipStorage = new Map<string, { tier: string; purchaseDate: number; txHash?: string }>();

interface PurchaseRequest {
  address: string;
  tier: string;
  transactionHash: string;
  amount: string;
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = (req.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return createErrorResponse('Too many requests', 'RATE_LIMIT', 429);
  }

  const body = await req.json() as PurchaseRequest;
  const { address, tier, transactionHash, amount } = body;

  // Validate required fields
  const bodyValidation = validateBody(body, ['address', 'tier', 'transactionHash']);
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

  // Validate tier
  const validTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  if (!validTiers.includes(tier.toLowerCase())) {
    return createErrorResponse('Invalid membership tier', 'INVALID_TIER', 400);
  }

  // Store membership purchase
  membershipStorage.set(address.toLowerCase(), {
    tier: tier.toLowerCase(),
    purchaseDate: Date.now(),
    txHash: transactionHash
  });

  logger.success('Membership purchased', {
    address,
    tier: tier.toLowerCase(),
    transactionHash,
    amount
  }, 'membership/purchase');

  return createSuccessResponse({
    membership: {
      tier: tier.toLowerCase(),
      purchaseDate: Date.now(),
      txHash: transactionHash
    }
  });
}, 'membership/purchase');

export const GET = withErrorHandler(async (req: NextRequest) => {
  const ip = (req.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return createErrorResponse('Too many requests', 'RATE_LIMIT', 429);
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return createErrorResponse('Missing address parameter', 'MISSING_ADDRESS', 400);
  }

  // Validate address format
  if (!isValidAddress(address)) {
    return createErrorResponse('Invalid address format', 'INVALID_ADDRESS', 400);
  }

  // Get membership status
  const membership = membershipStorage.get(address.toLowerCase());

  if (!membership) {
    return createSuccessResponse({ membership: null });
  }

  return createSuccessResponse({ membership });
}, 'membership/purchase');
