import { NextRequest, NextResponse } from 'next/server';
import { addReferral, hasBeenReferred, getReferrerAddressFromCode } from '@/lib/referral/storage';
import { referralAntiCheat } from '@/lib/referral/anticheat';
import { takeToken } from '@/lib/utils/rateLimit';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress, isValidReferralCode } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

interface ProcessReferralRequest {
  newUserId: string; // Wallet address of new user
  referrerCode: string; // Referral code of referrer
}

/**
 * Process referral and credit rewards
 * Format: LUX + 6 hex characters from address (last 6 chars of address without 0x)
 * Example: LUX123456 means address ends with ...123456...
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting
  const ip = referralAntiCheat.getClientIP(req);
  if (!takeToken(ip, 5, 0.5)) {
    return createErrorResponse('Too many requests. Please try again later.', 'RATE_LIMIT', 429);
  }

  const body = await req.json() as ProcessReferralRequest;
  const { newUserId, referrerCode } = body;

  // Validate required fields
  const bodyValidation = validateBody(body, ['newUserId', 'referrerCode']);
  if (!bodyValidation.valid) {
    return createErrorResponse(
      `Missing required fields: ${bodyValidation.missing?.join(', ')}`,
      'MISSING_PARAMETERS',
      400
    );
  }

  // Validate wallet address format
  if (!isValidAddress(newUserId)) {
    referralAntiCheat.recordAttempt(ip, '', newUserId, false, 'invalid_address');
    return createErrorResponse('Invalid wallet address format', 'INVALID_ADDRESS', 400);
  }

  // Check if new user was already referred (prevent duplicate referrals)
  if (hasBeenReferred(newUserId)) {
    referralAntiCheat.recordAttempt(ip, '', newUserId, false, 'already_referred');
    return createErrorResponse('User has already been referred', 'ALREADY_REFERRED', 400);
  }

  // Validate referral code format
  if (!isValidReferralCode(referrerCode)) {
    referralAntiCheat.recordAttempt(ip, '', newUserId, false, 'invalid_code_format');
    return createErrorResponse('Invalid referral code format. Expected: LUX + 6 hex characters', 'INVALID_CODE_FORMAT', 400);
  }

  // Extract referrer address from referral code
  // Format: LUX + 6 hex characters (positions 2-8 of address)
  const referrerAddress = getReferrerAddressFromCode(referrerCode);
  
  if (!referrerAddress) {
    referralAntiCheat.recordAttempt(ip, '', newUserId, false, 'referrer_not_found');
    return createErrorResponse('Referrer not found for this code. The referrer may not exist yet.', 'REFERRER_NOT_FOUND', 400);
  }

    // Comprehensive anti-cheat validation
    const validation = referralAntiCheat.validateReferral(ip, referrerAddress, newUserId);
    
    if (!validation.valid) {
      const reason = validation.reason || 'invalid_referral';
      const blocked = validation.blocked || false;
      
      referralAntiCheat.recordAttempt(ip, referrerAddress, newUserId, false, reason);

      // Map internal reasons to user-friendly messages
      const reasonMessages: Record<string, string> = {
        'ip_blocked': 'Your IP address has been temporarily blocked due to suspicious activity. Please try again later.',
        'self_referral': 'Cannot refer yourself',
        'same_ip_referral': 'Referral cannot be processed from the same IP address',
        'rate_limit_exceeded': 'Too many referrals from this IP address. Please try again later.',
        'too_soon': 'Please wait before processing another referral',
        'too_many_addresses': 'Too many different accounts from this IP address. Please contact support if this is an error.',
        'chain_referral_same_ip': 'Chain referrals from the same IP are not allowed',
        'suspicious_pattern': 'Suspicious referral pattern detected. Your IP has been temporarily blocked.',
      };

      return NextResponse.json({
        success: false,
        reason,
        message: reasonMessages[reason] || 'Referral validation failed',
        blocked,
      }, { status: blocked ? 403 : 400 });
    }

    // Prevent self-referral (double-check)
    if (newUserId.toLowerCase() === referrerAddress.toLowerCase()) {
      referralAntiCheat.recordAttempt(ip, referrerAddress, newUserId, false, 'self_referral');
      return NextResponse.json({
        success: false,
        reason: 'self_referral',
        message: 'Cannot refer yourself',
      }, { status: 400 });
    }

    // Reward amount (configurable)
    const REFERRER_REWARD = 5; // LUX tokens per referral

    // Add referral (this will also check for duplicates internally)
    const added = addReferral(referrerAddress, newUserId, REFERRER_REWARD);

    if (!added) {
      referralAntiCheat.recordAttempt(ip, referrerAddress, newUserId, false, 'already_referred');
      return NextResponse.json({
        success: false,
        reason: 'already_referred',
        message: 'Referral already exists',
      }, { status: 400 });
    }

  // Record successful referral
  referralAntiCheat.recordAttempt(ip, referrerAddress, newUserId, true);

  logger.success('Referral processed', {
    newUserId,
    referrerCode,
    referrerAddress,
    referrerReward: REFERRER_REWARD,
    ip,
  }, 'process-referral');

  return createSuccessResponse({
    referrerReward: REFERRER_REWARD,
    message: 'Referral processed successfully',
  });
}, 'process-referral');
