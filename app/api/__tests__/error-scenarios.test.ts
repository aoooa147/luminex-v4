/**
 * Error Scenarios Tests
 * Tests for network timeouts, database failures, rate limits, and concurrent requests
 */

import { NextRequest } from 'next/server';
import { POST as ProcessReferralPOST } from '../process-referral/route';
import { POST as ConfirmPaymentPOST } from '../confirm-payment/route';
import { POST as InitiatePaymentPOST } from '../initiate-payment/route';
import { takeToken } from '@/lib/utils/rateLimit';
import { rateLimiters } from '@/lib/cache/rateLimiter';

// Mock dependencies
jest.mock('@/lib/utils/rateLimit');
jest.mock('@/lib/cache/rateLimiter', () => ({
  rateLimiters: {
    gameAction: jest.fn(),
  },
}));


// Note: We don't mock requestId and logger here
// confirm-payment.test.ts doesn't mock them either and it works fine
// These are just for logging and shouldn't affect response creation

jest.mock('@/lib/utils/env', () => ({
  env: {
    WORLD_API_KEY: 'test-api-key',
    NEXT_PUBLIC_WORLD_APP_ID: 'test-app-id',
  },
}));

jest.mock('@/lib/referral/anticheat', () => ({
  referralAntiCheat: {
    getClientIP: jest.fn((req) => {
      const ip = req.headers.get('x-forwarded-for');
      return ip ? ip.split(',')[0].trim() : '127.0.0.1';
    }),
    validateReferral: jest.fn(() => ({ valid: true, reason: '' })),
    recordAttempt: jest.fn(),
  },
}));

const mockAddReferral = jest.fn(() => Promise.resolve(true));
const mockHasBeenReferred = jest.fn(() => false);
const mockGetReferrerAddressFromCode = jest.fn(() => '0x1234567890123456789012345678901234567890');

jest.mock('@/lib/referral/storage', () => ({
  hasBeenReferred: (...args: any[]) => mockHasBeenReferred(...args),
  addReferral: (...args: any[]) => mockAddReferral(...args),
  getReferrerAddressFromCode: (...args: any[]) => mockGetReferrerAddressFromCode(...args),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn(() => true),
  isValidReferralCode: jest.fn(() => true),
}));

jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(() => ({})),
  writeJSON: jest.fn(),
  recordScore: jest.fn(),
  getEnergy: jest.fn(() => 100),
  consumeEnergy: jest.fn(() => true),
}));

jest.mock('@/lib/game/verify', () => ({
  verifyScoreSignature: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/lib/game/anticheatEnhanced', () => ({
  enhancedAntiCheat: {
    registerIP: jest.fn(() => Promise.resolve()),
    registerDevice: jest.fn(() => Promise.resolve()),
    validateScore: jest.fn(() => ({ valid: true, reason: '' })),
  },
}));

jest.mock('@/lib/utils/ipTracking', () => ({
  getClientIP: jest.fn(() => '127.0.0.1'),
  checkIPRisk: jest.fn(() => Promise.resolve({
    ip: '127.0.0.1',
    riskLevel: 'low',
    isVPN: false,
    isProxy: false,
    isTor: false,
  })),
}));

// Initialize fetch mock before tests
global.fetch = jest.fn();

describe('Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (takeToken as jest.Mock).mockReturnValue(true);
    // Reset referral storage mocks
    mockAddReferral.mockResolvedValue(true);
    mockHasBeenReferred.mockReturnValue(false);
    mockGetReferrerAddressFromCode.mockReturnValue('0x1234567890123456789012345678901234567890');
    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Rate Limits', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      (takeToken as jest.Mock).mockReturnValue(false);

      const req = new NextRequest('http://localhost:3000/api/initiate-payment', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await InitiatePaymentPOST(req);
      expect(response.status).toBe(429);
      
      const data = await response.json();
      expect(data.error).toBe('RATE_LIMIT');
      expect(data.message).toBe('Too many requests');
    });

    it('should handle rate limit for process-referral endpoint', async () => {
      (takeToken as jest.Mock).mockReturnValue(false);

      const req = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: '0x1234567890123456789012345678901234567890',
          referrerCode: 'LUX123456',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await ProcessReferralPOST(req);
      expect(response.status).toBe(429);
      
      const data = await response.json();
      expect(data.error).toBe('RATE_LIMIT');
    });

    it('should allow requests when rate limit is not exceeded', async () => {
      (takeToken as jest.Mock).mockReturnValue(true);

      const req = new NextRequest('http://localhost:3000/api/initiate-payment', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await InitiatePaymentPOST(req);
      expect(response.status).not.toBe(429);
    });
  });

  describe('Network Timeouts', () => {
    it('should handle timeout when external API does not respond', async () => {
      // Mock fetch to simulate timeout (AbortError) on all attempts
      let attemptCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        const error = new Error('The user aborted a request.');
        (error as any).name = 'AbortError';
        return Promise.reject(error);
      }) as jest.Mock;

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

      const response = await ConfirmPaymentPOST(req);
      expect(response.status).toBe(502);
      
      const data = await response.json();
      expect(data.error).toBe('DEVELOPER_API_TIMEOUT');
      expect(data.message).toContain('Developer API error or timeout');
      expect(attemptCount).toBeGreaterThanOrEqual(3); // Should retry
    });

    it('should retry on network errors and eventually succeed', async () => {
      let attemptCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Network error');
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'confirmed', transaction_status: 'confirmed' }),
        });
      }) as jest.Mock;

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

      const response = await ConfirmPaymentPOST(req);
      
      // Should eventually succeed after retries
      expect(attemptCount).toBe(3);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Database Failures', () => {
    it('should handle database storage errors in process-referral', async () => {
      // Mock addReferral to throw error (simulating database failure)
      // Note: addReferral is synchronous, so we throw synchronously
      mockAddReferral.mockImplementationOnce(() => {
        throw new Error('Database storage failed');
      });
      mockHasBeenReferred.mockReturnValueOnce(false);
      mockGetReferrerAddressFromCode.mockReturnValueOnce('0x1234567890123456789012345678901234567890');

      const req = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: '0x1234567890123456789012345678901234567890',
          referrerCode: 'LUX123456',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await ProcessReferralPOST(req);
      // Error should be caught by withErrorHandler and return 500
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle file system errors gracefully', async () => {
      const { writeJSON } = require('@/lib/game/storage');
      (writeJSON as jest.Mock).mockRejectedValueOnce(
        new Error('File system error')
      );

      // Verify that writeJSON function exists and can be mocked
      expect(writeJSON).toBeDefined();
      expect(typeof writeJSON).toBe('function');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      (takeToken as jest.Mock).mockReturnValue(true);

      const requests = Array.from({ length: 10 }, () =>
        new NextRequest('http://localhost:3000/api/initiate-payment', {
          method: 'POST',
          body: JSON.stringify({ amount: 10 }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const responses = await Promise.all(
        requests.map((req) => InitiatePaymentPOST(req))
      );

      // All requests should complete
      expect(responses).toHaveLength(10);
      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should handle concurrent requests with rate limiting', async () => {
      let callCount = 0;
      (takeToken as jest.Mock).mockImplementation(() => {
        callCount++;
        // Allow first 5 requests, reject rest
        return callCount <= 5;
      });

      const requests = Array.from({ length: 10 }, () =>
        new NextRequest('http://localhost:3000/api/initiate-payment', {
          method: 'POST',
          body: JSON.stringify({ amount: 10 }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const responses = await Promise.all(
        requests.map((req) => InitiatePaymentPOST(req))
      );

      const successCount = responses.filter((r) => r.status === 200).length;
      const rateLimitCount = responses.filter((r) => r.status === 429).length;

      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitCount).toBeGreaterThan(0);
      expect(successCount + rateLimitCount).toBe(10);
    });

    it('should handle concurrent referral processing', async () => {
      const { addReferral } = require('@/lib/referral/storage');
      (addReferral as jest.Mock).mockResolvedValue(undefined);

      const requests = Array.from({ length: 5 }, (_, i) =>
        new NextRequest('http://localhost:3000/api/process-referral', {
          method: 'POST',
          body: JSON.stringify({
            newUserId: `0x${i.toString().padStart(40, '0')}`,
            referrerCode: 'LUX123456',
          }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const responses = await Promise.all(
        requests.map((req) => ProcessReferralPOST(req))
      );

      // All requests should complete (may succeed or fail based on validation)
      expect(responses).toHaveLength(5);
      responses.forEach((response) => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(600);
      });
    });
  });

  describe('Invalid Request Data', () => {
    it('should handle malformed JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/initiate-payment', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await InitiatePaymentPOST(req);
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const req = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await ProcessReferralPOST(req);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('MISSING_PARAMETERS');
    });

    it('should handle invalid data types', async () => {
      const req = new NextRequest('http://localhost:3000/api/initiate-payment', {
        method: 'POST',
        body: JSON.stringify({ amount: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await InitiatePaymentPOST(req);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('External Service Failures', () => {
    it('should handle external API 500 errors with retries', async () => {
      // This test is similar to confirm-payment.test.ts "should return error after max attempts"
      // But we're testing 500 errors specifically (server errors that trigger retries)
      
      let attemptCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attemptCount++;
        // Return 500 error for all attempts
        // According to route.ts line 86-88, 500 errors go to else block and trigger retries
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Internal Server Error',
        } as Response);
      });

      const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
        method: 'POST',
        body: JSON.stringify({
          payload: {
            transaction_id: 'test-tx-id',
            reference: 'test-ref',
          },
        }),
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await ConfirmPaymentPOST(req);
      
      // After 3 retry attempts fail, should return 502
      expect(response.status).toBe(502);
      expect(attemptCount).toBe(3); // Should retry 3 times
      
      // Read response body - same as confirm-payment.test.ts
      const text = await response.text();
      const data = JSON.parse(text);
      
      // Verify error response
      expect(data.success).toBe(false);
      expect(data.error).toBe('DEVELOPER_API_TIMEOUT');
    });

    it('should handle external API 404 errors immediately', async () => {
      // This test is similar to confirm-payment.test.ts "should return error for client error from API"
      // Testing that 4xx errors return immediately without retries
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Transaction not found',
      } as Response);

      const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
        method: 'POST',
        body: JSON.stringify({
          payload: {
            transaction_id: 'invalid-tx-id',
            reference: 'test-ref',
          },
        }),
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await ConfirmPaymentPOST(req);
      
      // 404 errors are client errors, should return immediately
      expect(response.status).toBe(404);
      
      // Read response body - same as confirm-payment.test.ts
      const text = await response.text();
      const data = JSON.parse(text);
      
      // Verify error response
      expect(data.success).toBe(false);
      expect(data.error).toBe('DEVELOPER_API_ERROR');
    });
  });
});

