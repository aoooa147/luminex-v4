/**
 * Integration tests for Verification Flow
 * Tests: /api/verify -> /api/complete-siwe
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST as verifyWorldID } from '../../verify/route';
import { POST as completeSIWE } from '../../complete-siwe/route';
import * as MiniKit from '@worldcoin/minikit-js';

// Mock dependencies
jest.mock('@worldcoin/minikit-js', () => ({
  verifyCloudProof: jest.fn(),
  verifySiweMessage: jest.fn(),
}));

jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/env', () => ({
  env: {
    NEXT_PUBLIC_WORLD_APP_ID: 'app_test123',
  },
}));

describe('Verification Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full verification flow: World ID -> SIWE', async () => {
    // Step 1: Verify World ID
    (MiniKit.verifyCloudProof as jest.Mock).mockResolvedValueOnce({
      success: true,
      detail: { verified: true },
    });

    const verifyReq = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        payload: { test: 'data' },
        action: 'test-action',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const verifyResponse = await verifyWorldID(verifyReq);
    expect(verifyResponse.status).toBe(200);

    const verifyText = await verifyResponse.text();
    const verifyData = JSON.parse(verifyText);
    expect(verifyData.success).toBe(true);
    expect(verifyData).toHaveProperty('detail');

    // Step 2: Complete SIWE verification
    (MiniKit.verifySiweMessage as jest.Mock).mockResolvedValueOnce({
      isValid: true,
      siweMessageData: {
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
      },
    });

    const siweReq = new NextRequest('http://localhost:3000/api/complete-siwe', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          message: 'test message',
          signature: '0xabc123',
        },
        nonce: 'test-nonce',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const siweResponse = await completeSIWE(siweReq);
    expect(siweResponse.status).toBe(200);

    const siweText = await siweResponse.text();
    const siweData = JSON.parse(siweText);
    expect(siweData.success).toBe(true);
    expect(siweData.status).toBe('ok');
    expect(siweData.isValid).toBe(true);
    expect(siweData).toHaveProperty('siweMessageData');
  });

  it('should handle World ID verification failure', async () => {
    (MiniKit.verifyCloudProof as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Verification failed',
      detail: { error: 'Verification failed' },
    });

    const verifyReq = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        payload: { test: 'data' },
        action: 'test-action',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const verifyResponse = await verifyWorldID(verifyReq);
    expect(verifyResponse.status).toBe(400);

    const verifyText = await verifyResponse.text();
    const verifyData = JSON.parse(verifyText);
    expect(verifyData.success).toBe(false);
    expect(verifyData.error).toBe('VERIFICATION_FAILED');
  });

  it('should handle SIWE verification failure', async () => {
    (MiniKit.verifySiweMessage as jest.Mock).mockResolvedValueOnce({
      isValid: false,
      siweMessageData: null,
    });

    const siweReq = new NextRequest('http://localhost:3000/api/complete-siwe', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          message: 'test message',
          signature: '0xabc123',
        },
        nonce: 'test-nonce',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const siweResponse = await completeSIWE(siweReq);
    expect(siweResponse.status).toBe(200);

    const siweText = await siweResponse.text();
    const siweData = JSON.parse(siweText);
    expect(siweData.success).toBe(true);
    expect(siweData.isValid).toBe(false);
  });

  it('should handle verification errors', async () => {
    (MiniKit.verifyCloudProof as jest.Mock).mockRejectedValueOnce(new Error('Verification error'));

    const verifyReq = new NextRequest('http://localhost:3000/api/verify', {
      method: 'POST',
      body: JSON.stringify({
        payload: { test: 'data' },
        action: 'test-action',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const verifyResponse = await verifyWorldID(verifyReq);
    expect(verifyResponse.status).toBe(500);

    const verifyText = await verifyResponse.text();
    const verifyData = JSON.parse(verifyText);
    expect(verifyData.success).toBe(false);
    expect(verifyData.error).toBe('VERIFICATION_ERROR');
  });
});

