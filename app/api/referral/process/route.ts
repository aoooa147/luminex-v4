import { NextRequest, NextResponse } from 'next/server';
import { addReferral, hasBeenReferred } from '@/lib/referral/storage';
import { referralAntiCheat } from '@/lib/referral/anticheat';
import { takeToken } from '@/lib/utils/rateLimit';

interface ProcessReferralRequest {
  newUserAddress: string; // Wallet address of new user
  referrerAddress: string; // Wallet address of referrer
}

/**
 * Process referral and credit rewards
 * This endpoint takes the referrer address directly (simpler than reverse lookup from code)
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = referralAntiCheat.getClientIP(req);
    if (!takeToken(ip, 5, 0.5)) {
      return NextResponse.json({
        success: false,
        error: 'rate_limit',
        message: 'Too many requests. Please try again later.',
      }, { status: 429 });
    }

    const { newUserAddress, referrerAddress } = await req.json() as ProcessReferralRequest;

    if (!newUserAddress || !referrerAddress) {
      return NextResponse.json({
        success: false,
        error: 'newUserAddress and referrerAddress are required',
      }, { status: 400 });
    }

    // Validate wallet address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(newUserAddress) || !addressRegex.test(referrerAddress)) {
      referralAntiCheat.recordAttempt(ip, referrerAddress, newUserAddress, false, 'invalid_address');
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address format',
      }, { status: 400 });
    }

    // Comprehensive anti-cheat validation
    const validation = referralAntiCheat.validateReferral(ip, referrerAddress, newUserAddress);
    
    if (!validation.valid) {
      const reason = validation.reason || 'invalid_referral';
      const blocked = validation.blocked || false;
      
      referralAntiCheat.recordAttempt(ip, referrerAddress, newUserAddress, false, reason);

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
        error: reason,
        message: reasonMessages[reason] || 'Referral validation failed',
        blocked,
      }, { status: blocked ? 403 : 400 });
    }

    // Prevent self-referral
    if (newUserAddress.toLowerCase() === referrerAddress.toLowerCase()) {
      referralAntiCheat.recordAttempt(ip, referrerAddress, newUserAddress, false, 'self_referral');
      return NextResponse.json({
        success: false,
        error: 'Cannot refer yourself',
      }, { status: 400 });
    }

    // Check if new user was already referred (prevent duplicate referrals)
    if (hasBeenReferred(newUserAddress)) {
      referralAntiCheat.recordAttempt(ip, referrerAddress, newUserAddress, false, 'already_referred');
      return NextResponse.json({
        success: false,
        error: 'already_referred',
        message: 'User has already been referred',
      }, { status: 400 });
    }

    // Reward amount (configurable)
    const REFERRER_REWARD = 50; // LUX tokens per referral

    // Add referral (this will also check for duplicates internally)
    const added = addReferral(referrerAddress, newUserAddress, REFERRER_REWARD);

    if (!added) {
      referralAntiCheat.recordAttempt(ip, referrerAddress, newUserAddress, false, 'already_referred');
      return NextResponse.json({
        success: false,
        error: 'Referral already exists',
      }, { status: 400 });
    }

    // Record successful referral
    referralAntiCheat.recordAttempt(ip, referrerAddress, newUserAddress, true);

    console.log('✅ Referral processed:', {
      newUserAddress,
      referrerAddress,
      referrerReward: REFERRER_REWARD,
      ip,
    });

    return NextResponse.json({
      success: true,
      referrerReward: REFERRER_REWARD,
      message: 'Referral processed successfully',
    });
  } catch (error: any) {
    const ip = referralAntiCheat.getClientIP(req);
    console.error('❌ Error processing referral:', error);
    referralAntiCheat.recordAttempt(ip, '', '', false, 'server_error');
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process referral',
    }, { status: 500 });
  }
}
