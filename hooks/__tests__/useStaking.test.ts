/**
 * Unit tests for useStaking hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useStaking } from '../useStaking';
import * as analytics from '@/lib/utils/analytics';

// Mock dependencies
jest.mock('@/lib/utils/analytics');
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Contract: jest.fn(),
    formatUnits: jest.fn((value) => value.toString()),
    parseUnits: jest.fn((value) => value),
  },
}));

describe('useStaking', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const mockProvider = {} as any;
  const actualAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    (analytics.trackStaking as jest.Mock).mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useStaking(actualAddress, mockProvider, 0, mockOnSuccess, mockOnError)
      );

      expect(result.current.stakedAmount).toBe(0);
      expect(result.current.pendingRewards).toBe(0);
      expect(result.current.isStaking).toBe(false);
      expect(result.current.isClaiming).toBe(false);
      expect(result.current.isWithdrawing).toBe(false);
    });

    it('should initialize with null address', () => {
      const { result } = renderHook(() =>
        useStaking(null, mockProvider, 0, mockOnSuccess, mockOnError)
      );

      expect(result.current.stakedAmount).toBe(0);
      expect(result.current.pendingRewards).toBe(0);
    });
  });

  describe('fetchStakingData', () => {
    it('should return early when provider or address is missing', async () => {
      const { result } = renderHook(() =>
        useStaking(null, null, 0, mockOnSuccess, mockOnError)
      );

      await result.current.fetchStakingData();

      expect(result.current.stakedAmount).toBe(0);
      expect(result.current.pendingRewards).toBe(0);
    });

    it('should return early when STAKING_CONTRACT_ADDRESS is not set', async () => {
      // Mock STAKING_CONTRACT_ADDRESS to be empty
      jest.doMock('@/lib/utils/constants', () => ({
        ...jest.requireActual('@/lib/utils/constants'),
        STAKING_CONTRACT_ADDRESS: '',
      }));

      const { result } = renderHook(() =>
        useStaking(actualAddress, mockProvider, 0, mockOnSuccess, mockOnError)
      );

      await result.current.fetchStakingData();

      expect(result.current.stakedAmount).toBe(0);
      expect(result.current.pendingRewards).toBe(0);
    });
  });

  describe('handleStake', () => {
    it('should return early when address is missing', async () => {
      const { result } = renderHook(() =>
        useStaking(null, mockProvider, 0, mockOnSuccess, mockOnError)
      );

      await result.current.handleStake('1.0', 0, 10.0);

      // Should not call onSuccess or onError when address is missing
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should handle insufficient balance', async () => {
      const { result } = renderHook(() =>
        useStaking(actualAddress, mockProvider, 0, mockOnSuccess, mockOnError)
      );

      await result.current.handleStake('10.0', 0, 5.0);

      // Should call onError when balance is insufficient
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  describe('handleClaimRewards', () => {
    it('should return early when address is missing', async () => {
      const { result } = renderHook(() =>
        useStaking(null, mockProvider, 0, mockOnSuccess, mockOnError)
      );

      await result.current.handleClaimRewards();

      // Should not call onSuccess or onError when address is missing
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('handleWithdrawBalance', () => {
    it('should return early when address is missing', async () => {
      const { result } = renderHook(() =>
        useStaking(null, mockProvider, 0, mockOnSuccess, mockOnError)
      );

      await result.current.handleWithdrawBalance();

      // Should not call onSuccess or onError when address is missing
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});


