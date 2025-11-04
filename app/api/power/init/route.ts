import { NextRequest, NextResponse } from 'next/server';
import { getPowerByCode, POWERS, type PowerCode } from '@/lib/utils/powerConfig';
import { getUserPower, createPowerDraft } from '@/lib/power/storage';
import { TREASURY_ADDRESS } from '@/lib/utils/constants';

interface InitPowerRequest {
  targetCode: PowerCode;
  userId?: string; // Optional, will use header if not provided
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as InitPowerRequest;
    const { targetCode } = body;

    if (!targetCode) {
      return NextResponse.json({
        success: false,
        error: 'targetCode is required',
      }, { status: 400 });
    }

    // Get target power config
    const target = getPowerByCode(targetCode);
    if (!target) {
      return NextResponse.json({
        success: false,
        error: 'Invalid targetCode',
      }, { status: 400 });
    }

    // Get user ID from headers (set by middleware) or request
    // For now, we'll get it from query/body - in production, use session/auth
    const userId = req.headers.get('x-user-id') || body.userId;
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      }, { status: 401 });
    }

    // Validate wallet address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID format',
      }, { status: 400 });
    }

    // Get current power (if any)
    const current = getUserPower(userId);
    
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
          return NextResponse.json({
            success: false,
            error: 'Cannot downgrade or purchase same level',
          }, { status: 400 });
        }
        
        amountWLD = difference.toString();
      }
    }

    // Generate reference
    const reference = crypto.randomUUID();

    // Create draft
    createPowerDraft(reference, userId, targetCode, amountWLD);

    console.log('✅ Power purchase initialized:', {
      userId,
      targetCode,
      currentCode: current?.code || 'none',
      amountWLD,
      reference,
    });

    return NextResponse.json({
      success: true,
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
  } catch (error: any) {
    console.error('❌ Error initializing power purchase:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to initialize power purchase',
    }, { status: 500 });
  }
}
