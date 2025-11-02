import { NextRequest, NextResponse } from 'next/server';

// Credit both referrer and new user with rewards

interface ProcessReferralRequest {
  newUserId: string; // Wallet address of new user
  referrerCode: string; // Referral code of referrer
}

/**
 * Process referral and credit rewards
 * In production, this should:
 * 1. Verify referrer exists
 * 2. Check if new user was already referred
 * 3. Credit both users
 * 4. Store referral in database
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

    // Extract referrer address from referral code
    // Format: LUX + 6 hex characters from address
    // Example: LUX123456 means address contains 0x...123456...
    let referrerAddress: string | null = null;
    
    if (referrerCode.startsWith('LUX') && referrerCode.length === 9) {
      // Extract hex part and try to find matching address
      // In production, you'd look up the referral code in a database
      // For now, we'll store it for later lookup
      const hexPart = referrerCode.slice(3);
      console.log('🔍 Looking up referrer for code:', referrerCode, 'hex:', hexPart);
      
      // TODO: In production, query database to find referrer by code
      // For now, we'll accept the referral and process it
      referrerAddress = `0x${hexPart.toLowerCase()}0000000000000000000000000`; // Placeholder
    }

    // Check if new user was already referred (prevent duplicate referrals)
    // In production, query database
    const alreadyReferred = false; // TODO: Check database

    if (alreadyReferred) {
      return NextResponse.json({
        success: false,
        reason: 'already_referred',
        message: 'User has already been referred',
      }, { status: 400 });
    }

    // Reward amounts (configurable)
    const REFERRER_REWARD = 50; // LUX tokens
    const NEW_USER_REWARD = 50; // LUX tokens

    // TODO: In production, implement actual reward crediting:
    // 1. Credit referrer: creditUser(referrerAddress, REFERRER_REWARD, 'referral_bonus')
    // 2. Credit new user: creditUser(newUserId, NEW_USER_REWARD, 'signup_bonus')
    // 3. Store referral record in database
    // 4. Emit events for tracking

    console.log('✅ Referral processed:', {
      newUserId,
      referrerCode,
      referrerAddress,
      referrerReward: REFERRER_REWARD,
      newUserReward: NEW_USER_REWARD,
    });

    return NextResponse.json({
      success: true,
      referrerReward: REFERRER_REWARD,
      newUserReward: NEW_USER_REWARD,
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
