import { NextRequest, NextResponse } from 'next/server';
import { getUserPower } from '@/lib/power/storage';
import { getPowerByCode } from '@/lib/utils/powerConfig';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required',
      }, { status: 400 });
    }

    // Validate wallet address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID format',
      }, { status: 400 });
    }

    const userPower = getUserPower(userId);
    
    if (!userPower) {
      return NextResponse.json({
        success: true,
        power: null,
      });
    }

    const power = getPowerByCode(userPower.code);
    if (!power) {
      return NextResponse.json({
        success: true,
        power: null,
      });
    }

    return NextResponse.json({
      success: true,
      power: {
        code: power.code,
        name: power.name,
        totalAPY: power.totalAPY,
        acquiredAt: userPower.acquiredAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching active power:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch active power',
    }, { status: 500 });
  }
}
