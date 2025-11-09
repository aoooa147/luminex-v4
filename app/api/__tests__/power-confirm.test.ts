/**
 * Integration tests for /api/power/confirm route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../power/confirm/route';
import * as powerStorage from '@/lib/power/storage';
import * as powerConfig from '@/lib/utils/powerConfig';

// Mock power storage
jest.mock('@/lib/power/storage', () => ({
  getPowerDraft: jest.fn(),
  markDraftAsUsed: jest.fn(),
  setUserPower: jest.fn(),
  getUserPower: jest.fn(),
}));

// Mock power config
jest.mock('@/lib/utils/powerConfig', () => ({
  getPowerByCode: jest.fn(),
}));

// Mock constants
jest.mock('@/lib/utils/constants', () => ({
  WORLD_API_KEY: 'test-api-key',
  WORLD_APP_ID: 'test-app-id',
}));

// Mock fetch for Worldcoin API
global.fetch = jest.fn();

describe('/api/power/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when payload is missing', async () => {
    const url = 'http://localhost:3000/api/power/confirm';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
  });

  it('should return error when reference is missing', async () => {
    const url = 'http://localhost:3000/api/power/confirm';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ payload: {} }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
  });

  it('should confirm power purchase with valid reference', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const reference = 'test-ref-123';
    const transactionId = 'test-tx-123';
    
    (powerStorage.getPowerDraft as jest.Mock).mockResolvedValue({
      reference,
      userId: validAddress,
      targetCode: 'spark',
      amountWLD: '1.0',
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue(null);
    
    (powerStorage.setUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'spark',
      txId: transactionId,
      reference,
      acquiredAt: new Date().toISOString(),
      isPaid: true,
    });
    
    (powerConfig.getPowerByCode as jest.Mock).mockReturnValue({
      code: 'spark',
      name: 'Spark',
      totalAPY: 25,
    });
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ reference }),
    });
    
    const url = 'http://localhost:3000/api/power/confirm';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          reference,
          transaction_id: transactionId,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(req);
    expect(response.status).toBe(200);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('power');
  });
});

