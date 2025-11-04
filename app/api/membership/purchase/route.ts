import { NextRequest, NextResponse } from 'next/server';
import { takeToken } from '@/lib/utils/rateLimit';
import { TREASURY_ADDRESS } from '@/lib/utils/constants';
import { ethers } from 'ethers';

// In-memory storage for membership status
// In production, use a database (PostgreSQL, MongoDB, etc.)
const membershipStorage = new Map<string, { tier: string; purchaseDate: number; txHash?: string }>();

interface PurchaseRequest {
  address: string;
  tier: string;
  transactionHash: string;
  amount: string;
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json() as PurchaseRequest;
    const { address, tier, transactionHash, amount } = body;

    if (!address || !tier || !transactionHash) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: address, tier, transactionHash' 
      }, { status: 400 });
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid address format' 
      }, { status: 400 });
    }

    // Validate tier
    const validTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    if (!validTiers.includes(tier.toLowerCase())) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid membership tier' 
      }, { status: 400 });
    }

    // Store membership purchase
    membershipStorage.set(address.toLowerCase(), {
      tier: tier.toLowerCase(),
      purchaseDate: Date.now(),
      txHash: transactionHash
    });

    console.log(`✅ Membership purchased: ${address} -> ${tier} (tx: ${transactionHash})`);

    return NextResponse.json({
      success: true,
      membership: {
        tier: tier.toLowerCase(),
        purchaseDate: Date.now(),
        txHash: transactionHash
      }
    });
  } catch (error: any) {
    console.error('❌ Membership purchase error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process membership purchase' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  if (!takeToken(ip)) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing address parameter' 
      }, { status: 400 });
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid address format' 
      }, { status: 400 });
    }

    // Get membership status
    const membership = membershipStorage.get(address.toLowerCase());

    if (!membership) {
      return NextResponse.json({
        success: true,
        membership: null
      });
    }

    return NextResponse.json({
      success: true,
      membership
    });
  } catch (error: any) {
    console.error('❌ Get membership error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to get membership status' 
    }, { status: 500 });
  }
}
