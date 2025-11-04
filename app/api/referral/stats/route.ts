import { NextRequest, NextResponse } from 'next/server';
import { getReferralStats } from '@/lib/referral/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({
        success: false,
        error: 'address parameter is required',
      }, { status: 400 });
    }

    // Validate wallet address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address format',
      }, { status: 400 });
    }

    const stats = getReferralStats(address);

    return NextResponse.json({
      success: true,
      stats: {
        totalReferrals: stats.totalReferrals,
        totalEarnings: stats.totalEarnings,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching referral stats:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch referral stats',
    }, { status: 500 });
  }
}
