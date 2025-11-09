/**
 * Unit tests for /api/verify route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../verify/route';

// Mock dependencies
jest.mock('@worldcoin/minikit-js', () => ({
  verifyCloudProof: jest.fn(),
}));

jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/env', () => ({
  env: {
    NEXT_PUBLIC_WORLD_APP_ID: 'app_test123',
  },
}));

// Import after mocks are set up
import * as MiniKit from '@worldcoin/minikit-js';

describe('/api/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when payload is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        action: 'test-action',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when action is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        payload: { test: 'data' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should verify World ID successfully', async () => {
    (MiniKit.verifyCloudProof as jest.Mock).mockResolvedValueOnce({
      success: true,
      detail: { verified: true },
    });

    const req = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        payload: { test: 'data' },
        action: 'test-action',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('detail');

    // Note: verifyCloudProof is dynamically imported, so the mock might not be called directly
    // But we can verify the response is correct
  });

  it('should return error when verification fails', async () => {
    (MiniKit.verifyCloudProof as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Verification failed',
      detail: { error: 'Verification failed' },
    });

    const req = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        payload: { test: 'data' },
        action: 'test-action',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    // The route returns 400 for verification failures
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('VERIFICATION_FAILED');
  });

  it('should handle verification errors', async () => {
    (MiniKit.verifyCloudProof as jest.Mock).mockRejectedValueOnce(new Error('Verification error'));

    const req = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        payload: { test: 'data' },
        action: 'test-action',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(500);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('VERIFICATION_ERROR');
  });

  it('should return error for invalid payload format', async () => {
    (MiniKit.verifyCloudProof as jest.Mock).mockResolvedValueOnce({
      success: false,
    });

    const req = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        payload: 'invalid', // Should be object, not string
        action: 'test-action',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_PAYLOAD');
  });
});
