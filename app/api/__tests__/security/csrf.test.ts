/**
 * Security Tests: CSRF Protection
 * Tests for CSRF token validation
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET as getCSRFToken } from '@/app/api/csrf-token/route';
import { validateCSRFToken, requireCSRFToken } from '@/lib/security/csrf';

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Security: CSRF Protection', () => {
  describe('CSRF token generation', () => {
    it('should generate a CSRF token', async () => {
      const req = new NextRequest('http://localhost:3000/api/csrf-token');
      const response = await getCSRFToken(req);
      
      expect(response.status).toBe(200);
      
      // NextResponse.json() creates a Response with ReadableStream body
      // We need to read it properly using text() then parse JSON
      const text = await response.text();
      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(0);
      
      const data = JSON.parse(text);
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      // createSuccessResponse spreads data object at root level
      // So { token } becomes { success: true, token: "..." }
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);

      // Check that cookie is set
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      if (setCookieHeader) {
        expect(setCookieHeader).toContain('csrf-token');
        expect(setCookieHeader).toContain('HttpOnly');
      }
    });

    it('should generate different tokens for different requests', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/csrf-token');
      const req2 = new NextRequest('http://localhost:3000/api/csrf-token');

      const response1 = await getCSRFToken(req1);
      const response2 = await getCSRFToken(req2);

      // Read response bodies using text() then parse JSON
      const text1 = await response1.text();
      const text2 = await response2.text();
      
      expect(text1).toBeTruthy();
      expect(text2).toBeTruthy();
      
      const data1 = JSON.parse(text1);
      const data2 = JSON.parse(text2);

      // Tokens should be different (very high probability)
      expect(data1).toBeDefined();
      expect(data2).toBeDefined();
      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
      expect(data1.token).toBeDefined();
      expect(data2.token).toBeDefined();
      expect(data1.token).not.toBe(data2.token);
    });
  });

  describe('CSRF token validation', () => {
    it('should allow GET requests without CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(true);
    });

    it('should allow HEAD requests without CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'HEAD',
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(true);
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(true);
    });

    it('should reject POST requests without CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(false);
    });

    it('should reject POST requests with only cookie token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          cookie: 'csrf-token=test-token-123',
        },
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(false);
    });

    it('should reject POST requests with only header token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          'x-csrf-token': 'test-token-123',
        },
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(false);
    });

    it('should reject POST requests with mismatched tokens', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          cookie: 'csrf-token=token-from-cookie',
          'x-csrf-token': 'token-from-header',
        },
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(false);
    });

    it('should accept POST requests with matching tokens', () => {
      const token = 'matching-token-123';
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          cookie: `csrf-token=${token}`,
          'x-csrf-token': token,
        },
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(true);
    });

    it('should reject PUT requests without CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'PUT',
        body: JSON.stringify({ test: 'data' }),
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(false);
    });

    it('should reject DELETE requests without CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE',
      });

      const isValid = validateCSRFToken(req);
      expect(isValid).toBe(false);
    });
  });

  describe('requireCSRFToken', () => {
    it('should return valid=true for valid CSRF token', () => {
      const token = 'valid-token-123';
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          cookie: `csrf-token=${token}`,
          'x-csrf-token': token,
        },
      });

      const result = requireCSRFToken(req);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid=false for invalid CSRF token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      const result = requireCSRFToken(req);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

