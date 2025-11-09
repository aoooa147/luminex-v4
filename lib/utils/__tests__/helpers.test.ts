/**
 * Unit tests for helpers.ts
 */

import {
  formatNumber,
  generateInviteLink,
  generateDeepLink,
  getReferralCodeFromURL,
} from '../helpers';
import * as constants from '../constants';

// Mock constants
jest.mock('../constants', () => ({
  WORLD_APP_ID: 'app_test123',
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatNumber', () => {
    it('should format number with default decimals', () => {
      expect(formatNumber(1234.567)).toBe('1,234.57');
    });

    it('should format number with custom decimals', () => {
      expect(formatNumber(1234.567, 4)).toBe('1,234.5670');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234.567)).toBe('-1,234.57');
    });

    it('should handle NaN', () => {
      expect(formatNumber(NaN)).toBe('0.00');
    });

    it('should handle Infinity', () => {
      expect(formatNumber(Infinity)).toBe('0.00');
    });

    it('should handle large numbers', () => {
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(0.001, 4)).toBe('0.0010');
    });
  });

  describe('generateInviteLink', () => {
    it('should generate invite link with referral code', () => {
      const code = 'LUX123456';
      const link = generateInviteLink(code);
      expect(link).toContain('world.org/mini-app');
      expect(link).toContain('app_id=app_test123');
      expect(link).toContain(encodeURIComponent(`/invite?ref=${code}`));
    });

    it('should encode referral code in URL', () => {
      const code = 'LUX ABC';
      const link = generateInviteLink(code);
      expect(link).toContain(encodeURIComponent(`/invite?ref=${code}`));
    });
  });

  describe('generateDeepLink', () => {
    it('should generate deep link with referral code', () => {
      const code = 'LUX123456';
      const link = generateDeepLink(code);
      expect(link).toContain('worldapp://mini-app');
      expect(link).toContain('app_id=app_test123');
      expect(link).toContain(encodeURIComponent(`/invite?ref=${code}`));
    });

    it('should encode referral code in deep link', () => {
      const code = 'LUX ABC';
      const link = generateDeepLink(code);
      expect(link).toContain(encodeURIComponent(`/invite?ref=${code}`));
    });
  });

  describe('getReferralCodeFromURL', () => {
    it('should return referral code from ref parameter', () => {
      // Mock window.location
      delete (window as any).location;
      (window as any).location = {
        search: '?ref=LUX123456',
      };

      const code = getReferralCodeFromURL();
      expect(code).toBe('LUX123456');
    });

    it('should return referral code from code parameter', () => {
      delete (window as any).location;
      (window as any).location = {
        search: '?code=LUX789012',
      };

      const code = getReferralCodeFromURL();
      expect(code).toBe('LUX789012');
    });

    it('should return null when no referral code in URL', () => {
      delete (window as any).location;
      (window as any).location = {
        search: '',
      };

      const code = getReferralCodeFromURL();
      expect(code).toBeNull();
    });

    it('should return null in server environment', () => {
      const originalWindow = global.window;
      delete (global.window as any);

      const code = getReferralCodeFromURL();
      expect(code).toBeNull();

      global.window = originalWindow;
    });
  });
});

