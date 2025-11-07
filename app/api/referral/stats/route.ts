import { NextRequest, NextResponse } from 'next/server';
import { getReferralStats } from '@/lib/referral/storage';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return createErrorResponse('address parameter is required', 'MISSING_ADDRESS', 400);
  }

  // Validate wallet address format
  if (!isValidAddress(address)) {
    return createErrorResponse('Invalid wallet address format', 'INVALID_ADDRESS', 400);
  }

  const stats = getReferralStats(address);

  return createSuccessResponse({
    stats: {
      totalReferrals: stats.totalReferrals,
      totalEarnings: stats.totalEarnings,
    },
  });
}, 'referral/stats');
