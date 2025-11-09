/**
 * Unit tests for usePower hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePower } from '../usePower';
import * as MiniKit from '@worldcoin/minikit-js';
import * as analytics from '@/lib/utils/analytics';
import * as powerConfig from '@/lib/utils/powerConfig';

// Mock dependencies
jest.mock('@worldcoin/minikit-js');
jest.mock('@/lib/utils/analytics');
jest.mock('@/lib/utils/powerConfig');

describe('usePower', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const mockOnBalanceRefresh = jest.fn();
  const actualAddress = '0x1234567890123456789012345678901234567890';

  const mockMiniKit = {
    requestPayment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (MiniKit.MiniKit as jest.Mock).mockReturnValue(mockMiniKit);
    (analytics.trackPowerPurchase as jest.Mock).mockResolvedValue(undefined);
    (powerConfig.getPowerByCode as jest.Mock).mockReturnValue({
      code: 'spark',
      name: 'Spark',
      price: '1 WLD',
      apy: 25,
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        usePower(actualAddress, mockOnSuccess, mockOnError, mockOnBalanceRefresh)
      );

      expect(result.current.currentPower).toBeNull();
      expect(result.current.isPurchasingPower).toBe(false);
    });

    it('should initialize with null address', () => {
      const { result } = renderHook(() =>
        usePower(null, mockOnSuccess, mockOnError, mockOnBalanceRefresh)
      );

      expect(result.current.currentPower).toBeNull();
      expect(result.current.isPurchasingPower).toBe(false);
    });
  });

  describe('fetchPowerStatus', () => {
    it('should fetch power status successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            power: {
              code: 'spark',
              name: 'Spark',
              totalAPY: 75,
            },
          },
        }),
      });

      const { result } = renderHook(() =>
        usePower(actualAddress, mockOnSuccess, mockOnError, mockOnBalanceRefresh)
      );

      await result.current.fetchPowerStatus();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        expect(result.current.currentPower).toEqual({
          code: 'spark',
          name: 'Spark',
          totalAPY: 75,
        });
      });
    });

    it('should handle fetch error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() =>
        usePower(actualAddress, mockOnSuccess, mockOnError, mockOnBalanceRefresh)
      );

      await result.current.fetchPowerStatus();

      // Should handle error gracefully
      expect(result.current.currentPower).toBeNull();
    });

    it('should return null when no address provided', async () => {
      const { result } = renderHook(() =>
        usePower(null, mockOnSuccess, mockOnError, mockOnBalanceRefresh)
      );

      await result.current.fetchPowerStatus();

      expect(result.current.currentPower).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('handlePurchasePower', () => {
    it('should return error when address is missing', async () => {
      const { result } = renderHook(() =>
        usePower(null, mockOnSuccess, mockOnError, mockOnBalanceRefresh)
      );

      await result.current.handlePurchasePower('spark');

      expect(mockOnError).toHaveBeenCalledWith('Please connect wallet first');
    });

    it('should return error when API init fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: 'insufficient_balance' }),
      });

      const { result } = renderHook(() =>
        usePower(actualAddress, mockOnSuccess, mockOnError, mockOnBalanceRefresh)
      );

      await result.current.handlePurchasePower('spark');

      expect(mockOnError).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});

