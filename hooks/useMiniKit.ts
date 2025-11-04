import { useEffect, useState, useCallback } from 'react';
import { MiniKit, VerificationLevel, ISuccessResult, MiniAppWalletAuthSuccessPayload, tokenToDecimals, Tokens } from '@worldcoin/minikit-js';

/**
 * useMiniKit - thin wrapper around official MiniKit-JS
 * Works only inside World App (MiniKit.isInstalled() === true)
 */
export const useMiniKit = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setReady(MiniKit.isInstalled());
    } catch (e: any) {
      setReady(false);
      setError(e?.message || 'MiniKit detection failed');
    }
  }, []);

  const verify = useCallback(async (action: string) => {
    if (!MiniKit.isInstalled()) throw new Error('MiniKit is not installed. Open inside World App.');
    const { finalPayload } = await MiniKit.commandsAsync.verify({
      action,
      verification_level: VerificationLevel.Orb,
    });
    return finalPayload as ISuccessResult; // send to /api/verify
  }, []);

  const walletAuth = useCallback(async () => {
    if (!MiniKit.isInstalled()) throw new Error('MiniKit is not installed. Open inside World App.');
    // Generate nonce for wallet auth
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce });
    return finalPayload as MiniAppWalletAuthSuccessPayload;
  }, []);

  type PayToken = 'WLD' | 'USDC';

  const pay = useCallback(
    async (
      referenceId: string,
      toAddress: `0x${string}`,
      amount: string,
      token: PayToken = 'WLD'
    ) => {
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit is not installed. Open inside World App.');
      }

      // Validate inputs before building payload
      if (!referenceId || typeof referenceId !== 'string' || referenceId.length < 8) {
        throw new Error('Invalid referenceId: must be a non-empty string with at least 8 characters');
      }

      if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
        throw new Error(`Invalid toAddress: must be a valid Ethereum address, got: ${toAddress}`);
      }

      // Check for zero address
      if (toAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid toAddress: cannot use zero address. Please configure NEXT_PUBLIC_TREASURY_ADDRESS correctly.');
      }

      const safeToken = (token || 'WLD') as PayToken;
      const safeAmount = String(amount);

      if (!safeAmount || isNaN(parseFloat(safeAmount)) || parseFloat(safeAmount) <= 0) {
        throw new Error(`Invalid amount: must be a positive number, got: ${safeAmount}`);
      }

      // Convert amount to decimals using tokenToDecimals() as per MiniKit documentation
      // WLD has 18 decimals, USDC has 6 decimals
      // Example: tokenToDecimals(1, Tokens.WLD) = 1000000000000000000 (1 * 10^18)
      const tokenSymbol = safeToken === 'WLD' ? Tokens.WLD : Tokens.USDC;
      const amountInDecimals = tokenToDecimals(parseFloat(safeAmount), tokenSymbol);
      const tokenAmountStr = amountInDecimals.toString();

      // MiniKit v1.9.8+ requires tokens as TokensPayload array with symbol and token_amount
      // token_amount MUST be in smallest unit (decimals) as per documentation
      const payload = {
        reference: referenceId,
        to: toAddress,
        tokens: [{
          symbol: tokenSymbol, // Tokens.WLD or Tokens.USDC (enum, not string)
          token_amount: tokenAmountStr // Amount in decimals (e.g., "1000000000000000000" for 1 WLD)
        }],
        description: `Payment of ${safeAmount} ${safeToken}`, // Required in v1.9.8+
      };

      // Log the exact payload being sent to MiniKit SDK
      console.log('🔍 MiniKit PAY payload →', JSON.stringify(payload, null, 2));
      console.log('🔍 MiniKit environment check:', {
        isInstalled: MiniKit.isInstalled(),
        hasCommandsAsync: !!MiniKit.commandsAsync,
        hasPay: !!MiniKit.commandsAsync?.pay,
      });

            try {
        const { finalPayload } = await MiniKit.commandsAsync.pay(payload as any);                                                                               
        console.log('✅ MiniKit pay succeeded, finalPayload:', finalPayload);  
        return finalPayload; // { transaction_id, reference, ... }
      } catch (err: any) {
        console.error('❌ MiniKit pay full error →', {
          message: err?.message,
          description: err?.description,
          error_code: err?.error_code,
          code: err?.code,
          stack: err?.stack,
          fullError: err,
        });
        
        // Detect user cancellation from SDK error
        const msg = String(err?.message || '').toLowerCase();
        const desc = String(err?.description || '').toLowerCase();
        const code = String(err?.code || err?.error_code || '').toLowerCase();
        
        // Case: User cancelled/rejected/closed the payment window
        if (
          code.includes('user_rejected') || 
          code.includes('cancelled') || 
          code.includes('cancel') ||
          msg.includes('cancel') || 
          msg.includes('rejected') ||
          msg.includes('user') ||
          desc.includes('cancel') ||
          desc.includes('rejected')
        ) {
          const e = new Error('user_cancelled');
          (e as any).type = 'user_cancelled';
          (e as any).originalError = err;
          throw e;
        }
        
        throw err;
      }
    },
    []
  );

  return { ready, error, verify, walletAuth, pay };
};
