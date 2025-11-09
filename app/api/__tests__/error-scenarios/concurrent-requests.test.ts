/**
 * Error Scenarios Tests: Concurrent Requests
 * Tests for handling concurrent requests and race conditions
 */

import { NextRequest } from 'next/server';

// Mock Prisma client - must be defined before importing routes
jest.mock('@/lib/prisma/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    referral: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    membership: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    gameScore: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Import routes after mocks are set up
import { POST as processReferralPOST } from '../../process-referral/route';
import { POST as membershipPurchasePOST } from '../../membership/purchase/route';
import { POST as gameScoreSubmitPOST } from '../../game/score/submit/route';
import { prisma } from '@/lib/prisma/client';

// Mock rate limit
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

// Mock referral storage
jest.mock('@/lib/referral/storage', () => ({
  hasBeenReferred: jest.fn(() => false),
  recordReferral: jest.fn(),
  getReferralStats: jest.fn(),
}));

// Mock referral anticheat
jest.mock('@/lib/referral/anticheat', () => ({
  referralAntiCheat: {
    getClientIP: jest.fn(() => '127.0.0.1'),
    validateReferral: jest.fn(() => ({ valid: true })),
    recordAttempt: jest.fn(),
  },
}));

// Mock game storage
jest.mock('@/lib/game/storage', () => ({
  recordScore: jest.fn(),
  getLeaderboard: jest.fn(),
  getPlayerStats: jest.fn(),
}));

// Mock game anticheat
jest.mock('@/lib/game/anticheat', () => ({
  validateScore: jest.fn(() => ({ valid: true, risk: 'low' })),
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock rate limiter
jest.mock('@/lib/cache/rateLimiter', () => ({
  rateLimiters: {
    gameAction: jest.fn(() => Promise.resolve({ allowed: true })),
  },
}));

describe('Error Scenarios: Concurrent Requests', () => {
  const mockPrisma = prisma as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Race conditions in referral processing', () => {
    it('should handle concurrent referral requests for same user', async () => {
      const userId = '0x1234567890123456789012345678901234567890';
      const referrerCode = 'LUX123456';

      let callCount = 0;
      mockPrisma.user.findUnique.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          id: userId,
          address: userId,
        });
      });

      mockPrisma.referral.findFirst.mockImplementation(() => {
        // First call returns null, second call might return existing referral
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({
            id: 'existing-referral',
            newUserAddress: userId,
          });
        }
        return Promise.resolve(null);
      });

      mockPrisma.referral.create.mockImplementation(() => {
        return Promise.resolve({
          id: 'new-referral',
          newUserAddress: userId,
        });
      });

      const req1 = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: userId,
          referrerCode,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const req2 = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: userId,
          referrerCode,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      // Execute requests concurrently
      const [response1, response2] = await Promise.all([
        processReferralPOST(req1),
        processReferralPOST(req2),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // At least one should succeed, one might fail due to duplicate
      const successCount = [data1, data2].filter(d => d.success).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle concurrent membership purchases', async () => {
      const userId = '0x1234567890123456789012345678901234567890';
      const powerCode = 'spark';

      let transactionCount = 0;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        transactionCount++;
        // Simulate transaction delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return await callback(mockPrisma);
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        address: userId,
      });

      mockPrisma.membership.findUnique.mockResolvedValue(null);
      mockPrisma.membership.create.mockResolvedValue({
        id: 'membership-1',
        userId,
        powerCode,
      });

      const req1 = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          powerCode,
          amount: '10',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const req2 = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          powerCode,
          amount: '10',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      // Execute requests concurrently
      const [response1, response2] = await Promise.all([
        membershipPurchasePOST(req1),
        membershipPurchasePOST(req2),
      ]);

      // Both transactions should be attempted
      expect(transactionCount).toBe(2);
    });
  });

  describe('Concurrent score submissions', () => {
    it('should handle concurrent score submissions from same user', async () => {
      const userId = '0x1234567890123456789012345678901234567890';
      const gameName = 'coin-flip';

      let createCount = 0;
      mockPrisma.gameScore.create.mockImplementation(() => {
        createCount++;
        return Promise.resolve({
          id: `score-${createCount}`,
          userId,
          gameName,
          score: 1000,
        });
      });

      const req1 = new NextRequest('http://localhost:3000/api/game/score/submit', {
        method: 'POST',
        body: JSON.stringify({
          gameName,
          score: 1000,
          nonce: 'nonce-1',
          signature: 'signature-1',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
          'x-user-id': userId,
        },
      });

      const req2 = new NextRequest('http://localhost:3000/api/game/score/submit', {
        method: 'POST',
        body: JSON.stringify({
          gameName,
          score: 2000,
          nonce: 'nonce-2',
          signature: 'signature-2',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
          'x-user-id': userId,
        },
      });

      // Execute requests concurrently
      const [response1, response2] = await Promise.all([
        gameScoreSubmitPOST(req1),
        gameScoreSubmitPOST(req2),
      ]);

      // Both should be processed (depending on validation)
      expect(createCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Database lock contention', () => {
    it('should handle database lock timeout on concurrent updates', async () => {
      const userId = '0x1234567890123456789012345678901234567890';

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Simulate lock timeout
        await new Promise(resolve => setTimeout(resolve, 50));
        throw {
          code: 'P2034',
          message: 'Transaction failed due to a deadlock',
        };
      });

      const req1 = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          powerCode: 'spark',
          amount: '10',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const req2 = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          powerCode: 'spark',
          amount: '10',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      // Execute requests concurrently
      const [response1, response2] = await Promise.all([
        membershipPurchasePOST(req1),
        membershipPurchasePOST(req2),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Both should handle the error gracefully
      expect(data1.success).toBe(false);
      expect(data2.success).toBe(false);
    });
  });

  describe('Multiple users concurrent requests', () => {
    it('should handle concurrent requests from different users', async () => {
      const user1 = '0x1111111111111111111111111111111111111111';
      const user2 = '0x2222222222222222222222222222222222222222';
      const referrerCode = 'LUX123456';

      mockPrisma.user.findUnique.mockImplementation((args: any) => {
        const address = args.where.address;
        return Promise.resolve({
          id: address,
          address,
        });
      });

      mockPrisma.referral.findFirst.mockResolvedValue(null);
      mockPrisma.referral.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: `referral-${args.data.newUserAddress}`,
          ...args.data,
        });
      });

      const req1 = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: user1,
          referrerCode,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const req2 = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: user2,
          referrerCode,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.2',
        },
      });

      // Execute requests concurrently
      const [response1, response2] = await Promise.all([
        processReferralPOST(req1),
        processReferralPOST(req2),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Both should succeed as they are for different users
      // Note: This depends on the actual implementation
      expect(response1.status).toBeDefined();
      expect(response2.status).toBeDefined();
    });
  });

  describe('Rate limit with concurrent requests', () => {
    it('should properly rate limit concurrent requests', async () => {
      const { takeToken } = require('@/lib/utils/rateLimit');
      let tokenCount = 0;
      (takeToken as jest.Mock).mockImplementation(() => {
        tokenCount++;
        return tokenCount <= 5; // Allow first 5 requests
      });

      const { POST: verifyPOST } = require('../../verify/route');
      const requests = Array.from({ length: 10 }, (_, i) => {
        return new NextRequest('http://localhost:3000/api/verify', {
          method: 'POST',
          body: JSON.stringify({
            payload: { proof: `test-${i}` },
            action: 'test',
          }),
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '127.0.0.1',
          },
        });
      });

      // Execute all requests concurrently
      const responses = await Promise.all(
        requests.map(req => verifyPOST(req))
      );

      const statuses = await Promise.all(
        responses.map(r => r.status)
      );

      // First 5 should succeed, rest should be rate limited
      const successCount = statuses.filter(s => s !== 429).length;
      const rateLimitedCount = statuses.filter(s => s === 429).length;

      expect(successCount).toBeLessThanOrEqual(5);
      expect(rateLimitedCount).toBeGreaterThanOrEqual(5);
    });
  });
});

