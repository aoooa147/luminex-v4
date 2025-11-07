import { NextRequest, NextResponse } from 'next/server';
import { grantFreePower, getUserPower } from '@/lib/power/storage';
import { getPowerByCode, type PowerCode } from '@/lib/utils/powerConfig';
import { logger } from '@/lib/utils/logger';
import { isValidAddress, isValidPowerCode } from '@/lib/utils/validation';
import { validateBody, createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/apiHandler';

interface GrantFreePowerRequest {
  userId: string;
  code: PowerCode;
}

export async function POST(req: NextRequest) {
  return withErrorHandler(async (req: NextRequest) => {
    const body = await req.json() as GrantFreePowerRequest;
    const { userId, code } = body;

    // Validate required fields
    const bodyValidation = validateBody(body, ['userId', 'code']);
    if (!bodyValidation.valid) {
      return createErrorResponse(
        `Missing required fields: ${bodyValidation.missing?.join(', ')}`,
        'MISSING_FIELDS',
        400
      );
    }

    // Validate wallet address format
    if (!isValidAddress(userId)) {
      return createErrorResponse('Invalid wallet address format', 'INVALID_ADDRESS', 400);
    }

    // Validate power code
    if (!isValidPowerCode(code)) {
      return createErrorResponse('Invalid power code', 'INVALID_POWER_CODE', 400);
    }

    const power = getPowerByCode(code);
    if (!power) {
      return createErrorResponse('Power code not found', 'POWER_NOT_FOUND', 404);
    }

    // Check if user already has a power
    const current = await getUserPower(userId);
    if (current) {
      // User already has a power, check if upgrade is valid
      const currentPower = getPowerByCode(current.code);
      if (currentPower) {
        const currentPrice = parseFloat(currentPower.priceWLD);
        const targetPrice = parseFloat(power.priceWLD);
        
        // Only allow upgrade (target price > current price)
        if (targetPrice <= currentPrice) {
          return createErrorResponse('Cannot downgrade or grant same level', 'INVALID_UPGRADE', 400);
        }
      }
    }

    // Grant free power
    const userPower = await grantFreePower(userId, code);

    logger.success('Free power granted', {
      userId,
      code,
      previousCode: current?.code || 'none',
    }, 'power/grant-free');

    return createSuccessResponse({
      power: {
        code: power.code,
        name: power.name,
        totalAPY: power.totalAPY,
        isPaid: false,
      },
    });
  }, 'power/grant-free')(req);
}

