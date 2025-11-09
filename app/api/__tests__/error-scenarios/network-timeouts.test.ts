/**
 * Error Scenarios Tests: Network Timeouts
 * Tests API routes that make network requests and handle timeouts
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variables BEFORE importing modules
process.env.WORLD_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_WORLD_APP_ID = 'test-app-id';

// Mock rate limit
const mockTakeToken = jest.fn(() => true);
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: (...args: any[]) => mockTakeToken(...args),
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
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
    NEXT_PUBLIC_WORLD_APP_ID: 'test-app-id',
  },
}));

describe('Error Scenarios: Network Timeouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTakeToken.mockReturnValue(true);
  });

  describe('confirm-payment route', () => {
    it('should handle network timeout after max attempts', async () => {
      // Mock fetch to always reject
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.reject(new Error('Network timeout'));
      });

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

      // Wait for all retry attempts to complete (with real delays)
      const response = await POST(req);
      const text = await response.text();
      const data = JSON.parse(text);

      expect(response.status).toBe(502);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
      if (data.error) {
        expect(['DEVELOPER_API_TIMEOUT', 'NETWORK_ERROR']).toContain(data.error);
      }
      if (data.message) {
        expect(data.message).toMatch(/timeout|error/i);
      }
    }, 30000); // Increase timeout for retries

    it('should retry on network errors and eventually succeed', async () => {
      let attemptCount = 0;
      
      // Mock fetch to fail first 2 times, then succeed
      (global.fetch as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transaction_status: 'completed',
            status: 'success',
          }),
        } as Response);
      });

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

      // Wait for retries to complete
      const response = await POST(req);
      const text = await response.text();
      const data = JSON.parse(text);

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      if (data.transaction) {
        expect(data.transaction).toBeDefined();
      }
    }, 30000);

    it('should handle AbortController timeout', async () => {
      // Mock fetch to reject with AbortError (simulating timeout)
      (global.fetch as jest.Mock).mockImplementation(() => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        return Promise.reject(abortError);
      });

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
      const text = await response.text();
      const data = JSON.parse(text);

      expect(response.status).toBe(502);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
      if (data.error) {
        expect(['DEVELOPER_API_TIMEOUT', 'NETWORK_ERROR']).toContain(data.error);
      }
    }, 30000);

    it('should handle server errors (5xx) as retryable', async () => {
      let attemptCount = 0;
      
      // Mock fetch to return 500 error first 2 times, then 200
      (global.fetch as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transaction_status: 'completed',
            status: 'success',
          }),
        } as Response);
      });

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
      const text = await response.text();
      const data = JSON.parse(text);

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
    }, 30000);

    it('should not retry on client errors (4xx)', async () => {
      // Mock fetch to return 400 error
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 400,
          text: async () => 'Bad Request',
        } as Response);
      });

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
      const text = await response.text();
      const data = JSON.parse(text);

      expect(response.status).toBe(400);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
      // Should not retry on 4xx errors
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle connection refused errors', async () => {
      // Mock fetch to simulate connection refused
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.reject(new Error('ECONNREFUSED'));
      });

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
      const text = await response.text();
      const data = JSON.parse(text);

      // Verify error response
      expect(response.status).toBe(502);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
    }, 30000);

    it('should handle DNS resolution errors', async () => {
      // Mock fetch to simulate DNS error
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.reject(new Error('ENOTFOUND'));
      });

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
      const text = await response.text();
      const data = JSON.parse(text);

      // Verify error response
      expect(response.status).toBe(502);
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
    }, 30000);
  }); // End of 'confirm-payment route' describe block
}); // End of 'Error Scenarios: Network Timeouts' describe block
