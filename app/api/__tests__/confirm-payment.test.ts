/**
 * Unit tests for /api/confirm-payment route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../confirm-payment/route';

// Mock dependencies
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/env', () => ({
  env: {
    WORLD_API_KEY: 'test-api-key',
    NEXT_PUBLIC_WORLD_APP_ID: 'test-app-id',
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('/api/confirm-payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when payload is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when transaction_id is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          reference: 'test-ref',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('USER_CANCELLED');
  });

  it('should return error when WORLD_API_KEY is missing', async () => {
    jest.resetModules();
    jest.doMock('@/lib/utils/env', () => ({
      env: {
        WORLD_API_KEY: undefined,
        NEXT_PUBLIC_WORLD_APP_ID: 'test-app-id',
      },
    }));

    const { POST: POST_reloaded } = require('../confirm-payment/route');
    const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: 'test-tx-id',
          reference: 'test-ref',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST_reloaded(req);
    expect(response.status).toBe(500);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_CONFIG');
  });

  it('should confirm payment successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        transaction_status: 'mined',
        transaction_hash: '0xabc123',
        reference: 'test-ref',
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: 'test-tx-id',
          reference: 'test-ref',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('transaction');
    expect(data.transaction.transaction_status).toBe('mined');
  });

  it('should retry on failure', async () => {
    let attemptCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          transaction_status: 'mined',
          transaction_hash: '0xabc123',
        }),
      });
    });

    const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: 'test-tx-id',
          reference: 'test-ref',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should return error after max attempts', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: 'test-tx-id',
          reference: 'test-ref',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(502);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('DEVELOPER_API_TIMEOUT');
  });

  it('should return error for client error from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Transaction not found',
    });

    const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: 'invalid-tx-id',
          reference: 'test-ref',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(404);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('DEVELOPER_API_ERROR');
  });

  // Skip rate limit test as it requires module reload which is complex in Jest
  // Rate limiting is tested in integration tests
});
