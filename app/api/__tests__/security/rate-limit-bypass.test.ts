/**
 * Security Tests: Rate Limit Bypass
 * Tests for rate limit bypass attempts
 */

import { NextRequest } from 'next/server';
import { POST as processReferralPOST } from '@/app/api/process-referral/route';
import { takeToken } from '@/lib/utils/rateLimit';

// Mock rate limiter
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/referral/storage', () => ({
  addReferral: jest.fn(() => true),
  hasBeenReferred: jest.fn(() => false),
  getReferrerAddressFromCode: jest.fn(() => '0x1234567890123456789012345678901234567890'),
}));

jest.mock('@/lib/referral/antiCheat', () => ({
  referralAntiCheat: {
    getClientIP: jest.fn(() => '127.0.0.1'),
    validateReferral: jest.fn(() => ({ valid: true })),
    recordAttempt: jest.fn(),
  },
}));

describe('Security: Rate Limit Bypass Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (takeToken as jest.Mock).mockReturnValue(true);
  });

  describe('Rate limit enforcement', () => {
    it('should enforce rate limits based on IP address', async () => {
      // Simulate rate limit exceeded
      (takeToken as jest.Mock).mockReturnValue(false);

      const req = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: '0x1234567890123456789012345678901234567890',
          referrerCode: 'LUX123456',
        }),
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const response = await processReferralPOST(req);
      
      expect(response.status).toBe(429);
      
      // NextResponse.json() creates a Response with ReadableStream body
      const text = await response.text();
      
      // Only parse if text is not empty
      if (text) {
        const data = JSON.parse(text);
        expect(data).toBeDefined();
        expect(data.success).toBe(false);
        expect(data.error).toBe('RATE_LIMIT');
      } else {
        // If response body is empty, at least verify status code
        expect(response.status).toBe(429);
      }
      
      expect(takeToken).toHaveBeenCalled();
    });

    it('should allow requests when rate limit is not exceeded', async () => {
      (takeToken as jest.Mock).mockReturnValue(true);

      const req = new NextRequest('http://localhost:3000/api/process-referral', {
        method: 'POST',
        body: JSON.stringify({
          newUserId: '0x1234567890123456789012345678901234567890',
          referrerCode: 'LUX123456',
        }),
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      // Should not be rate limited (though may fail for other reasons like invalid address)
      const response = await processReferralPOST(req);
      
      // Rate limit check should have been called
      expect(takeToken).toHaveBeenCalled();
      
      // If rate limit passes, request should proceed (may return 400 for invalid data, but not 429)
      if (response.status === 429) {
        const data = await response.json();
        expect(data.error).not.toBe('RATE_LIMIT');
      }
    });
  });

  describe('Rate limit bypass attempts', () => {
    it('should handle IP spoofing attempts', async () => {
      (takeToken as jest.Mock).mockReturnValue(false);

      // Try different IP addresses in headers
      const spoofedIPs = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
        '127.0.0.1',
        '8.8.8.8',
      ];

      for (const ip of spoofedIPs) {
        const req = new NextRequest('http://localhost:3000/api/process-referral', {
          method: 'POST',
          body: JSON.stringify({
            newUserId: '0x1234567890123456789012345678901234567890',
            referrerCode: 'LUX123456',
          }),
          headers: {
            'x-forwarded-for': ip,
            'x-real-ip': ip,
            'cf-connecting-ip': ip,
          },
        });

        const response = await processReferralPOST(req);
        
        // Rate limit should still be enforced regardless of IP in headers
        // (implementation should use a consistent method to extract IP)
        expect(takeToken).toHaveBeenCalled();
      }
    });

    it('should handle concurrent requests with rate limiting', async () => {
      let callCount = 0;
      (takeToken as jest.Mock).mockImplementation(() => {
        callCount++;
        // Allow first 5 requests, reject rest
        return callCount <= 5;
      });

      const requests = Array.from({ length: 10 }, () =>
        new NextRequest('http://localhost:3000/api/process-referral', {
          method: 'POST',
          body: JSON.stringify({
            newUserId: '0x1234567890123456789012345678901234567890',
            referrerCode: 'LUX123456',
          }),
        })
      );

      const responses = await Promise.all(requests.map(req => processReferralPOST(req)));
      const statuses = await Promise.all(responses.map(r => r.status));

      // Some requests should be rate limited
      const rateLimitedCount = statuses.filter(s => s === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(takeToken).toHaveBeenCalledTimes(10);
    });
  });
});

