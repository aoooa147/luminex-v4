import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { takeToken } from '@/lib/utils/rateLimit';
import { ethers } from 'ethers';
import { WALLET_RPC_URL } from '@/lib/utils/constants';

// Force Node.js runtime for this API route
export const runtime = 'nodejs';

const BodySchema = z.object({ 
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
});

// ENS Reverse Resolution ABI
const ENS_ABI = [
  "function getNames(address[] calldata addresses) external view returns (string[] memory)"
];

const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'; // Ethereum Mainnet ENS Registry

export async function POST(request: NextRequest) {
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  
  if (!takeToken(ip)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Too many requests' 
    }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { address } = BodySchema.parse(body);
    
    console.log('[user-profile] Fetching profile for:', address);
    
    // For now, we'll create a simple profile from the address
    // In the future, you could:
    // 1. Try to resolve ENS name
    // 2. Query a database for stored profile info
    // 3. Use World ID to get human-readable name
    
    // Try to resolve ENS name (if on Ethereum mainnet)
    let username: string | null = null;
    try {
      // Check if we're on Ethereum mainnet (chain ID 1)
      const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
      const ensContract = new ethers.Contract(ENS_REGISTRY_ADDRESS, ENS_ABI, provider);
      
      // Try to get ENS name
      const names = await ensContract.getNames([address]);
      if (names && names[0] && names[0].length > 0) {
        username = names[0];
        console.log('[user-profile] Resolved ENS name:', username);
      }
    } catch (e: any) {
      console.log('[user-profile] ENS resolution failed or not on mainnet:', e?.message);
    }
    
    // Generate a friendly username based on address
    const displayName = username || `User_${address.slice(2, 8).toUpperCase()}`;
    
    // Create a simple avatar hash based on address
    const avatarSeed = parseInt(address.slice(2, 10), 16) % 5;
    const avatars = ['👤', '👨', '👩', '🧑', '👨‍💼'];
    const avatar = avatars[avatarSeed];
    
    console.log('[user-profile] Profile created:', { displayName, avatar });
    
    return NextResponse.json({ 
      success: true,
      profile: {
        address,
        username: displayName,
        avatar,
        addressShort: `${address.slice(0, 6)}...${address.slice(-4)}`,
      }
    });
    
  } catch (e: any) {
    console.error('[user-profile] Error:', e?.message);
    return NextResponse.json({ 
      success: false,
      error: e?.message || 'Failed to fetch profile',
      profile: null
    }, { status: 400 });
  }
}

