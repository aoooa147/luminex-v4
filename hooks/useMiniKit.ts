import { useEffect, useState, useCallback } from 'react';
import { MiniKit, VerificationLevel, ISuccessResult, MiniAppWalletAuthSuccessPayload, tokenToDecimals, Tokens } from '@worldcoin/minikit-js';
// import { applyMiniKitCompatShim } from '@/lib/minikit/compat'; // Disabled - causes map error

/**
 * useMiniKit - thin wrapper around official MiniKit-JS
 * Works only inside World App (MiniKit.isInstalled() === true)
 */
export const useMiniKit = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // DO NOT apply compat shim - it causes map error
      // applyMiniKitCompatShim();
      // Use MiniKit SDK directly without transformation
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

      // Validate World ID configuration
      const worldAppId = process.env.NEXT_PUBLIC_WORLD_APP_ID;
      if (!worldAppId || worldAppId.trim() === '') {
        throw new Error('World ID configuration error: NEXT_PUBLIC_WORLD_APP_ID is not set. Please configure it in .env.local');
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
        throw new Error('Invalid toAddress: cannot use zero address. Please configure NEXT_PUBLIC_TREASURY_ADDRESS correctly in .env.local');
      }

      // Validate contract address format
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(toAddress);
      if (!isValidAddress) {
        throw new Error(`Invalid contract address format: ${toAddress}. Please check NEXT_PUBLIC_TREASURY_ADDRESS or NEXT_PUBLIC_STAKING_CONTRACT configuration.`);
      }

      const safeToken = (token || 'WLD') as PayToken;
      const safeAmount = String(amount);

      // Allow 0 amount for transaction confirmation (used in game rewards)
      if (!safeAmount || isNaN(parseFloat(safeAmount)) || parseFloat(safeAmount) < 0) {
        throw new Error(`Invalid amount: must be a non-negative number, got: ${safeAmount}`);
      }
      
      // For 0 amount, we still need to send a valid decimal amount (minimum 1 wei)
      // But MiniKit requires at least 0.000001 for display purposes
      const parsedAmount = parseFloat(safeAmount);
      if (parsedAmount === 0) {
        // Use a very small amount (0.000001) for 0-amount transactions
        // This is just for UI display - the actual reward is handled by the contract
        const minAmount = '0.000001';
        console.log('⚠️ Zero amount detected, using minimum amount for MiniKit:', minAmount);
        const tokenSymbol = safeToken === 'WLD' ? Tokens.WLD : Tokens.USDC;
        const amountInDecimals = tokenToDecimals(parseFloat(minAmount), tokenSymbol);
        const tokenAmountStr = amountInDecimals.toString();

        const payload = {
          reference: referenceId,
          to: toAddress,
          tokens: [{
            symbol: tokenSymbol,
            token_amount: tokenAmountStr
          }],
          description: `Transaction confirmation (reward will be distributed separately)`,
        };

        console.log('🔍 MiniKit PAY payload (zero-amount override) →', JSON.stringify(payload, null, 2));
        
        try {
          const { finalPayload } = await MiniKit.commandsAsync.pay(payload as any);
          console.log('✅ MiniKit pay succeeded (zero-amount), finalPayload:', finalPayload);
          return finalPayload;
        } catch (err: any) {
          console.error('❌ MiniKit pay error (zero-amount) →', err);
          throw err;
        }
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

        // Check for configuration errors
        if (
          msg.includes('invalid') && (msg.includes('address') || msg.includes('contract')) ||
          msg.includes('configuration') ||
          code.includes('config')
        ) {
          const configError = new Error(
            `Transaction failed due to configuration error. Please check:\n` +
            `1. NEXT_PUBLIC_WORLD_APP_ID is set correctly in .env.local\n` +
            `2. NEXT_PUBLIC_TREASURY_ADDRESS is a valid contract address\n` +
            `3. Contract address matches your deployed contract\n` +
            `Original error: ${err?.message || 'Unknown error'}`
          );
          (configError as any).type = 'configuration_error';
          (configError as any).originalError = err;
          throw configError;
        }
        
        throw err;
      }
    },
    []
  );

  /**
   * Send transaction (for contract interactions and receiving tokens)
   * This shows "Authorize Transaction" popup instead of "Pay" popup
   * Use this for receiving tokens/rewards - it shows "Authorize Transaction" which is correct for receiving
   * Updated to use MiniKit SDK v1.9.8+ format with actions array
   * 
   * @param toAddress - Contract or recipient address
   * @param data - Transaction data (contract call data). Use '0x' or empty for simple transfers/receiving
   * @param value - Transaction value in wei (default: '0' for receiving tokens)
   * @param network - Network name (default: 'worldchain')
   * @returns {Promise<{transaction_id: string, ...}>} Transaction result with transaction_id
   */
  const sendTransaction = useCallback(
    async (
      toAddress: `0x${string}`,
      data: string = '0x',
      value: string = '0',
      network: string = 'worldchain'
    ) => {
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit is not installed. Open inside World App.');
      }

      // Validate World ID configuration
      const worldAppId = process.env.NEXT_PUBLIC_WORLD_APP_ID;
      if (!worldAppId || worldAppId.trim() === '') {
        throw new Error('World ID configuration error: NEXT_PUBLIC_WORLD_APP_ID is not set. Please configure it in .env.local');
      }

      if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
        throw new Error(`Invalid toAddress: must be a valid Ethereum address, got: ${toAddress}`);
      }

      // Check for zero address
      if (toAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid toAddress: cannot use zero address. Please configure NEXT_PUBLIC_STAKING_CONTRACT correctly in .env.local');
      }

      // Validate contract address format
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(toAddress);
      if (!isValidAddress) {
        throw new Error(`Invalid contract address format: ${toAddress}. Please check NEXT_PUBLIC_STAKING_CONTRACT configuration.`);
      }

      // Convert value to hex string if it's not already
      let hexValue = value || '0';
      if (!hexValue.startsWith('0x')) {
        // Convert decimal string to hex
        try {
          const numValue = BigInt(hexValue);
          hexValue = '0x' + numValue.toString(16);
        } catch (e) {
          // If conversion fails, default to '0x0'
          hexValue = '0x0';
        }
      }

      // MiniKit SDK v1.9.8+ requires payload format: { network, actions: [{ to, value, data? }] }
      // DO NOT include legacy top-level fields (to, value, data) as it causes SDK confusion
      // The SDK expects ONLY the actions array format
      
      // Build action object - ensure all required fields are present
      const action: any = {
        to: toAddress,
        value: hexValue || '0x0', // Always include value, default to '0x0' if not provided
      };
      
      // Only include data if it's provided, not empty, and not just '0x'
      // For receiving tokens (value = 0, no data), we don't include data field at all
      if (data && data !== '0x' && data.length > 2 && data.trim() !== '0x') {
        action.data = data;
      }
      // If data is explicitly provided but is '0x' or empty, don't include it
      // This prevents SDK errors when handling empty transaction data

      // Create payload - use ONLY the new format with actions array
      // This is the correct format that prevents "Cannot read properties of undefined (reading 'map')" error
      const payload: any = {
        network: network || 'worldchain',
        actions: [action], // Always an array with at least one action
      };
      
      // Validate payload structure before sending
      if (!Array.isArray(payload.actions) || payload.actions.length === 0) {
        throw new Error('Invalid payload: actions array must contain at least one action');
      }
      
      // Validate each action
      payload.actions.forEach((act: any, index: number) => {
        if (!act.to || typeof act.to !== 'string' || !act.to.startsWith('0x')) {
          throw new Error(`Invalid action at index ${index}: 'to' must be a valid Ethereum address`);
        }
        if (act.value === undefined || act.value === null) {
          throw new Error(`Invalid action at index ${index}: 'value' is required`);
        }
      });

      console.log('🔍 MiniKit sendTransaction payload (receiving coins format) →', JSON.stringify(payload, null, 2));
      console.log('🔍 MiniKit environment check:', {
        isInstalled: MiniKit.isInstalled(),
        hasCommandsAsync: !!MiniKit.commandsAsync,
        hasSendTransaction: !!MiniKit.commandsAsync?.sendTransaction,
        network,
        actionsCount: payload.actions?.length || 0,
        actionHasData: !!payload.actions?.[0]?.data,
        actionValue: payload.actions?.[0]?.value,
      });

      try {
        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction(payload);
        console.log('✅ MiniKit sendTransaction succeeded, finalPayload:', finalPayload);
        return finalPayload; // { transaction_id, ... }
      } catch (err: any) {
        console.error('❌ MiniKit sendTransaction error →', {
          message: err?.message,
          description: err?.description,
          error_code: err?.error_code,
          code: err?.code,
          stack: err?.stack,
          fullError: err,
          payload,
        });
        
        // Detect user cancellation from SDK error
        const msg = String(err?.message || '').toLowerCase();
        const desc = String(err?.description || '').toLowerCase();
        const code = String(err?.code || err?.error_code || '').toLowerCase();
        
        // Case: User cancelled/rejected/closed the transaction window
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

        // Check for map/array errors (SDK internal errors)
        if (
          msg.includes('cannot read properties') && msg.includes('map') ||
          msg.includes('cannot read property') && msg.includes('map') ||
          msg.includes('undefined') && msg.includes('map') ||
          msg.includes('is not a function') && (msg.includes('map') || msg.includes('array'))
        ) {
          const mapError = new Error(
            `SDK internal error: Payload format issue. This usually means the payload structure is incorrect.\n` +
            `Payload sent: ${JSON.stringify(payload)}\n` +
            `Original error: ${err?.message || 'Unknown error'}\n` +
            `Please ensure payload has the format: { network: string, actions: [{ to: string, value: string, data?: string }] }`
          );
          (mapError as any).type = 'payload_format_error';
          (mapError as any).originalError = err;
          (mapError as any).payload = payload;
          console.error('❌ Payload format error detected. Payload structure:', {
            hasNetwork: !!payload?.network,
            hasActions: Array.isArray(payload?.actions),
            actionsLength: payload?.actions?.length || 0,
            actionsStructure: payload?.actions?.map((a: any) => ({
              hasTo: !!a?.to,
              hasValue: !!a?.value,
              hasData: !!a?.data,
            })),
          });
          throw mapError;
        }

        // Check for configuration errors
        if (
          msg.includes('invalid') && (msg.includes('address') || msg.includes('contract')) ||
          msg.includes('configuration') ||
          code.includes('config')
        ) {
          const configError = new Error(
            `Transaction failed due to configuration error. Please check:\n` +
            `1. NEXT_PUBLIC_WORLD_APP_ID is set correctly in .env.local\n` +
            `2. NEXT_PUBLIC_STAKING_CONTRACT is a valid contract address\n` +
            `3. Contract address matches your deployed contract\n` +
            `Original error: ${err?.message || 'Unknown error'}`
          );
          (configError as any).type = 'configuration_error';
          (configError as any).originalError = err;
          throw configError;
        }
        
        throw err;
      }
    },
    []
  );

  /**
   * Receive reward (for receiving tokens/rewards from games and faucet)
   * Uses sendTransaction command to show "Allow Transaction" popup (like "รับ 7 SUSHI")
   * This is the correct way to receive free tokens - sendTransaction shows authorization popup
   * while pay command is for payments (deducts money from user)
   * 
   * According to official MiniKit documentation:
   * - sendTransaction: For transactions that require user authorization (receiving rewards)
   * - pay: For payments that deduct money from user's wallet
   * 
   * @param referenceId - Transaction reference ID from backend (for tracking)
   * @param toAddress - Contract address that will distribute the reward
   * @param amount - Amount of tokens to receive (for display only, actual reward handled by contract)
   * @param token - Token symbol (WLD or USDC) - not used in sendTransaction, kept for compatibility
   * @param network - Network name (default: 'worldchain')
   * @returns {Promise<{transaction_id: string, reference: string, ...}>} Transaction result with transaction_id
   */
  const receiveReward = useCallback(
    async (
      referenceId: string,
      toAddress: `0x${string}`,
      amount: string,
      token: PayToken = 'WLD',
      network: string = 'worldchain'
    ) => {
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit is not installed. Open inside World App.');
      }

      // Validate World ID configuration
      const worldAppId = process.env.NEXT_PUBLIC_WORLD_APP_ID;
      if (!worldAppId || worldAppId.trim() === '') {
        throw new Error('World ID configuration error: NEXT_PUBLIC_WORLD_APP_ID is not set. Please configure it in .env.local');
      }

      // Validate inputs
      if (!referenceId || typeof referenceId !== 'string' || referenceId.length < 8) {
        throw new Error('Invalid referenceId: must be a non-empty string with at least 8 characters');
      }

      if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
        throw new Error(`Invalid toAddress: must be a valid Ethereum address, got: ${toAddress}`);
      }

      // Check for zero address
      if (toAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid toAddress: cannot use zero address. Please configure NEXT_PUBLIC_STAKING_CONTRACT correctly in .env.local');
      }

      // Validate contract address format
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(toAddress);
      if (!isValidAddress) {
        throw new Error(`Invalid contract address format: ${toAddress}. Please check NEXT_PUBLIC_STAKING_CONTRACT configuration.`);
      }

      const safeAmount = String(amount);
      const safeToken = (token || 'WLD') as PayToken;

      // Validate amount - allow 0 for transaction confirmation (actual reward is handled by contract)
      if (!safeAmount || isNaN(parseFloat(safeAmount)) || parseFloat(safeAmount) < 0) {
        throw new Error(`Invalid amount: must be a non-negative number, got: ${safeAmount}`);
      }

      console.log('🎯 receiveReward: Using sendTransaction to show "Allow Transaction" popup for receiving free tokens', {
        reference: referenceId,
        toAddress,
        amount: safeAmount,
        token: safeToken,
        network,
        note: 'sendTransaction is correct for receiving free tokens - shows "Allow Transaction" popup without deducting money',
      });

      // Use sendTransaction to show "Allow Transaction" popup
      // This is the correct way to receive free tokens according to official MiniKit documentation
      // sendTransaction shows authorization popup without deducting money from user
      // This matches the example image (Free Sushi) which shows "Allow Transaction" with receive amount
      
      // For receiving free tokens, we use sendTransaction with value = 0
      // The actual reward distribution is handled by the contract on the backend
      // This transaction is just for authorization - user confirms they want to receive the reward
      const hexValue = '0x0'; // Zero value - user is receiving, not paying
      
      // Build sendTransaction payload - this will show "Allow Transaction" popup
      // MiniKit SDK will show "Receive" when value is 0
      const payload: any = {
        network: network || 'worldchain',
        actions: [{
          to: toAddress,
          value: hexValue, // Zero value = receiving tokens, not paying
          // No data field needed - this is just an authorization transaction
          // The actual reward distribution happens on backend via contract
        }],
      };

      try {
        console.log('🚀 Calling sendTransaction to show "Allow Transaction" popup for receiving free tokens...');
        console.log('📱 This will show "Allow Transaction" popup (like "รับ 7 SUSHI") without deducting money');
        console.log('🔍 MiniKit sendTransaction payload (for receiving reward) →', JSON.stringify(payload, null, 2));
        console.log('🔍 Note: This is an authorization transaction (value = 0) - user is receiving, not paying');
        
        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction(payload);
        console.log('✅ MiniKit sendTransaction succeeded for receiving reward!');
        console.log('✅ Result:', finalPayload);
        
        // Return result with transaction_id and reference
        // Note: We need to add reference to the result for backend tracking
        const result = finalPayload as any;
        if (result && !result.reference) {
          result.reference = referenceId;
        }
        
        return result; // { transaction_id, reference, ... }
      } catch (err: any) {
        console.error('❌ MiniKit receiveReward (sendTransaction) error →', {
          message: err?.message,
          description: err?.description,
          error_code: err?.error_code,
          code: err?.code,
          stack: err?.stack,
          fullError: err,
        });
        
        // Detect user cancellation
        const msg = String(err?.message || '').toLowerCase();
        const desc = String(err?.description || '').toLowerCase();
        const code = String(err?.code || err?.error_code || '').toLowerCase();
        
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

        // Check for map/array errors (SDK internal errors)
        if (
          msg.includes('cannot read properties') && msg.includes('map') ||
          msg.includes('cannot read property') && msg.includes('map') ||
          msg.includes('undefined') && msg.includes('map') ||
          msg.includes('is not a function') && (msg.includes('map') || msg.includes('array'))
        ) {
          const mapError = new Error(
            `SDK internal error: Payload format issue. This usually means the payload structure is incorrect.\n` +
            `Payload sent: ${JSON.stringify(payload)}\n` +
            `Original error: ${err?.message || 'Unknown error'}\n` +
            `Please ensure payload has the format: { network: string, actions: [{ to: string, value: string }] }`
          );
          (mapError as any).type = 'payload_format_error';
          (mapError as any).originalError = err;
          (mapError as any).payload = payload;
          throw mapError;
        }

        // Check for configuration errors
        if (
          msg.includes('invalid') && (msg.includes('address') || msg.includes('contract')) ||
          msg.includes('configuration') ||
          code.includes('config')
        ) {
          const configError = new Error(
            `Transaction failed due to configuration error. Please check:\n` +
            `1. NEXT_PUBLIC_WORLD_APP_ID is set correctly in .env.local\n` +
            `2. NEXT_PUBLIC_STAKING_CONTRACT is a valid contract address\n` +
            `3. Contract address matches your deployed contract\n` +
            `Original error: ${err?.message || 'Unknown error'}`
          );
          (configError as any).type = 'configuration_error';
          (configError as any).originalError = err;
          throw configError;
        }
        
        throw err;
      }
    },
    [] // No dependencies - sendTransaction is already defined in the same hook
  );

  return { ready, error, verify, walletAuth, pay, sendTransaction, receiveReward };
};
