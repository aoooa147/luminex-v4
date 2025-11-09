/**
 * Unit tests for constants
 */

import {
  TOKEN_NAME,
  LUX_TOKEN_ADDRESS,
  STAKING_CONTRACT_ADDRESS,
  POOLS,
  MEMBERSHIP_TIERS,
} from '@/lib/utils/constants';

describe('Constants', () => {
  describe('TOKEN_NAME', () => {
    it('should be defined', () => {
      expect(TOKEN_NAME).toBeDefined();
      expect(typeof TOKEN_NAME).toBe('string');
      expect(TOKEN_NAME.length).toBeGreaterThan(0);
    });
  });

  describe('LUX_TOKEN_ADDRESS', () => {
    it('should be a valid Ethereum address format', () => {
      expect(LUX_TOKEN_ADDRESS).toBeDefined();
      expect(LUX_TOKEN_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('STAKING_CONTRACT_ADDRESS', () => {
    it('should be defined (can be empty string if not deployed)', () => {
      expect(STAKING_CONTRACT_ADDRESS).toBeDefined();
      if (STAKING_CONTRACT_ADDRESS) {
        expect(STAKING_CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });
  });

  describe('POOLS', () => {
    it('should be an array', () => {
      expect(Array.isArray(POOLS)).toBe(true);
    });

    it('should have at least one pool', () => {
      expect(POOLS.length).toBeGreaterThan(0);
    });

    it('should have pools with required properties', () => {
      POOLS.forEach(pool => {
        expect(pool).toHaveProperty('id');
        expect(pool).toHaveProperty('name');
        expect(pool).toHaveProperty('apy');
        expect(pool).toHaveProperty('lockDays');
        expect(typeof pool.apy).toBe('number');
        expect(typeof pool.lockDays).toBe('number');
      });
    });
  });

  describe('MEMBERSHIP_TIERS', () => {
    it('should be an array', () => {
      expect(Array.isArray(MEMBERSHIP_TIERS)).toBe(true);
    });

    it('should have at least one tier', () => {
      expect(MEMBERSHIP_TIERS.length).toBeGreaterThan(0);
    });

    it('should have tiers with required properties', () => {
      MEMBERSHIP_TIERS.forEach(tier => {
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('price');
        expect(typeof tier.price).toBe('string');
        expect(tier).toHaveProperty('apy');
        expect(typeof tier.apy).toBe('number');
      });
    });
  });
});

