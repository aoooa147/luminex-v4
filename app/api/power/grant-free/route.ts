import { NextRequest, NextResponse } from 'next/server';
import { grantFreePower, getUserPower } from '@/lib/power/storage';
import { getPowerByCode, type PowerCode } from '@/lib/utils/powerConfig';

interface GrantFreePowerRequest {
  userId: string;
  code: PowerCode;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GrantFreePowerRequest;
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json({
        success: false,
        error: 'userId and code are required',
      }, { status: 400 });
    }

    // Validate wallet address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address format',
      }, { status: 400 });
    }

    // Validate power code
    const power = getPowerByCode(code);
    if (!power) {
      return NextResponse.json({
        success: false,
        error: 'Invalid power code',
      }, { status: 400 });
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
          return NextResponse.json({
            success: false,
            error: 'Cannot downgrade or grant same level',
          }, { status: 400 });
        }
      }
    }

    // Grant free power
    const userPower = await grantFreePower(userId, code);

    console.log('✅ Free power granted:', {
      userId,
      code,
      previousCode: current?.code || 'none',
    });

    return NextResponse.json({
      success: true,
      power: {
        code: power.code,
        name: power.name,
        totalAPY: power.totalAPY,
        isPaid: false,
      },
    });
  } catch (error: any) {
    console.error('❌ Error granting free power:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to grant free power',
    }, { status: 500 });
  }
}

