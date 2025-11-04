import { NextRequest, NextResponse } from 'next/server';
import { addReferral, hasBeenReferred, getReferrerAddressFromCode } from '@/lib/referral/storage';

interface ProcessReferralRequest {
  newUserId: string; // Wallet address of new user
  referrerCode: string; // Referral code of referrer
}

/**
 * Process referral and credit rewards
 * Format: LUX + 6 hex characters from address (last 6 chars of address without 0x)
 * Example: LUX123456 means address ends with ...123456...
 */
export async function POST(req: NextRequest) {
  try {
    const { newUserId, referrerCode } = await req.json() as ProcessReferralRequest;

    if (!newUserId || !referrerCode) {
      return NextResponse.json({
        success: false,
        reason: 'missing_parameters',
        message: 'newUserId and referrerCode are required',
      }, { status: 400 });
    }

    // Validate wallet address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(newUserId)) {
      return NextResponse.json({
        success: false,
        reason: 'invalid_address',
        message: 'Invalid wallet address format',
      }, { status: 400 });
    }

    // Check if new user was already referred (prevent duplicate referrals)
    if (hasBeenReferred(newUserId)) {
      return NextResponse.json({
        success: false,
        reason: 'already_referred',
        message: 'User has already been referred',
      }, { status: 400 });
    }

    // Extract referrer address from referral code
    // Format: LUX + 6 hex characters (positions 2-8 of address)
    let referrerAddress: string | null = null;
    
    if (referrerCode.startsWith('LUX') && referrerCode.length === 9) {
      referrerAddress = getReferrerAddressFromCode(referrerCode);
      
      if (!referrerAddress) {
        return NextResponse.json({
          success: false,
          reason: 'referrer_not_found',
          message: 'Referrer not found for this code. The referrer may not exist yet.',
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        reason: 'invalid_code_format',
        message: 'Invalid referral code format. Expected: LUX + 6 hex characters',
      }, { status: 400 });
    }

    // Prevent self-referral
    if (newUserId.toLowerCase() === referrerAddress.toLowerCase()) {
      return NextResponse.json({
        success: false,
        reason: 'self_referral',
        message: 'Cannot refer yourself',
      }, { status: 400 });
    }

    // Reward amount (configurable)
    const REFERRER_REWARD = 50; // LUX tokens per referral

    // Add referral (this will also check for duplicates internally)
    const added = addReferral(referrerAddress, newUserId, REFERRER_REWARD);

    if (!added) {
      return NextResponse.json({
        success: false,
        reason: 'already_referred',
        message: 'Referral already exists',
      }, { status: 400 });
    }

    console.log('✅ Referral processed:', {
      newUserId,
      referrerCode,
      referrerAddress,
      referrerReward: REFERRER_REWARD,
    });

    return NextResponse.json({
      success: true,
      referrerReward: REFERRER_REWARD,
      message: 'Referral processed successfully',
    });
  } catch (error: any) {
    console.error('❌ Error processing referral:', error);
    return NextResponse.json({
      success: false,
      reason: 'server_error',
      message: error.message || 'Failed to process referral',
    }, { status: 500 });
  }
}
