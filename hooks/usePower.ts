/**
 * Custom hook for Power/Membership management
 * Handles power purchase, fetching power status
 */

import { useState, useEffect, useCallback } from 'react';
import { MiniKit, tokenToDecimals, Tokens } from '@worldcoin/minikit-js';
import { getPowerByCode, type PowerCode } from '@/lib/utils/powerConfig';
import { trackPowerPurchase } from '@/lib/utils/analytics';

export interface PowerState {
  currentPower: { code: PowerCode; name: string; totalAPY: number } | null;
  isPurchasingPower: boolean;
  isLoadingPowerData: boolean;
}

export interface PowerActions {
  handlePurchasePower: (targetCode: PowerCode) => Promise<void>;
  fetchPowerStatus: () => Promise<void>;
}

export function usePower(
  actualAddress: string | null,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void,
  onBalanceRefresh?: () => void
) {
  const [currentPower, setCurrentPower] = useState<{ code: PowerCode; name: string; totalAPY: number } | null>(null);
  const [isPurchasingPower, setIsPurchasingPower] = useState(false);
  const [isLoadingPowerData, setIsLoadingPowerData] = useState(false);

  const fetchPowerStatus = useCallback(async () => {
    if (!actualAddress) {
      setCurrentPower(null);
      return;
    }

    try {
      // Check cache first (30 second cache for power status)
      const { apiCache } = await import('@/lib/utils/apiCache');
      const cacheKey = `power:${actualAddress}`;
      const cachedPower = apiCache.get<{ code: PowerCode; name: string; totalAPY: number }>(cacheKey);
      
      if (cachedPower) {
        setCurrentPower(cachedPower);
        setIsLoadingPowerData(false);
        return;
      }

      setIsLoadingPowerData(true);
      const response = await fetch(`/api/power/active?userId=${actualAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      const data = await response.json();
      
      if (data.success && data.data?.power) {
        const powerData = {
          code: data.data.power.code,
          name: data.data.power.name,
          totalAPY: data.data.power.totalAPY,
        };
        setCurrentPower(powerData);
        
        // Cache the result (30 seconds TTL)
        apiCache.set(cacheKey, powerData, 30000);
      } else {
        setCurrentPower(null);
      }
      setIsLoadingPowerData(false);
    } catch (error: any) {
      // Silently handle fetch errors - don't show to user
      setCurrentPower(null);
      setIsLoadingPowerData(false);
    }
  }, [actualAddress]);

  const handlePurchasePower = useCallback(async (targetCode: PowerCode) => {
    if (!actualAddress) {
      onError?.('Please connect your wallet first. Solution: Connect your wallet in World App.');
      return;
    }

    setIsPurchasingPower(true);
    try {
      const initResponse = await fetch('/api/power/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCode,
          userId: actualAddress,
        }),
      });

      const initData = await initResponse.json();

      if (!initData.success) {
        const errorMessages: Record<string, { message: string; solution?: string; hint?: string }> = {
          'insufficient_balance': {
            message: 'Insufficient WLD balance',
            solution: 'Please add more WLD tokens to your wallet.',
            hint: 'You need WLD tokens to purchase Power Licenses. Check your balance first.',
          },
          'invalid_reference': {
            message: 'Invalid reference',
            solution: 'Please refresh the page and try again.',
            hint: 'The reference may have expired. Please start the purchase process again.',
          },
          'verification_failed': {
            message: 'Transaction verification failed',
            solution: 'Please try again or contact support if the problem persists.',
            hint: 'This may be a temporary issue. Please wait a moment and try again.',
          },
        };
        const errorInfo = errorMessages[initData.error] || { message: initData.error || 'Failed to initialize power purchase' };
        onError?.(`${errorInfo.message}. ${errorInfo.solution || ''} ${errorInfo.hint ? `Hint: ${errorInfo.hint}` : ''}`);
        setIsPurchasingPower(false);
        return;
      }

      const { reference, amountWLD, to, target } = initData;

      if (!MiniKit.isInstalled()) {
        onError?.('World App is required. Solution: Please open this app in World App to purchase power. Hint: World App is needed for blockchain transactions.');
        setIsPurchasingPower(false);
        return;
      }

      try {
        const tokenSymbol = Tokens.WLD;
        const amountInDecimals = tokenToDecimals(parseFloat(amountWLD), tokenSymbol);
        const tokenAmountStr = amountInDecimals.toString();

        const payPayload = {
          reference,
          to: to as `0x${string}`,
          tokens: [{
            symbol: tokenSymbol,
            token_amount: tokenAmountStr,
          }],
          description: `Purchase ${target.name} Power License`,
        };

        const { finalPayload } = await MiniKit.commandsAsync.pay(payPayload as any);

        const payloadAny = finalPayload as any;
        if (!payloadAny?.transaction_id) {
          setIsPurchasingPower(false);
          return;
        }

        const confirmResponse = await fetch('/api/power/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: finalPayload,
          }),
        });

        const confirmData = await confirmResponse.json();

        if (confirmData.success && confirmData.data?.power) {
          setCurrentPower({
            code: confirmData.data.power.code,
            name: confirmData.data.power.name,
            totalAPY: confirmData.data.power.totalAPY,
          });

          onBalanceRefresh?.();
          await fetchPowerStatus();
        
          onSuccess?.(`Activated ${confirmData.data.power.name.toUpperCase()} Power!`);
          // Track analytics
          trackPowerPurchase(confirmData.data.power.code, parseFloat(amountWLD));
        } else {
          const errorMessages: Record<string, { message: string; solution?: string; hint?: string }> = {
            'user_cancelled': {
              message: 'Payment cancelled',
              solution: 'You can try again when ready.',
            },
            'insufficient_balance': {
              message: 'Insufficient WLD balance',
              solution: 'Please add more WLD tokens to your wallet.',
              hint: 'You need WLD tokens to purchase Power Licenses.',
            },
            'invalid_reference': {
              message: 'Invalid reference',
              solution: 'Please refresh the page and try again.',
              hint: 'The reference may have expired. Please start the purchase process again.',
            },
            'verification_failed': {
              message: 'Transaction verification failed',
              solution: 'Please try again or contact support if the problem persists.',
              hint: 'This may be a temporary issue. Please wait a moment and try again.',
            },
            'draft_already_used': {
              message: 'Transaction already processed',
              solution: 'This transaction has already been completed. Please refresh the page.',
              hint: 'You may have already purchased this Power License.',
            },
          };
          const errorInfo = errorMessages[confirmData.error] || { message: confirmData.error || 'Payment failed' };
          onError?.(`${errorInfo.message}. ${errorInfo.solution || ''} ${errorInfo.hint ? `Hint: ${errorInfo.hint}` : ''}`);
        }
      } catch (payError: any) {
        const msg = String(payError?.message || '').toLowerCase();
        const code = String(payError?.code || payError?.error_code || '').toLowerCase();
        
        if (
          code.includes('user_rejected') ||
          code.includes('cancelled') ||
          code.includes('cancel') ||
          msg.includes('cancel') ||
          msg.includes('rejected') ||
          msg.includes('user')
        ) {
          setIsPurchasingPower(false);
          return;
        }

        // Check for configuration errors
        if (
          msg.includes('configuration') ||
          msg.includes('world id') ||
          msg.includes('next_public_world_app_id') ||
          msg.includes('invalid contract address') ||
          msg.includes('zero address') ||
          (payError as any)?.type === 'configuration_error'
        ) {
          onError?.(
            `Configuration error: ${payError?.message || 'Please check your World ID and contract address configuration in .env.local'}`
          );
          setIsPurchasingPower(false);
          return;
        }

        onError?.(payError?.message || 'Payment failed. Please check your configuration and try again.');
      }
    } catch (error: any) {
      // Handle user cancellation
      const errorMsg = String(error?.message || '').toLowerCase();
      const errorCode = String(error?.code || error?.error_code || '').toLowerCase();
      
      if (
        errorCode.includes('user_rejected') ||
        errorCode.includes('cancelled') ||
        errorCode.includes('cancel') ||
        errorMsg.includes('cancel') ||
        errorMsg.includes('rejected') ||
        errorMsg.includes('user')
      ) {
        // User cancelled - don't show error
        setIsPurchasingPower(false);
        return;
      }

      // Check for configuration errors
      if (
        errorMsg.includes('configuration') ||
        errorMsg.includes('world id') ||
        errorMsg.includes('next_public_world_app_id') ||
        errorMsg.includes('invalid contract address') ||
        errorMsg.includes('zero address') ||
        errorMsg.includes('treasury_address') ||
        errorMsg.includes('staking_contract') ||
        (error as any)?.type === 'configuration_error'
      ) {
        onError?.(
          `Configuration error: ${error?.message || 'Please check your World ID and contract address configuration in .env.local. Make sure NEXT_PUBLIC_WORLD_APP_ID, NEXT_PUBLIC_TREASURY_ADDRESS, and NEXT_PUBLIC_STAKING_CONTRACT are set correctly.'}`
        );
        setIsPurchasingPower(false);
        return;
      }
      
      // Provide user-friendly error messages with solutions
      const errorMessages: Record<string, { message: string; solution?: string; hint?: string }> = {
        'failed to initialize power purchase': {
          message: 'Failed to start purchase',
          solution: 'Please try again or contact support if the problem persists.',
          hint: 'This may be a temporary issue. Please wait a moment and try again.',
        },
        'world app is required': {
          message: 'World App is required',
          solution: 'Please open this app in World App to purchase power.',
          hint: 'World App is needed for blockchain transactions.',
        },
        'payment failed': {
          message: 'Payment failed',
          solution: 'Please check your balance and network connection, then try again.',
          hint: 'Make sure you have enough WLD tokens and a stable internet connection.',
        },
        'insufficient balance': {
          message: 'Insufficient WLD balance',
          solution: 'Please add more WLD tokens to your wallet.',
          hint: 'You need WLD tokens to purchase Power Licenses.',
        },
      };
      
      const errorInfo = errorMessages[errorMsg];
      if (errorInfo) {
        onError?.(`${errorInfo.message}. ${errorInfo.solution || ''} ${errorInfo.hint ? `Hint: ${errorInfo.hint}` : ''}`);
      } else {
        onError?.(error?.message || 'Failed to purchase power. Please check your configuration and try again.');
      }
    } finally {
      setIsPurchasingPower(false);
    }
  }, [actualAddress, fetchPowerStatus, onSuccess, onError, onBalanceRefresh]);

  // Fetch power status when address is available
  useEffect(() => {
    if (actualAddress) {
      fetchPowerStatus();
    }
  }, [actualAddress, fetchPowerStatus]);

  return {
    currentPower,
    isPurchasingPower,
    isLoadingPowerData,
    handlePurchasePower,
    fetchPowerStatus,
  };
}

