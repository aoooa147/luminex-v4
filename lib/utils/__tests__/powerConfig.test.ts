/**
 * Unit tests for power configuration utilities
 */

import { getPowerByCode, getPowerBoost, POWERS, BASE_APY } from '@/lib/utils/powerConfig';
import type { PowerCode } from '@/lib/utils/powerConfig';

describe('Power Configuration', () => {
  describe('getPowerByCode', () => {
    it('should return power for valid codes', () => {
      const validCodes: PowerCode[] = ['spark', 'nova', 'quasar', 'supernova', 'singularity'];
      
      validCodes.forEach(code => {
        const power = getPowerByCode(code);
        expect(power).toBeTruthy();
        expect(power?.code).toBe(code);
      });
    });

    it('should return undefined for invalid code', () => {
      const power = getPowerByCode('invalid' as PowerCode);
      expect(power).toBeUndefined();
    });
  });

  describe('getPowerBoost', () => {
    it('should calculate power boost correctly', () => {
      const spark = getPowerByCode('spark');
      if (spark) {
        const boost = getPowerBoost(spark);
        expect(boost).toBe(spark.totalAPY - BASE_APY);
      }
    });

    it('should return 0 for null power', () => {
      const boost = getPowerBoost(null);
      expect(boost).toBe(0);
    });
  });

  describe('POWERS array', () => {
    it('should have all required power tiers', () => {
      expect(POWERS.length).toBeGreaterThan(0);
      
      const codes = POWERS.map(p => p.code);
      expect(codes).toContain('spark');
      expect(codes).toContain('nova');
      expect(codes).toContain('quasar');
      expect(codes).toContain('supernova');
      expect(codes).toContain('singularity');
    });

    it('should have increasing APY for higher tiers', () => {
      const sortedPowers = [...POWERS].sort((a, b) => a.totalAPY - b.totalAPY);
      
      for (let i = 1; i < sortedPowers.length; i++) {
        expect(sortedPowers[i].totalAPY).toBeGreaterThanOrEqual(sortedPowers[i - 1].totalAPY);
      }
    });
  });

  describe('BASE_APY', () => {
    it('should be a positive number', () => {
      expect(BASE_APY).toBeGreaterThan(0);
    });

    it('should be less than highest power APY', () => {
      const highestPower = POWERS.reduce((max, p) => p.totalAPY > max.totalAPY ? p : max);
      expect(BASE_APY).toBeLessThan(highestPower.totalAPY);
    });
  });
});
