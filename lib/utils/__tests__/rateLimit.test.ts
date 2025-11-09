/**
 * Unit tests for rateLimit.ts
 */

import { takeToken } from '../rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    // Clear the bucket by creating a new instance
    jest.resetModules();
  });

  describe('takeToken', () => {
    it('should allow request when tokens available', () => {
      const result = takeToken('test-key', 10, 1);
      expect(result).toBe(true);
    });

    it('should deny request when tokens exhausted', () => {
      const key = 'test-key-exhausted';
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        takeToken(key, 10, 1);
      }
      // Next request should be denied
      const result = takeToken(key, 10, 1);
      expect(result).toBe(false);
    });

    it('should refill tokens over time', (done) => {
      const key = 'test-key-refill';
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        takeToken(key, 10, 1);
      }
      // Should be denied immediately
      expect(takeToken(key, 10, 1)).toBe(false);
      
      // Wait for refill (1 token per second, so wait 1.1 seconds)
      setTimeout(() => {
        const result = takeToken(key, 10, 1);
        expect(result).toBe(true);
        done();
      }, 1100);
    }, 2000);

    it('should handle different keys independently', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      
      // Exhaust key1
      for (let i = 0; i < 10; i++) {
        takeToken(key1, 10, 1);
      }
      
      // key2 should still have tokens
      expect(takeToken(key1, 10, 1)).toBe(false);
      expect(takeToken(key2, 10, 1)).toBe(true);
    });

    it('should respect custom capacity', () => {
      const key = 'test-key-capacity';
      // Should allow 5 requests with capacity 5
      for (let i = 0; i < 5; i++) {
        expect(takeToken(key, 5, 1)).toBe(true);
      }
      // 6th request should be denied
      expect(takeToken(key, 5, 1)).toBe(false);
    });

    it('should respect custom refill rate', (done) => {
      const key = 'test-key-refill-rate';
      // Exhaust tokens with capacity 10
      for (let i = 0; i < 10; i++) {
        takeToken(key, 10, 2); // 2 tokens per second
      }
      
      // Should be denied immediately
      expect(takeToken(key, 10, 2)).toBe(false);
      
      // With refill rate of 2 tokens/second, should have 2 tokens after 1 second
      setTimeout(() => {
        expect(takeToken(key, 10, 2)).toBe(true);
        expect(takeToken(key, 10, 2)).toBe(true);
        expect(takeToken(key, 10, 2)).toBe(false);
        done();
      }, 1100);
    }, 2000);

    it('should cap tokens at capacity', () => {
      const key = 'test-key-cap';
      // Take one token
      takeToken(key, 10, 1);
      
      // Wait long enough to exceed capacity
      jest.useFakeTimers();
      jest.advanceTimersByTime(20000); // 20 seconds, should refill 20 tokens but capped at 10
      
      // Should still be capped at capacity
      let available = 0;
      while (takeToken(key, 10, 1)) {
        available++;
      }
      expect(available).toBeLessThanOrEqual(10);
      
      jest.useRealTimers();
    });
  });
});

