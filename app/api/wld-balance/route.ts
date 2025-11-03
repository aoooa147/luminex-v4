import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { WALLET_RPC_URL, WLD_TOKEN_ADDRESS } from '@/lib/utils/constants';
import { ethers } from 'ethers';

// Force Node.js runtime for this API route
export const runtime = 'nodejs';

const BodySchema = z.object({ 
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
});

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export async function POST(request: NextRequest) {
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  
  if (!takeToken(ip)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Too many requests' 
    }, { status: 429 });
  }

  try {
    // Validate that token address is configured
    if (!WLD_TOKEN_ADDRESS || WLD_TOKEN_ADDRESS === '') {
      console.error('[wld-balance] WLD_TOKEN_ADDRESS is not configured');
      return NextResponse.json({ 
        success: false,
        error: 'WLD token address not configured',
        balance: 0
      }, { status: 500 });
    }
    
    // Validate RPC URL is configured
    if (!WALLET_RPC_URL || WALLET_RPC_URL === '') {
      console.error('[wld-balance] WALLET_RPC_URL is not configured');
      return NextResponse.json({ 
        success: false,
        error: 'Worldchain RPC URL not configured',
        balance: 0
      }, { status: 500 });
    }
    
    const body = await request.json();
    const { address } = BodySchema.parse(body);
    
    console.log('[wld-balance] Fetching balance for:', address);
    console.log('[wld-balance] Config:', { WLD_TOKEN_ADDRESS, WALLET_RPC_URL });
    
    // Create provider for Worldchain
    const provider = new ethers.JsonRpcProvider(WALLET_RPC_URL);
    const wldContract = new ethers.Contract(WLD_TOKEN_ADDRESS, ERC20_ABI, provider);
    
    // Fetch balance
    const wldBalanceBN = await wldContract.balanceOf(address);
    
    // Fetch decimals
    let decimals = 18;
    try {
      decimals = await wldContract.decimals();
    } catch (e) {
      console.warn('[wld-balance] Could not fetch decimals, using default 18');
    }
    
    // Format balance
    const balance = parseFloat(ethers.formatUnits(wldBalanceBN, decimals));
    
    console.log('[wld-balance] Balance fetched:', balance, 'WLD');
    
    return NextResponse.json({ 
      success: true,
      balance,
      rawBalance: wldBalanceBN.toString(),
      decimals,
      tokenAddress: WLD_TOKEN_ADDRESS
    });
    
  } catch (e: any) {
    console.error('[wld-balance] Error:', e?.message);
    return NextResponse.json({ 
      success: false,
      error: e?.message || 'Failed to fetch balance',
      balance: 0
    }, { status: 400 });
  }
}

