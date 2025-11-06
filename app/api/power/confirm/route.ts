import { NextRequest, NextResponse } from 'next/server';
import { getPowerDraft, markDraftAsUsed, setUserPower, getUserPower } from '@/lib/power/storage';
import { getPowerByCode } from '@/lib/utils/powerConfig';
import { WORLD_API_KEY, WORLD_APP_ID } from '@/lib/utils/constants';

interface ConfirmPowerRequest {
  payload: {
    transaction_id?: string;
    reference: string;
  };
}

async function verifyTransactionWithWorldcoin(transactionId: string, reference: string) {
  try {
    const response = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${WORLD_APP_ID}&type=miniapp`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WORLD_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Worldcoin API error:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();
    
    // Verify reference matches
    if (data.reference !== reference) {
      console.error('Reference mismatch:', { expected: reference, got: data.reference });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ConfirmPowerRequest;
    const { payload } = body;

    if (!payload || !payload.reference) {
      return NextResponse.json({
        success: false,
        error: 'payload with reference is required',
      }, { status: 400 });
    }

    // Check if user cancelled (no transaction_id)
    if (!payload.transaction_id) {
      return NextResponse.json({
        success: false,
        error: 'user_cancelled',
        message: 'Payment was cancelled',
      }, { status: 400 });
    }

        // Get draft
    const draft = await getPowerDraft(payload.reference);
    if (!draft) {
      return NextResponse.json({
        success: false,
        error: 'invalid_reference',
        message: 'Reference not found or expired',
      }, { status: 400 });
    }

    if (draft.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'draft_already_used',
        message: 'This draft has already been used',
      }, { status: 400 });
    }

    // Verify transaction with Worldcoin API
    const verified = await verifyTransactionWithWorldcoin(payload.transaction_id, payload.reference);                                                           
    if (!verified) {
      return NextResponse.json({
        success: false,
        error: 'verification_failed',
        message: 'Transaction verification failed',
      }, { status: 400 });
    }

    // Get current power to check if upgrade is valid
    const current = await getUserPower(draft.userId);

    // Update or create user power (paid purchase)
    const userPower = await setUserPower(
      draft.userId,
      draft.targetCode,
      payload.transaction_id,
      payload.reference,
      true // isPaid = true for purchased powers
    );

    // Mark draft as used
    await markDraftAsUsed(payload.reference);

    const power = getPowerByCode(draft.targetCode);
    if (!power) {
      return NextResponse.json({
        success: false,
        error: 'Invalid power code',
      }, { status: 500 });
    }

    console.log('✅ Power purchase confirmed:', {
      userId: draft.userId,
      targetCode: draft.targetCode,
      transactionId: payload.transaction_id,
      previousCode: current?.code || 'none',
    });

    return NextResponse.json({
      success: true,
      ok: true,
      power: {
        code: power.code,
        name: power.name,
        totalAPY: power.totalAPY,
      },
    });
  } catch (error: any) {
    console.error('❌ Error confirming power purchase:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to confirm power purchase',
    }, { status: 500 });
  }
}
