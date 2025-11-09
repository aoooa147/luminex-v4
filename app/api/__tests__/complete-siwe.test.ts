/**
 * Unit tests for /api/complete-siwe route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../complete-siwe/route';
import * as MiniKit from '@worldcoin/minikit-js';

// Mock dependencies
jest.mock('@worldcoin/minikit-js', () => ({
  verifySiweMessage: jest.fn(),
}));

jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

describe('/api/complete-siwe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when payload is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/complete-siwe', {
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

  it('should verify SIWE message successfully', async () => {
    (MiniKit.verifySiweMessage as jest.Mock).mockResolvedValue({
      isValid: true,
      siweMessageData: {
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
      },
    });

    const req = new NextRequest('http://localhost:3000/api/complete-siwe', {
      method: 'POST',
      body: JSON.stringify({
        payload: { message: 'test message', signature: '0xabc123' },
        nonce: 'test-nonce',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.status).toBe('ok');
    expect(data.isValid).toBe(true);
    expect(data).toHaveProperty('siweMessageData');

    expect(MiniKit.verifySiweMessage).toHaveBeenCalledWith(
      { message: 'test message', signature: '0xabc123' },
      'test-nonce'
    );
  });

  it('should return isValid false when verification fails', async () => {
    (MiniKit.verifySiweMessage as jest.Mock).mockResolvedValue({
      isValid: false,
      siweMessageData: null,
    });

    const req = new NextRequest('http://localhost:3000/api/complete-siwe', {
      method: 'POST',
      body: JSON.stringify({
        payload: { message: 'test message', signature: '0xabc123' },
        nonce: 'test-nonce',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.isValid).toBe(false);
  });

  it('should handle verification without nonce', async () => {
    (MiniKit.verifySiweMessage as jest.Mock).mockResolvedValue({
      isValid: true,
      siweMessageData: {
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
      },
    });

    const req = new NextRequest('http://localhost:3000/api/complete-siwe', {
      method: 'POST',
      body: JSON.stringify({
        payload: { message: 'test message', signature: '0xabc123' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.isValid).toBe(true);

    expect(MiniKit.verifySiweMessage).toHaveBeenCalledWith(
      { message: 'test message', signature: '0xabc123' },
      ''
    );
  });

  it('should handle verification errors', async () => {
    (MiniKit.verifySiweMessage as jest.Mock).mockRejectedValue(new Error('Verification error'));

    const req = new NextRequest('http://localhost:3000/api/complete-siwe', {
      method: 'POST',
      body: JSON.stringify({
        payload: { message: 'test message', signature: '0xabc123' },
        nonce: 'test-nonce',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });
});

