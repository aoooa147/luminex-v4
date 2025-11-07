import { NextRequest, NextResponse } from 'next/server';
import { getUserPower } from '@/lib/power/storage';
import { getPowerByCode } from '@/lib/utils/powerConfig';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || req.headers.get('x-user-id');

  if (!userId) {
    return createErrorResponse('userId is required', 'MISSING_USER_ID', 400);
  }

  // Validate wallet address format
  if (!isValidAddress(userId)) {
    return createErrorResponse('Invalid user ID format', 'INVALID_ADDRESS', 400);
  }

  const userPower = await getUserPower(userId);

  if (!userPower) {
    return createSuccessResponse({ power: null });
  }

  const power = getPowerByCode(userPower.code);
  if (!power) {
    return createSuccessResponse({ power: null });
  }

  return createSuccessResponse({
    power: {
      code: power.code,
      name: power.name,
      totalAPY: power.totalAPY,
      acquiredAt: userPower.acquiredAt,
    },
  });
}, 'power/active');
