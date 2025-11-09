/**
 * Error Scenarios Tests: Rate Limits
 * Tests for handling rate limit errors in API routes
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock rate limit - we'll control it in tests
const mockTakeToken = jest.fn(() => true);
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn((...args: any[]) => mockTakeToken(...args)),
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock requestId
jest.mock('@/lib/utils/requestId', () => ({
  requestId: jest.fn(() => 'test-request-id'),
}));

// Mock env
jest.mock('@/lib/utils/env', () => ({
  env: {
    WORLD_API_KEY: 'test-api-key',
    NEXT_PUBLIC_WORLD_APP_ID: 'app_test123',
  },
}));

// Mock referral storage
jest.mock('@/lib/referral/storage', () => ({
  hasBeenReferred: jest.fn(() => false),
  getReferrerAddressFromCode: jest.fn(() => '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'),
  addReferral: jest.fn(() => true),
}));

// Mock referral anticheat
const mockGetClientIP = jest.fn(() => '127.0.0.1');
const mockValidateReferral = jest.fn(() => ({ valid: true }));
const mockRecordAttempt = jest.fn();

jest.mock('@/lib/referral/anticheat', () => ({
  referralAntiCheat: {
    getClientIP: (...args: any[]) => mockGetClientIP(...args),
    validateReferral: (...args: any[]) => mockValidateReferral(...args),
    recordAttempt: (...args: any[]) => mockRecordAttempt(...args),
  },
}));

// Mock validation
jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn(() => true),
  isValidReferralCode: jest.fn(() => true),
}));

// Mock World ID verification
jest.mock('@worldcoin/minikit-js', () => ({
  verifyCloudProof: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Error Scenarios: Rate Limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTakeToken.mockReturnValue(true);
    mockGetClientIP.mockReturnValue('127.0.0.1');
    mockValidateReferral.mockReturnValue({ valid: true });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ transaction_status: 'confirmed' }),
    });
  });

  describe('process-referral route', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockTakeToken.mockReturnValue(false);
      mockGetClientIP.mockReturnValue('127.0.0.1');

      // Import route using require (consistent with process-referral.test.ts)
      const { POST } = require('../../process-referral/route');
      
      const req = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: '0x1234567890123456789012345678901234567890',
          referrerCode: 'LUX123456',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(req);
      
      // Verify response exists and has status
      expect(response).toBeDefined();
      expect(response.status).toBe(429);
      
      // Parse response body using .text() and JSON.parse() (consistent with other tests)
      const text = await response.text();
      const data = JSON.parse(text);
      
      // Verify error response structure
      // createErrorResponse returns { success: false, error, message }
      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toBe('RATE_LIMIT');
      expect(data.message).toContain('Too many requests');
      
      // Verify rate limit was checked
      expect(mockTakeToken).toHaveBeenCalled();
    });
  });

  describe('verify route', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockTakeToken.mockReturnValue(false);

      const { POST } = require('../../verify/route');
      const req = new NextRequest('http://localhost:3000/api/verify', {
        method: 'POST',
        body: JSON.stringify({
          payload: {
            proof: 'test-proof',
            merkle_root: 'test-root',
            nullifier_hash: 'test-nullifier',
          },
          action: 'test-action',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(req);
      const data = await response.json();

      // Verify rate limit error
      expect(response.status).toBe(429);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
      if (data.error) {
        expect(data.error).toBe('RATE_LIMIT');
      }
      if (data.message) {
        expect(data.message).toContain('Too many requests');
      }
      expect(mockTakeToken).toHaveBeenCalled();
    });
  });

  describe('initiate-payment route', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockTakeToken.mockReturnValue(false);

      const { POST } = require('../../initiate-payment/route');
      const req = new NextRequest('http://localhost:3000/api/initiate-payment', {
        method: 'POST',
        body: JSON.stringify({
          amount: 10,
          symbol: 'WLD',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(req);
      const data = await response.json();

      // Verify rate limit error
      expect(response.status).toBe(429);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
      if (data.error) {
        expect(data.error).toBe('RATE_LIMIT');
      }
      if (data.message) {
        expect(data.message).toContain('Too many requests');
      }
      expect(mockTakeToken).toHaveBeenCalled();
    });
  });

  describe('confirm-payment route', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockTakeToken.mockReturnValue(false);

      const { POST } = require('../../confirm-payment/route');
      const req = new NextRequest('http://localhost:3000/api/confirm-payment', {
        method: 'POST',
        body: JSON.stringify({
          payload: {
            transaction_id: 'test-transaction-id',
            reference: 'test-reference',
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(req);
      const data = await response.json();

      // Verify rate limit error
      expect(response.status).toBe(429);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
      if (data.error) {
        expect(data.error).toBe('RATE_LIMIT');
      }
      if (data.message) {
        expect(data.message).toContain('Too many requests');
      }
    });
  });

  describe('membership-purchase route', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockTakeToken.mockReturnValue(false);

      const { POST } = require('../../membership/purchase/route');
      const req = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          tier: 'gold',
          transactionHash: '0xtest',
          amount: '10',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(req);
      const data = await response.json();

      // Verify rate limit error
      expect(response.status).toBe(429);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
      if (data.error) {
        expect(data.error).toBe('RATE_LIMIT');
      }
      if (data.message) {
        expect(data.message).toContain('Too many requests');
      }
      expect(mockTakeToken).toHaveBeenCalled();
    });
  });
});
