import { NextRequest, NextResponse } from 'next/server';
import { addReferral, hasBeenReferred } from '@/lib/referral/storage';

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
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address format',
      }, { status: 400 });
    }

    // Prevent self-referral
    if (newUserAddress.toLowerCase() === referrerAddress.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: 'Cannot refer yourself',
      }, { status: 400 });
    }

    // Check if new user was already referred (prevent duplicate referrals)
    if (hasBeenReferred(newUserAddress)) {
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
      return NextResponse.json({
        success: false,
        error: 'Referral already exists',
      }, { status: 400 });
    }

    console.log('✅ Referral processed:', {
      newUserAddress,
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
      error: error.message || 'Failed to process referral',
    }, { status: 500 });
  }
}
