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

  const fetchPowerStatus = useCallback(async () => {
    if (!actualAddress) {
      setCurrentPower(null);
      return;
    }

    try {
      const response = await fetch(`/api/power/active?userId=${actualAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      const data = await response.json();
      
      if (data.success && data.data?.power) {
        setCurrentPower({
          code: data.data.power.code,
          name: data.data.power.name,
          totalAPY: data.data.power.totalAPY,
        });
      } else {
        setCurrentPower(null);
      }
    } catch (error: any) {
      // Silently handle fetch errors - don't show to user
      setCurrentPower(null);
    }
  }, [actualAddress]);

  const handlePurchasePower = useCallback(async (targetCode: PowerCode) => {
    if (!actualAddress) {
      onError?.('Please connect wallet first');
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
        const errorMessages: Record<string, string> = {
          'insufficient_balance': 'Insufficient WLD balance',
          'invalid_reference': 'Invalid reference. Please try again.',
          'verification_failed': 'Transaction verification failed',
        };
        const errorMsg = errorMessages[initData.error] || initData.error || 'Failed to initialize power purchase';
        onError?.(errorMsg);
        setIsPurchasingPower(false);
        return;
      }

      const { reference, amountWLD, to, target } = initData;

      if (!MiniKit.isInstalled()) {
        onError?.('World App is required');
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
          const errorMessages: Record<string, string> = {
            'user_cancelled': 'Payment cancelled',
            'insufficient_balance': 'Insufficient WLD balance',
            'invalid_reference': 'Invalid reference',
            'verification_failed': 'Transaction verification failed',
            'draft_already_used': 'Transaction already processed',
          };
          const errorMsg = errorMessages[confirmData.error] || confirmData.error || 'Payment failed';
          onError?.(errorMsg);
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

        onError?.(payError?.message || 'Payment failed');
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
      
      // Provide user-friendly error messages
      const errorMessages: Record<string, string> = {
        'failed to initialize power purchase': 'Failed to start purchase. Please try again.',
        'world app is required': 'Please open this app in World App to purchase power.',
        'payment failed': 'Payment failed. Please check your balance and try again.',
        'insufficient balance': 'Insufficient WLD balance. Please add more WLD to your wallet.',
      };
      
      const friendlyMessage = errorMessages[errorMsg] || error?.message || 'Failed to purchase power. Please try again.';
      onError?.(friendlyMessage);
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
    handlePurchasePower,
    fetchPowerStatus,
  };
}

