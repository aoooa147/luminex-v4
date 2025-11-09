/**
 * Integration tests for /api/referral/stats route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../referral/stats/route';
import * as referralStorage from '@/lib/referral/storage';

// Mock referral storage
jest.mock('@/lib/referral/storage', () => ({
  getReferralStats: jest.fn(),
}));

describe('/api/referral/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when address is missing', async () => {
    const url = 'http://localhost:3000/api/referral/stats';
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(400);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_ADDRESS');
  });

  it('should return error for invalid address format', async () => {
    const url = 'http://localhost:3000/api/referral/stats?address=invalid';
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(400);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_ADDRESS');
  });

  it('should return stats for valid address', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    (referralStorage.getReferralStats as jest.Mock).mockReturnValue({
      totalReferrals: 5,
      totalEarnings: 100,
    });
    
    const url = `http://localhost:3000/api/referral/stats?address=${validAddress}`;
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(true);
    // createSuccessResponse spreads { stats: {...} } directly, so stats is at root level
    expect(data).toHaveProperty('stats');
    expect(data.stats).toHaveProperty('totalReferrals');
    expect(data.stats).toHaveProperty('totalEarnings');
    expect(data.stats.totalReferrals).toBe(5);
    expect(data.stats.totalEarnings).toBe(100);
  });
});

