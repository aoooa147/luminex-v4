/**
 * Integration tests for /api/initiate-payment route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../initiate-payment/route';

// Mock rate limit and request ID
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/requestId', () => ({
  requestId: jest.fn(() => 'test-request-id'),
}));

describe('/api/initiate-payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create payment reference with valid amount', async () => {
    const url = 'http://localhost:3000/api/initiate-payment';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ amount: '0.1', symbol: 'WLD' }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(req);
    expect(response.status).toBe(200);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(true);
    // createSuccessResponse spreads the data object, so id, amount, symbol are at root level
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('amount');
    expect(data).toHaveProperty('symbol');
    expect(data.amount).toBe(0.1);
    expect(data.symbol).toBe('WLD');
    expect(typeof data.id).toBe('string');
    expect(data.id.length).toBeGreaterThan(0);
  });

  it('should reject invalid amount', async () => {
    const url = 'http://localhost:3000/api/initiate-payment';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ amount: '0' }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_REQUEST');
  });

  it('should reject amount too small', async () => {
    const url = 'http://localhost:3000/api/initiate-payment';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ amount: '0.001' }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_REQUEST');
  });

  it('should reject negative amount', async () => {
    const url = 'http://localhost:3000/api/initiate-payment';
    const req = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ amount: '-1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
  });
});

