/**
 * Integration tests for /api/power/active route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../power/active/route';
import * as powerStorage from '@/lib/power/storage';

// Mock power storage
jest.mock('@/lib/power/storage', () => ({
  getUserPower: jest.fn(),
}));

describe('/api/power/active', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when userId is missing', async () => {
    const url = 'http://localhost:3000/api/power/active';
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(400);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_USER_ID');
  });

  it('should return error for invalid address format', async () => {
    const url = 'http://localhost:3000/api/power/active?userId=invalid';
    const req = new NextRequest(url);
    
    const response = await GET(req);
    expect(response.status).toBe(400);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_ADDRESS');
  });

  it('should return null power for valid address without power', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue(null);
    
    const url = `http://localhost:3000/api/power/active?userId=${validAddress}`;
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    
    // NextResponse.json() creates a Response with ReadableStream body
    // We need to read it properly
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    // createSuccessResponse spreads { power: null } directly, so power is at root level
    expect(data).toHaveProperty('power');
    expect(data.power).toBe(null);
  });

  it('should return power for valid address with power', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'spark',
      txId: '0xabc123',
      reference: 'ref123',
      acquiredAt: new Date().toISOString(),
      isPaid: true,
    });
    
    const url = `http://localhost:3000/api/power/active?userId=${validAddress}`;
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    
    // NextResponse.json() creates a Response with ReadableStream body
    // We need to read it properly
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    // createSuccessResponse spreads { power: {...} } directly, so power is at root level
    expect(data).toHaveProperty('power');
    expect(data.power).toBeTruthy();
    expect(data.power.code).toBe('spark');
  });
});

