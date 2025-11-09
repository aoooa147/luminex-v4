/**
 * Integration tests for Payment Flow
 * Tests: /api/initiate-payment -> /api/confirm-payment
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST as initiatePayment } from '../../initiate-payment/route';
import { POST as confirmPayment } from '../../confirm-payment/route';

// Mock dependencies
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/requestId', () => ({
  requestId: jest.fn(() => 'test-request-id'),
}));

jest.mock('@/lib/utils/env', () => ({
  env: {
    WORLD_API_KEY: 'test-api-key',
    NEXT_PUBLIC_WORLD_APP_ID: 'test-app-id',
  },
}));

// Mock fetch for Worldcoin API
global.fetch = jest.fn();

describe('Payment Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full payment flow: initiate -> confirm', async () => {
    // Step 1: Initiate payment
    const initiateReq = new NextRequest('http://localhost:3000/api/initiate-payment', {
      method: 'POST',
      body: JSON.stringify({
        amount: 1.0,
        symbol: 'WLD',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const initiateResponse = await initiatePayment(initiateReq);
    expect(initiateResponse.status).toBe(200);

    const initiateText = await initiateResponse.text();
    const initiateData = JSON.parse(initiateText);
    expect(initiateData.success).toBe(true);
    expect(initiateData).toHaveProperty('id'); // payment reference
    expect(initiateData).toHaveProperty('amount', 1.0);
    expect(initiateData).toHaveProperty('symbol', 'WLD');

    const paymentReference = initiateData.id;
    const transactionId = 'test-tx-123';

    // Step 2: Confirm payment
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transaction_status: 'completed',
        reference: paymentReference,
      }),
    });

    const confirmReq = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: transactionId,
          reference: paymentReference,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const confirmResponse = await confirmPayment(confirmReq);
    expect(confirmResponse.status).toBe(200);

    const confirmText = await confirmResponse.text();
    const confirmData = JSON.parse(confirmText);
    expect(confirmData.success).toBe(true);
    expect(confirmData).toHaveProperty('transaction');
  });

  it('should handle payment cancellation (no transaction_id)', async () => {
    // Step 1: Initiate payment
    const initiateReq = new NextRequest('http://localhost:3000/api/initiate-payment', {
      method: 'POST',
      body: JSON.stringify({
        amount: 1.0,
        symbol: 'WLD',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const initiateResponse = await initiatePayment(initiateReq);
    expect(initiateResponse.status).toBe(200);

    const initiateText = await initiateResponse.text();
    const initiateData = JSON.parse(initiateText);
    const paymentReference = initiateData.id;

    // Step 2: Confirm payment with cancellation (no transaction_id)
    const confirmReq = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          reference: paymentReference,
          // No transaction_id - user cancelled
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const confirmResponse = await confirmPayment(confirmReq);
    expect(confirmResponse.status).toBeGreaterThanOrEqual(400);

    const confirmText = await confirmResponse.text();
    const confirmData = JSON.parse(confirmText);
    expect(confirmData.success).toBe(false);
  });

  it('should handle invalid payment amount', async () => {
    const initiateReq = new NextRequest('http://localhost:3000/api/initiate-payment', {
      method: 'POST',
      body: JSON.stringify({
        amount: 0, // Invalid: too small
        symbol: 'WLD',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const initiateResponse = await initiatePayment(initiateReq);
    expect(initiateResponse.status).toBeGreaterThanOrEqual(400);

    const initiateText = await initiateResponse.text();
    const initiateData = JSON.parse(initiateText);
    expect(initiateData.success).toBe(false);
  });

  it('should handle Worldcoin API failure', async () => {
    // Step 1: Initiate payment
    const initiateReq = new NextRequest('http://localhost:3000/api/initiate-payment', {
      method: 'POST',
      body: JSON.stringify({
        amount: 1.0,
        symbol: 'WLD',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const initiateResponse = await initiatePayment(initiateReq);
    const initiateText = await initiateResponse.text();
    const initiateData = JSON.parse(initiateText);
    const paymentReference = initiateData.id;
    const transactionId = 'test-tx-123';

    // Step 2: Confirm payment with Worldcoin API failure
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const confirmReq = new NextRequest('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: transactionId,
          reference: paymentReference,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const confirmResponse = await confirmPayment(confirmReq);
    // Should retry and eventually fail
    expect(confirmResponse.status).toBeGreaterThanOrEqual(400);
  });
});

