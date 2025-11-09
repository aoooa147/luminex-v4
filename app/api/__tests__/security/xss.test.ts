/**
 * Security Tests: XSS (Cross-Site Scripting)
 * Tests for XSS prevention in API routes
 */

import { NextRequest } from 'next/server';
import { POST as processReferralPOST } from '@/app/api/process-referral/route';
import { POST as submitScorePOST } from '@/app/api/game/score/submit/route';

// Mock dependencies
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/cache/rateLimiter', () => ({
  rateLimiters: {
    gameAction: jest.fn(() => Promise.resolve({ allowed: true })),
  },
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

// Note: @/lib/anti-cheat/enhanced and @/lib/anti-cheat/ipRisk don't exist, so we don't mock them

jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(() => ({ '0x1234567890123456789012345678901234567890': 'test-nonce' })),
  writeJSON: jest.fn(),
}));

jest.mock('@/lib/game/verify', () => ({
  verifyScoreSignature: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/lib/game/anticheatEnhanced', () => ({
  enhancedAntiCheat: {
    registerIP: jest.fn(),
    registerDevice: jest.fn(),
    recordAction: jest.fn(),
  },
}));

jest.mock('@/lib/utils/ipTracking', () => ({
  getClientIP: jest.fn(() => '127.0.0.1'),
  checkIPRisk: jest.fn(() => Promise.resolve({
    riskLevel: 'low',
    isVPN: false,
    isProxy: false,
    isTor: false,
  })),
}));

jest.mock('@/lib/cache/rateLimiter', () => ({
  rateLimiters: {
    gameAction: jest.fn(() => Promise.resolve({ allowed: true })),
  },
}));

describe('Security: XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
    '<keygen onfocus=alert("XSS") autofocus>',
    '<video><source onerror="alert(\'XSS\')">',
    '<audio src=x onerror=alert("XSS")>',
    '<details open ontoggle=alert("XSS")>',
    '<marquee onstart=alert("XSS")>',
    '<div onmouseover="alert(\'XSS\')">',
    "';alert('XSS');//",
    "\";alert('XSS');//",
    "';alert(String.fromCharCode(88,83,83))//",
    "<SCRIPT>alert('XSS')</SCRIPT>",
    "<ScRiPt>alert('XSS')</ScRiPt>",
  ];

  describe('process-referral endpoint', () => {
    it('should sanitize XSS payloads in newUserId field', async () => {
      for (const payload of xssPayloads) {
        const req = new NextRequest('http://localhost:3000/api/process-referral', {
          method: 'POST',
          body: JSON.stringify({
            newUserId: payload,
            referrerCode: 'LUX123456',
          }),
        });

        const response = await processReferralPOST(req);
        
        // NextResponse.json() creates a Response with ReadableStream body
        const text = await response.text();
        
        // Should reject invalid address format (XSS payloads are not valid addresses)
        expect(response.status).toBe(400);
        
        // Only parse if text is not empty
        if (text) {
          const data = JSON.parse(text);
          expect(data.success).toBe(false);
          expect(data.error).toBeDefined();
          
          // Response should not contain the XSS payload
          expect(text).not.toContain('<script>');
          expect(text).not.toContain('javascript:');
          expect(text).not.toContain('onerror=');
        } else {
          // If response body is empty, at least verify status code
          expect(response.status).toBe(400);
        }
      }
    });

    it('should sanitize XSS payloads in referrerCode field', async () => {
      for (const payload of xssPayloads) {
        const req = new NextRequest('http://localhost:3000/api/process-referral', {
          method: 'POST',
          body: JSON.stringify({
            newUserId: '0x1234567890123456789012345678901234567890',
            referrerCode: payload,
          }),
        });

        const response = await processReferralPOST(req);
        
        // NextResponse.json() creates a Response with ReadableStream body
        const text = await response.text();
        
        // Should reject invalid referral code format
        expect(response.status).toBe(400);
        
        // Only parse if text is not empty
        if (text) {
          const data = JSON.parse(text);
          expect(data.success).toBe(false);
          expect(data.error).toBeDefined();
          
          // Response should not contain the XSS payload
          expect(text).not.toContain('<script>');
          expect(text).not.toContain('javascript:');
        } else {
          // If response body is empty, at least verify status code
          expect(response.status).toBe(400);
        }
      }
    });
  });

  describe('game score submit endpoint', () => {
    it('should sanitize XSS payloads in address field', async () => {
      for (const payload of xssPayloads) {
        const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
          method: 'POST',
          body: JSON.stringify({
            address: payload,
            payload: {
              score: 100,
              ts: Date.now(),
              nonce: 'test-nonce',
            },
            sig: '0x' + 'a'.repeat(130),
          }),
        });

        const response = await submitScorePOST(req);
        
        // NextResponse.json() creates a Response with ReadableStream body
        const text = await response.text();
        
        // Should reject invalid address format
        expect(response.status).toBe(400);
        
        // Only parse if text is not empty
        if (text) {
          const data = JSON.parse(text);
          expect(data.success).toBe(false);
          expect(data.error).toBeDefined();
          
          // Response should not contain the XSS payload
          expect(text).not.toContain('<script>');
          expect(text).not.toContain('javascript:');
        } else {
          // If response body is empty, at least verify status code
          expect(response.status).toBe(400);
        }
      }
    });
  });
});

