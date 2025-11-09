/**
 * Integration tests for /api/wld-balance route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../wld-balance/route';

// Mock validation
jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }),
}));

// Mock ethers - Must be after validation mock
jest.mock('ethers', () => {
  const mockBalanceOf = jest.fn().mockResolvedValue(BigInt('1000000000000000000'));
  const mockDecimals = jest.fn().mockResolvedValue(BigInt(18));
  
  return {
    ethers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        // Mock provider instance
      })),
      Contract: jest.fn().mockImplementation(() => ({
        balanceOf: mockBalanceOf,
        decimals: mockDecimals,
      })),
      formatUnits: jest.fn((value, decimals) => {
        // Convert BigInt to string and divide by 10^decimals
        const divisor = BigInt(10) ** BigInt(decimals || 18);
        const result = Number(value) / Number(divisor);
        return result.toString();
      }),
    },
  };
});

// Mock rate limit
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

// Mock constants
jest.mock('@/lib/utils/constants', () => ({
  WLD_TOKEN_ADDRESS: '0x1234567890123456789012345678901234567890',
  WALLET_RPC_URL: 'https://worldchain-testnet.rpc.thirdweb.com',
}));

describe('/api/wld-balance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when address is missing', async () => {
    const url = 'http://localhost:3000/api/wld-balance';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(req);
    
    // Zod validation error will be caught by withErrorHandler and return 500
    expect(response.status).toBeGreaterThanOrEqual(400);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
  });

  it('should return error for invalid address format', async () => {
    const url = 'http://localhost:3000/api/wld-balance';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ address: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(req);
    
    // Zod validation error will be caught by withErrorHandler and return 500
    expect(response.status).toBeGreaterThanOrEqual(400);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
  });

  it('should return balance for valid address', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const url = 'http://localhost:3000/api/wld-balance';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ address: validAddress }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(req);
    
    expect(response.status).toBe(200);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('balance');
  });
});

