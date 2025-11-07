import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { WALLET_RPC_URL, WLD_TOKEN_ADDRESS } from '@/lib/utils/constants';
import { ethers } from 'ethers';
import { logger } from '@/lib/utils/logger';

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
      logger.error('WLD_TOKEN_ADDRESS is not configured', null, 'wld-balance');
      return NextResponse.json({ 
        success: false,
        error: 'WLD token address not configured',
        balance: 0
      }, { status: 500 });
    }
    
    // Validate RPC URL is configured
    if (!WALLET_RPC_URL || WALLET_RPC_URL === '') {
      logger.error('WALLET_RPC_URL is not configured', null, 'wld-balance');
      return NextResponse.json({ 
        success: false,
        error: 'Worldchain RPC URL not configured',
        balance: 0
      }, { status: 500 });
    }
    
    const body = await request.json();
    const { address } = BodySchema.parse(body);
    
    logger.debug('Fetching WLD balance', { address, WLD_TOKEN_ADDRESS, WALLET_RPC_URL }, 'wld-balance');
    
    // Create provider for Worldchain
    const provider = new ethers.JsonRpcProvider(WALLET_RPC_URL);
    const wldContract = new ethers.Contract(WLD_TOKEN_ADDRESS, ERC20_ABI, provider);
    
    // Fetch balance
    const wldBalanceBN = await wldContract.balanceOf(address);
    
    // Fetch decimals
    let decimals = 18;
    try {
      const decimalsBN = await wldContract.decimals();
      decimals = Number(decimalsBN); // Convert BigInt to number
    } catch (e) {
      logger.warn('Could not fetch decimals, using default 18', e, 'wld-balance');
    }
    
    // Format balance
    const balance = parseFloat(ethers.formatUnits(wldBalanceBN, decimals));
    
    logger.info('WLD balance fetched', { address, balance }, 'wld-balance');
    
    return NextResponse.json({ 
      success: true,
      balance,
      rawBalance: wldBalanceBN.toString(),
      decimals: Number(decimals), // Ensure it's a number
      tokenAddress: WLD_TOKEN_ADDRESS
    });
    
  } catch (e: any) {
    logger.error('Error fetching WLD balance', e, 'wld-balance');
    return NextResponse.json({ 
      success: false,
      error: e?.message || 'Failed to fetch balance',
      balance: 0
    }, { status: 400 });
  }
}

