/**
 * Unit tests for useReferral hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useReferral } from '../useReferral';
import * as analytics from '@/lib/utils/analytics';

// Mock dependencies
jest.mock('@/lib/utils/analytics');

describe('useReferral', () => {
  const actualAddress = '0x1234567890123456789012345678901234567890';
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useReferral(actualAddress, true, 'en', mockOnSuccess));

      // referralCode may be generated from address in useEffect
      expect(result.current.referralCode).toBeTruthy();
      expect(result.current.totalReferrals).toBe(0);
      expect(result.current.totalEarnings).toBe(0);
      expect(result.current.copied).toBe(false);
    });

    it('should initialize with null address', () => {
      const { result } = renderHook(() => useReferral(null, false, 'en', mockOnSuccess));

      expect(result.current.referralCode).toBe('');
      expect(result.current.totalReferrals).toBe(0);
      expect(result.current.totalEarnings).toBe(0);
    });
  });

  describe('fetchReferralStats', () => {
    it('should fetch referral stats successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            code: 'LMX-AB12',
            totalReferrals: 10,
            totalEarnings: 100,
          },
        }),
      });

      const { result } = renderHook(() => useReferral(actualAddress, true, 'en', mockOnSuccess));

      await act(async () => {
        await result.current.fetchReferralStats();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle fetch error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useReferral(actualAddress, true, 'en', mockOnSuccess));

      await act(async () => {
        await result.current.fetchReferralStats();
      });

      // Should handle error gracefully
    });

    it('should return default values when no address provided', async () => {
      const { result } = renderHook(() => useReferral(null, false, 'en', mockOnSuccess));

      await act(async () => {
        await result.current.fetchReferralStats();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('processReferralCode', () => {
    it('should process referral code successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Referral code processed',
        }),
      });

      const { result } = renderHook(() => useReferral(actualAddress, true, 'en', mockOnSuccess));

      await act(async () => {
        await result.current.processReferralCode('LMX-AB12');
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle processing error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Processing failed'));

      const { result } = renderHook(() => useReferral(actualAddress, true, 'en', mockOnSuccess));

      await act(async () => {
        await result.current.processReferralCode('LMX-AB12');
      });

      // Should handle error gracefully
    });
  });

  describe('setCopied', () => {
    it('should set copied state', () => {
      const { result } = renderHook(() => useReferral(actualAddress, true, 'en', mockOnSuccess));

      act(() => {
        result.current.setCopied(true);
      });

      expect(result.current.copied).toBe(true);

      act(() => {
        result.current.setCopied(false);
      });

      expect(result.current.copied).toBe(false);
    });
  });
});

