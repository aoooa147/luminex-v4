/**
 * Extended unit tests for validation.ts
 * Tests for functions that weren't covered in the original validation.test.ts
 */

import {
  isValidMembershipTier,
  isValidTxHash,
  isValidAmount,
  sanitizeString,
  isValidEmail,
} from '../validation';

describe('validation (extended)', () => {
  describe('isValidMembershipTier', () => {
    it('should validate valid membership tiers', () => {
      expect(isValidMembershipTier('bronze')).toBe(true);
      expect(isValidMembershipTier('silver')).toBe(true);
      expect(isValidMembershipTier('gold')).toBe(true);
      expect(isValidMembershipTier('platinum')).toBe(true);
      expect(isValidMembershipTier('diamond')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isValidMembershipTier('BRONZE')).toBe(true);
      expect(isValidMembershipTier('Gold')).toBe(true);
      expect(isValidMembershipTier('DIAMOND')).toBe(true);
    });

    it('should reject invalid membership tiers', () => {
      expect(isValidMembershipTier('invalid')).toBe(false);
      expect(isValidMembershipTier('premium')).toBe(false);
      expect(isValidMembershipTier('')).toBe(false);
    });
  });

  describe('isValidTxHash', () => {
    it('should validate valid transaction hash', () => {
      const validHash = '0x' + 'a'.repeat(64);
      expect(isValidTxHash(validHash)).toBe(true);
    });

    it('should reject invalid transaction hash format', () => {
      expect(isValidTxHash('0x123')).toBe(false);
      expect(isValidTxHash('0x' + 'a'.repeat(63))).toBe(false);
      expect(isValidTxHash('0x' + 'a'.repeat(65))).toBe(false);
      expect(isValidTxHash('invalid')).toBe(false);
      expect(isValidTxHash('')).toBe(false);
    });

    it('should reject non-hex characters', () => {
      expect(isValidTxHash('0x' + 'g'.repeat(64))).toBe(false);
    });
  });

  describe('isValidAmount', () => {
    it('should validate positive numbers', () => {
      expect(isValidAmount(10)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
      expect(isValidAmount(1000.5)).toBe(true);
    });

    it('should validate positive number strings', () => {
      expect(isValidAmount('10')).toBe(true);
      expect(isValidAmount('0.01')).toBe(true);
      expect(isValidAmount('1000.5')).toBe(true);
    });

    it('should reject zero', () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount('0')).toBe(false);
    });

    it('should reject negative numbers', () => {
      expect(isValidAmount(-10)).toBe(false);
      expect(isValidAmount('-10')).toBe(false);
    });

    it('should reject invalid strings', () => {
      expect(isValidAmount('invalid')).toBe(false);
      expect(isValidAmount('')).toBe(false);
      expect(isValidAmount('abc')).toBe(false);
    });

    it('should reject NaN', () => {
      expect(isValidAmount(NaN)).toBe(false);
    });

    it('should reject Infinity', () => {
      expect(isValidAmount(Infinity)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize XSS attempts', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('Hello<script>world</script>')).toBe('Helloscriptworld/script');
    });

    it('should remove angle brackets', () => {
      expect(sanitizeString('Hello <world>')).toBe('Hello world');
      expect(sanitizeString('Test<>Test')).toBe('TestTest');
    });

    it('should respect maxLength', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeString(longString, 100).length).toBe(100);
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should validate valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid@example')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
      expect(isValidEmail(123 as any)).toBe(false);
    });
  });
});

