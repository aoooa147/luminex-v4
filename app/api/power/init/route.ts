import { NextRequest, NextResponse } from 'next/server';
import { getPowerByCode, POWERS, type PowerCode } from '@/lib/utils/powerConfig';
import { getUserPower, createPowerDraft } from '@/lib/power/storage';
import { TREASURY_ADDRESS } from '@/lib/utils/constants';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { isValidPowerCode } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

interface InitPowerRequest {
  targetCode: PowerCode;
  userId?: string; // Optional, will use header if not provided
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json() as InitPowerRequest;
  const { targetCode } = body;

  // Validate required fields
  const bodyValidation = validateBody(body, ['targetCode']);
  if (!bodyValidation.valid) {
    return createErrorResponse(
      `Missing required fields: ${bodyValidation.missing?.join(', ')}`,
      'MISSING_FIELDS',
      400
    );
  }

  // Validate power code
  if (!isValidPowerCode(targetCode)) {
    return createErrorResponse('Invalid targetCode', 'INVALID_POWER_CODE', 400);
  }

  // Get target power config
  const target = getPowerByCode(targetCode);
  if (!target) {
    return createErrorResponse('Power code not found', 'POWER_NOT_FOUND', 404);
  }

  // Get user ID from headers (set by middleware) or request
  // For now, we'll get it from query/body - in production, use session/auth
  const userId = req.headers.get('x-user-id') || body.userId;
  
  if (!userId) {
    return createErrorResponse('User ID is required', 'MISSING_USER_ID', 401);
  }

  // Validate wallet address format
  if (!isValidAddress(userId)) {
    return createErrorResponse('Invalid user ID format', 'INVALID_ADDRESS', 400);
  }

        // Get current power (if any)
    const current = await getUserPower(userId);

    // Calculate amount to pay
    let amountWLD: string;
    if (!current) {
      // First purchase - pay full price
      amountWLD = target.priceWLD;
    } else {
      // Upgrade - pay difference
      const currentPower = getPowerByCode(current.code);
      if (!currentPower) {
        // Current power not found in config - treat as new purchase
        amountWLD = target.priceWLD;
      } else {
        const currentPrice = parseFloat(currentPower.priceWLD);
        const targetPrice = parseFloat(target.priceWLD);
        const difference = Math.max(targetPrice - currentPrice, 0);

        // Prevent downgrade (difference < 0)
        if (difference === 0) {
          return createErrorResponse('Cannot downgrade or purchase same level', 'INVALID_UPGRADE', 400);
        }

        amountWLD = difference.toString();
      }
    }

    // Generate reference
    const reference = crypto.randomUUID();

    // Create draft
    await createPowerDraft(reference, userId, targetCode, amountWLD);

    logger.success('Power purchase initialized', {
      userId,
      targetCode,
      currentCode: current?.code || 'none',
      amountWLD,
      reference,
    }, 'power/init');

    return createSuccessResponse({
      reference,
      amountWLD,
      to: TREASURY_ADDRESS,
      token: 'WLD',
      target: {
        code: target.code,
        name: target.name,
        totalAPY: target.totalAPY,
      },
    });
}, 'power/init');
