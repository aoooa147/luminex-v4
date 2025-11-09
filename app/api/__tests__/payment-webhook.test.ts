/**
 * Unit tests for /api/payment-webhook route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../payment-webhook/route';

// Mock dependencies
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

describe('/api/payment-webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process webhook successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/payment-webhook', {
      method: 'POST',
      body: JSON.stringify({
        event: 'payment.completed',
        data: {
          transactionId: 'test-tx-123',
          amount: '10.0',
          currency: 'WLD',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.ok).toBe(true);
  });

  it('should handle webhook with empty body', async () => {
    const req = new NextRequest('http://localhost:3000/api/payment-webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
  });

  it('should return error when rate limit exceeded', async () => {
    const { takeToken } = require('@/lib/utils/rateLimit');
    (takeToken as jest.Mock).mockReturnValue(false);

    const req = new NextRequest('http://localhost:3000/api/payment-webhook', {
      method: 'POST',
      body: JSON.stringify({
        event: 'payment.completed',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(429);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('RATE_LIMIT');
  });
});

