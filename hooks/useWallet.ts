/**
 * Custom hook for wallet management
 * Handles wallet connection, balance fetching, and provider setup
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { MiniKit, tokenToDecimals, Tokens } from '@worldcoin/minikit-js';
import { WALLET_RPC_URL, WLD_TOKEN_ADDRESS, TREASURY_ADDRESS } from '@/lib/utils/constants';
import { trackWalletConnect, setUserId } from '@/lib/utils/analytics';

// ERC20 ABI for balance checking
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export interface WalletState {
  wallet: { address: string } | null;
  isConnected: boolean;
  provider: ethers.Provider | null;
  userInfo: { name?: string; username?: string } | null;
  balance: number;
  wldBalance: number;
  isLoadingBalance: boolean;
}

export interface WalletActions {
  connectWallet: () => Promise<void>;
  requestPayment: (params: { amount: string; currency: string; description: string }) => Promise<any>;
  getSigner: () => Promise<any>;
  fetchBalance: () => Promise<void>;
  setUserInfo: (info: { name?: string; username?: string } | null) => void;
}

export function useWallet(verifiedAddress: string | null) {
  const [wallet, setWallet] = useState<{ address: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [userInfo, setUserInfo] = useState<{ name?: string; username?: string } | null>(null);
  const [balance, setBalance] = useState(0);
  const [wldBalance, setWldBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  const balanceFetchInProgress = useRef(false);

  // Get actual address (prioritize wallet, then verified address)
  const actualAddress = useMemo(() => {
    return wallet?.address || verifiedAddress || null;
  }, [wallet?.address, verifiedAddress]);

  const connectWallet = useCallback(async () => {
    try {
      // Check if MiniKit is available
      if (typeof window === 'undefined') {
        console.warn('Wallet connection: Window is not available');
        return;
      }

      const MiniKit = (window as any).MiniKit;
      
      // Check if MiniKit is installed (only available in World App)
      if (!MiniKit) {
        console.warn('Wallet connection: MiniKit is not available. Please open this app in World App.');
        return;
      }

      // Check if MiniKit.isInstalled() is available
      if (MiniKit.isInstalled && !MiniKit.isInstalled()) {
        console.warn('Wallet connection: MiniKit is not installed. Please open this app in World App.');
        return;
      }

      if (!MiniKit.commandsAsync?.walletAuth) {
        console.warn('Wallet connection: walletAuth is not available');
        return;
      }

      try {
        const nonce = crypto.randomUUID().replace(/-/g, '');
        const result = await MiniKit.commandsAsync.walletAuth({ nonce });
        const walletData = result.finalPayload;
        
        if (!walletData?.address) {
          console.error('Wallet connection: No address in wallet data', walletData);
          return;
        }
        
        setWallet({ address: walletData.address });
        setIsConnected(true);
        
        // Track wallet connection
        trackWalletConnect(walletData.address);
        setUserId(walletData.address);
        
        // Try to get username from MiniKit
        let foundUsername: string | null = null;
        try {
          if (MiniKit.user?.username) {
            foundUsername = MiniKit.user.username;
          }
        } catch (e) {
          // Silent error handling
        }
        
        if (!foundUsername) {
          try {
            if (MiniKit.getUserByAddress) {
              const worldIdUser = await MiniKit.getUserByAddress(walletData.address);
              if (worldIdUser?.username) {
                foundUsername = worldIdUser.username;
              }
            }
          } catch (e) {
            // Silent error handling
          }
        }
        
        if (walletData?.name || walletData?.username) {
          setUserInfo({ 
            name: walletData.name || foundUsername, 
            username: walletData.username || foundUsername
          });
        } else if (foundUsername) {
          setUserInfo({ name: foundUsername, username: foundUsername });
        } else {
          setUserInfo(null);
        }
        
        const rpcProvider = new ethers.JsonRpcProvider(WALLET_RPC_URL);
        setProvider(rpcProvider);
      } catch (authError: any) {
        // Handle user cancellation
        const errorMsg = String(authError?.message || '').toLowerCase();
        const errorCode = String(authError?.code || authError?.error_code || '').toLowerCase();
        
        if (
          errorCode.includes('user_rejected') ||
          errorCode.includes('cancelled') ||
          errorCode.includes('cancel') ||
          errorMsg.includes('cancel') ||
          errorMsg.includes('rejected') ||
          errorMsg.includes('user')
        ) {
          // User cancelled - don't log as error
          console.info('Wallet connection: User cancelled');
          return;
        }
        
        console.error('Wallet connection error:', authError);
        throw authError;
      }
    } catch (error: any) {
      // Error connecting wallet - log but don't show to user
      // The error will be handled by the calling component if needed
      console.error('Wallet connection error:', error);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    const addressToUse = actualAddress;
    
    if (!addressToUse) {
      setBalance(0);
      setWldBalance(0);
      return;
    }
    
    if (balanceFetchInProgress.current) {
      return;
    }

    try {
      balanceFetchInProgress.current = true;
      setIsLoadingBalance(true);
      
      const hasMiniKit = typeof window !== 'undefined' && (window as any).MiniKit;
      
      if (!hasMiniKit) {
        setWldBalance(0);
        setBalance(0);
        return;
      }
      
      try {
        const response = await fetch('/api/wld-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addressToUse }),
          cache: 'no-store'
        });
    
        const data = await response.json();
        
        if (data.success) {
          const balance = data.balance ?? data.formatted ?? 0;
          setWldBalance(balance);
          setBalance(0);
        } else {
          const worldchainProvider = new ethers.JsonRpcProvider(WALLET_RPC_URL);
          const wldContract = new ethers.Contract(WLD_TOKEN_ADDRESS, ERC20_ABI, worldchainProvider);
          const wldBalanceBN = await wldContract.balanceOf(addressToUse);
          const decimals = await wldContract.decimals().catch(() => 18);
          const wldBalanceFormatted = parseFloat(ethers.formatUnits(wldBalanceBN, decimals));
          setWldBalance(wldBalanceFormatted);
          setBalance(0);
        }
      } catch (apiError: any) {
        try {
          const worldchainProvider = new ethers.JsonRpcProvider(WALLET_RPC_URL);
          const wldContract = new ethers.Contract(WLD_TOKEN_ADDRESS, ERC20_ABI, worldchainProvider);
          const wldBalanceBN = await wldContract.balanceOf(addressToUse);
          const decimals = await wldContract.decimals().catch(() => 18);
          const wldBalanceFormatted = parseFloat(ethers.formatUnits(wldBalanceBN, decimals));
          setWldBalance(wldBalanceFormatted);
          setBalance(0);
        } catch (fallbackError: any) {
          setWldBalance(0);
          setBalance(0);
        }
      }
      
      setIsLoadingBalance(false);
      balanceFetchInProgress.current = false;
    } catch (error: any) {
      // Silently handle balance fetch errors - don't show to user
      // Balance will remain at 0 or previous value
      setWldBalance(0);
      setBalance(0);
      setIsLoadingBalance(false);
      balanceFetchInProgress.current = false;
    }
  }, [actualAddress]);

  const requestPayment = useCallback(async (params: { amount: string; currency: string; description: string }) => {
    try {
      const amountStr = String(params.amount || '0').trim();
      const amount = parseFloat(amountStr);

      if (!amount || amount <= 0 || isNaN(amount)) {
        return { success: false, error: 'Invalid amount' };
      }

      const validatedAmountStr = amountStr;
      const hasMiniKit = typeof window !== 'undefined' && (window as any).MiniKit?.commandsAsync?.pay;
      
      if (hasMiniKit) {
        try {
          const referenceResponse = await fetch('/api/initiate-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: validatedAmountStr, symbol: params.currency || 'WLD' })
          });
          
          const referenceData = await referenceResponse.json();
          if (!referenceData.id) {
            return { success: false, error: 'Failed to generate payment reference' };
          }
          
          const referenceId = referenceData.id;

          if (!referenceId || typeof referenceId !== 'string' || referenceId.length < 8) {
            return { success: false, error: 'Invalid payment reference ID' };
          }

          const treasuryAddr = String(TREASURY_ADDRESS);
          if (!treasuryAddr || !treasuryAddr.startsWith('0x') || treasuryAddr.length !== 42) {
            return { success: false, error: 'Invalid treasury address configuration' };
          }
      
          const zeroAddress = '0x0000000000000000000000000000000000000000';
          if (treasuryAddr.toLowerCase() === zeroAddress.toLowerCase()) {
            return { success: false, error: 'Treasury address not configured. Please set NEXT_PUBLIC_TREASURY_ADDRESS in environment variables.' };
          }

          if (!MiniKit?.isInstalled() || !MiniKit?.commandsAsync?.pay) {
            return { success: false, error: 'MiniKit pay API not available' };
          }

          const tokenType = (params.currency || 'WLD').toUpperCase();

          if (tokenType !== 'WLD' && tokenType !== 'USDC') {
            return { success: false, error: `Unsupported token: ${tokenType}. Only WLD and USDC are supported.` };
          }

          const finalAmountStr = validatedAmountStr;

          if (!finalAmountStr || isNaN(parseFloat(finalAmountStr)) || parseFloat(finalAmountStr) <= 0) {
            return { success: false, error: 'Invalid amount format' };
          }

          const tokenSymbol = tokenType === 'WLD' ? Tokens.WLD : Tokens.USDC;
          const amountInDecimals = tokenToDecimals(parseFloat(finalAmountStr), tokenSymbol);
          const tokenAmountStr = amountInDecimals.toString();

          const payPayload = {
            reference: referenceId,
            to: treasuryAddr,
            tokens: [{
              symbol: tokenSymbol,
              token_amount: tokenAmountStr
            }],
            description: params.description || `Payment of ${finalAmountStr} ${tokenType}`,
          };

          let payResult;
          try {
            payResult = await MiniKit.commandsAsync.pay(payPayload);
          } catch (payApiError: any) {
            const msg = String(payApiError?.message || '').toLowerCase();
            const desc = String(payApiError?.description || '').toLowerCase();
            const code = String(payApiError?.code || payApiError?.error_code || '').toLowerCase();
            
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
              return {
                success: false,
                error: 'user_cancelled',
                userCancelled: true
              };
            }
            
            return {
              success: false,
              error: payApiError?.message || payApiError?.description || 'Payment failed: MiniKit API error'
            };
          }

          const finalPayload = payResult?.finalPayload;

          if (!finalPayload) {
            return { success: false, error: 'Payment failed: No transaction data received' };
          }

          const payloadAny = finalPayload as any;
          if (payloadAny?.status === 'error' || !payloadAny?.transaction_id) {
            const msg = String(payloadAny?.description || payloadAny?.error_code || '').toLowerCase();
            if (
              msg.includes('cancel') || 
              msg.includes('rejected') ||
              msg.includes('user') ||
              !payloadAny?.transaction_id
            ) {
              return {
                success: false,
                error: 'user_cancelled',
                userCancelled: true
              };
            }
            
            return {
              success: false,
              error: payloadAny.description || payloadAny.error_code || 'Payment failed: MiniKit returned error'
            };
          }

          try {
            const confirmResponse = await fetch('/api/confirm-payment', {       
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payload: finalPayload })
            });
            const confirmData = await confirmResponse.json();
    
            if (!confirmData.success) {
              return {
                success: false,
                error: confirmData.error || 'Payment confirmation failed'
              };
            }

            const transactionId = confirmData?.transaction?.transaction_id;

            if (!transactionId) {
              if (confirmData?.code === 'user_cancelled' || confirmData?.error?.includes('missing transaction_id')) {
                return { 
                  success: false, 
                  error: 'user_cancelled',
                  userCancelled: true
                };
              }
              
              return { success: false, error: 'Payment failed: No transaction ID received' };
            }

            let attempts = 0;
            const maxAttempts = 20;

            while (attempts < maxAttempts) {
              const statusResponse = await fetch('/api/confirm-payment', {        
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  payload: {
                    transaction_id: transactionId,
                    reference: referenceId
                  }
                })
              });

              const statusData = await statusResponse.json();

              if (statusData.success && statusData.transaction) {
                const status = statusData.transaction.transaction_status || statusData.transaction.status;

                if (status === 'confirmed' || status === 'mined') {
                  const txHash = statusData.transaction.transaction_hash || statusData.transaction?.transaction_hash || confirmData?.transaction?.transaction_hash;
                  return { 
                    success: true, 
                    transactionHash: txHash,
                    transaction: statusData.transaction
                  };
                }

                if (status === 'failed') {
                  return { success: false, error: 'Transaction failed on blockchain' };
                }
              }

              await new Promise(resolve => setTimeout(resolve, 1500));
              attempts++;
            }

            const txHash = confirmData?.transaction?.transaction_hash || transactionId;
            return {
              success: true, 
              transactionHash: txHash || transactionId,
              transaction: confirmData?.transaction || { transaction_id: transactionId, status: 'pending' }
            };
          } catch (confirmError: any) {
            return { success: false, error: 'Payment failed: Could not confirm transaction' };
          }
        } catch (payError: any) {
          return { success: false, error: payError.message || 'Payment failed' };
        }
      } else {
        return { success: false, error: 'Payment is only available in World App. Please open this app in World App.' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Payment failed' };
    }
  }, []);

  const getSigner = useCallback(async () => {
    if (typeof window !== 'undefined' && (window as any).MiniKit?.commandsAsync?.sendTransaction) {
      return {
        sendTransaction: async (tx: any) => {
          return await (window as any).MiniKit!.commandsAsync!.sendTransaction({
            to: tx.to,
            data: tx.data || '0x',
            value: tx.value?.toString() || '0'
          });
        }
      };
    } else if (typeof window !== 'undefined' && (window as any).ethereum && provider) {
      return await (provider as ethers.BrowserProvider).getSigner();
    }
    return null;
  }, [provider]);

  // Auto-connect wallet when verified
  useEffect(() => {
    if (verifiedAddress && !isConnected) {
      connectWallet();
    }
  }, [verifiedAddress, isConnected, connectWallet]);

  // Fetch balance when address changes
  useEffect(() => {
    if (actualAddress) {
      fetchBalance();
      const interval = setInterval(() => {
        fetchBalance();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [actualAddress, fetchBalance]);

  // Memoize formatted values
  const formattedBalance = useMemo(() => {
    const val = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
    return val.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [balance]);
  
  const formattedWldBalance = useMemo(() => {
    const val = typeof wldBalance === 'number' && !isNaN(wldBalance) ? wldBalance : 0;
    return val.toLocaleString('en-US', { 
      minimumFractionDigits: 4, 
      maximumFractionDigits: 4 
    });
  }, [wldBalance]);

  return {
    wallet,
    isConnected,
    provider,
    userInfo,
    balance,
    wldBalance,
    isLoadingBalance,
    actualAddress,
    formattedBalance,
    formattedWldBalance,
    connectWallet,
    requestPayment,
    getSigner,
    fetchBalance,
    setUserInfo,
  };
}

