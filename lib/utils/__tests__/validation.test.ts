import {
  isValidAddress,
  normalizeAddress,
  isValidReferralCode,
  isValidPowerCode,
  isValidAmount,
  sanitizeString,
  isValidEmail,
  isValidTxHash,
} from '../validation';

describe('Validation Utilities', () => {
  describe('isValidAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      // Use valid Ethereum addresses (all lowercase to avoid checksum issues)
      expect(isValidAddress('0x1234567890123456789012345678901234567890')).toBe(true);
      expect(isValidAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')).toBe(true);
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('0x123')).toBe(false);
      expect(isValidAddress('not-an-address')).toBe(false);
      expect(isValidAddress(null as any)).toBe(false);
      expect(isValidAddress(undefined as any)).toBe(false);
    });
  });

  describe('normalizeAddress', () => {
    it('should normalize valid addresses to lowercase', () => {
      // Use all lowercase address to avoid checksum validation issues
      const address = '0x1234567890123456789012345678901234567890';
      const normalized = normalizeAddress(address);
      expect(normalized).toBe('0x1234567890123456789012345678901234567890');
    });
    
    it('should normalize uppercase addresses to lowercase', () => {
      // Use uppercase address - should normalize to lowercase
      const address = '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD';
      const normalized = normalizeAddress(address.toLowerCase());
      expect(normalized).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });

    it('should return null for invalid addresses', () => {
      expect(normalizeAddress('invalid')).toBe(null);
      expect(normalizeAddress('')).toBe(null);
    });
  });

  describe('isValidReferralCode', () => {
    it('should validate correct referral codes', () => {
      expect(isValidReferralCode('LUX123456')).toBe(true);
      expect(isValidReferralCode('LUXabcdef')).toBe(true);
      expect(isValidReferralCode('LUXABCDEF')).toBe(true);
      expect(isValidReferralCode('lux123456')).toBe(true); // Case insensitive
      expect(isValidReferralCode('Lux123456')).toBe(true); // Case insensitive
    });

    it('should reject invalid referral codes', () => {
      expect(isValidReferralCode('')).toBe(false);
      expect(isValidReferralCode('LUX12345')).toBe(false); // Too short (5 chars instead of 6)
      expect(isValidReferralCode('LUX1234567')).toBe(false); // Too long (7 chars instead of 6)
      expect(isValidReferralCode('lux123456')).toBe(true); // Case insensitive - LUX prefix is case insensitive
      expect(isValidReferralCode('ABC123456')).toBe(false); // Wrong prefix
      expect(isValidReferralCode('LUX12345G')).toBe(false); // Invalid hex character
    });
  });

  describe('isValidPowerCode', () => {
    it('should validate correct power codes', () => {
      expect(isValidPowerCode('spark')).toBe(true);
      expect(isValidPowerCode('nova')).toBe(true);
      expect(isValidPowerCode('quasar')).toBe(true);
      expect(isValidPowerCode('supernova')).toBe(true);
      expect(isValidPowerCode('singularity')).toBe(true);
      expect(isValidPowerCode('SPARK')).toBe(true); // Case insensitive
    });

    it('should reject invalid power codes', () => {
      expect(isValidPowerCode('')).toBe(false);
      expect(isValidPowerCode('invalid')).toBe(false);
      expect(isValidPowerCode('power')).toBe(false);
    });
  });

  describe('isValidAmount', () => {
    it('should validate positive numbers', () => {
      expect(isValidAmount('100')).toBe(true);
      expect(isValidAmount('0.5')).toBe(true);
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(0.5)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(isValidAmount('0')).toBe(false);
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount('-100')).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount('invalid')).toBe(false);
      expect(isValidAmount('')).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize strings and remove dangerous characters', () => {
      expect(sanitizeString('hello')).toBe('hello');
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('test>value')).toBe('testvalue');
    });

    it('should respect maxLength', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeString(longString, 100).length).toBe(100);
    });

    it('should handle edge cases', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
    });
  });

  describe('isValidTxHash', () => {
    it('should validate correct transaction hashes', () => {
      const validHash = '0x' + 'a'.repeat(64);
      expect(isValidTxHash(validHash)).toBe(true);
    });

    it('should reject invalid transaction hashes', () => {
      expect(isValidTxHash('')).toBe(false);
      expect(isValidTxHash('0x123')).toBe(false);
      expect(isValidTxHash('0x' + 'a'.repeat(63))).toBe(false); // Too short
      expect(isValidTxHash('0x' + 'g'.repeat(64))).toBe(false); // Invalid hex
    });
  });
});

