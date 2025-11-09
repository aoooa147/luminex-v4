/**
 * Unit tests for useWallet hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useWallet } from '../useWallet';
import * as MiniKit from '@worldcoin/minikit-js';
import * as analytics from '@/lib/utils/analytics';

// Mock dependencies
jest.mock('@worldcoin/minikit-js');
jest.mock('@/lib/utils/analytics');
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Contract: jest.fn(),
    formatUnits: jest.fn((value) => value.toString()),
  },
}));

describe('useWallet', () => {
  const mockMiniKit = {
    connect: jest.fn(),
    requestPayment: jest.fn(),
    getSigner: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (MiniKit.MiniKit as jest.Mock).mockReturnValue(mockMiniKit);
    (analytics.trackWalletConnect as jest.Mock).mockResolvedValue(undefined);
    (analytics.setUserId as jest.Mock).mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize with default state when no address provided', () => {
      const { result } = renderHook(() => useWallet(null));

      expect(result.current.wallet).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.balance).toBe(0);
      expect(result.current.wldBalance).toBe(0);
      expect(result.current.isLoadingBalance).toBe(false);
    });

    it('should initialize with verified address when provided', () => {
      const verifiedAddress = '0x1234567890123456789012345678901234567890';
      const { result } = renderHook(() => useWallet(verifiedAddress));

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('connectWallet', () => {
    it('should return early when MiniKit is not available', async () => {
      (window as any).MiniKit = undefined;

      const { result } = renderHook(() => useWallet(null));

      await result.current.connectWallet();

      // Should not throw error, just return early
      expect(result.current.isConnected).toBe(false);
    });

    it('should set wallet when verified address is provided', () => {
      const verifiedAddress = '0x1234567890123456789012345678901234567890';
      const { result } = renderHook(() => useWallet(verifiedAddress));

      // Wallet should be set from verified address
      expect(result.current.isConnected).toBe(true);
      expect(result.current.actualAddress).toBe(verifiedAddress);
    });
  });

  describe('fetchBalance', () => {
    it('should return early when no address is provided', async () => {
      const { result } = renderHook(() => useWallet(null));

      await result.current.fetchBalance();

      expect(result.current.balance).toBe(0);
      expect(result.current.wldBalance).toBe(0);
      expect(result.current.isLoadingBalance).toBe(false);
    });

    it('should return early when MiniKit is not available', async () => {
      const verifiedAddress = '0x1234567890123456789012345678901234567890';
      const { result } = renderHook(() => useWallet(verifiedAddress));

      // Mock window.MiniKit to simulate MiniKit not available
      (window as any).MiniKit = undefined;

      await result.current.fetchBalance();

      // Should return early without setting loading state
      expect(result.current.wldBalance).toBe(0);
      expect(result.current.balance).toBe(0);
    });
  });

  describe('requestPayment', () => {
    it('should return error when MiniKit is not available', async () => {
      const verifiedAddress = '0x1234567890123456789012345678901234567890';
      const { result } = renderHook(() => useWallet(verifiedAddress));

      // Mock window.MiniKit to simulate MiniKit not available
      (window as any).MiniKit = undefined;

      const params = {
        amount: '1.0',
        currency: 'WLD',
        description: 'Test payment',
      };

      const result_payment = await result.current.requestPayment(params);

      expect(result_payment.success).toBe(false);
      expect(result_payment.error).toContain('World App');
    });

    it('should return error for invalid amount', async () => {
      const verifiedAddress = '0x1234567890123456789012345678901234567890';
      const { result } = renderHook(() => useWallet(verifiedAddress));

      const params = {
        amount: '0',
        currency: 'WLD',
        description: 'Test payment',
      };

      const result_payment = await result.current.requestPayment(params);

      expect(result_payment.success).toBe(false);
      expect(result_payment.error).toContain('Invalid amount');
    });
  });
});

