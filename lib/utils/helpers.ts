import { ethers } from 'ethers';
import { WORLD_API_KEY, WORLD_API_BASE_URL, WORLD_BACKEND_API_BASE_URL, WORLD_APP_ID } from './constants';

/**
 * Format number with decimals
 */
export const formatNumber = (num: number, decimals = 2): string => {
  if (isNaN(num) || !isFinite(num)) return '0.00';
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

/**
 * Create provider helper function
 */
export const createProvider = (rpcUrl: string, networkName: string): ethers.JsonRpcProvider => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Override resolveName to prevent ENS lookups
  const originalResolveName = provider.resolveName.bind(provider);
    provider.resolveName = async (name: string) => {
      if (ethers.isAddress(name)) {
        return name;
      }
      throw new Error(`ENS not fully supported. Use address instead of: ${name}`);
    };
  
  console.log(`🔧 Created ${networkName} provider:`, { rpcUrl, networkName });
  return provider;
};

/**
 * World App Backend API Helpers
 * According to https://docs.world.org/mini-apps/reference/api
 */

/**
 * Get transaction status from World App backend
 * GET /api/v2/minikit/transaction/{transaction_id}
 */
export const getTransactionStatus = async (
  transactionId: string,
  type: 'pay' | 'sendTransaction'
): Promise<{
  reference: string;
  transaction_hash: string;
  transaction_status: 'pending' | 'mined' | 'failed';
  from: string;
  chain: string;
  timestamp: string;
  token_amount?: string;
  token?: string;
  to?: string;
  app_id: string;
} | null> => {
  try {
    const url = `${WORLD_API_BASE_URL}/minikit/transaction/${transactionId}?app_id=${WORLD_APP_ID}&type=${type}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to get transaction status:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error getting transaction status:', error);
    return null;
  }
};

/**
 * Get prices from World App backend
 * GET /public/v1/miniapps/prices
 */
export const getPrices = async (
  cryptoCurrencies: string[] = ['WLD', 'USDC'],
  fiatCurrencies: string[] = ['USD', 'EUR', 'JPY']
): Promise<{
  result: {
    prices: {
      [key: string]: {
        [currency: string]: {
          asset: string;
          amount: string;
          decimals: number;
          symbol: string;
        };
      };
    };
  };
} | null> => {
  try {
    const cryptoParams = cryptoCurrencies.join(',');
    const fiatParams = fiatCurrencies.join(',');
    const url = `${WORLD_BACKEND_API_BASE_URL}/miniapps/prices?cryptoCurrencies=${cryptoParams}&fiatCurrencies=${fiatParams}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to get prices:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error getting prices:', error);
    return null;
  }
};

/**
 * Get WLD price in USD
 */
export const getWLDPriceUSD = async (): Promise<number | null> => {
  try {
    const prices = await getPrices(['WLD'], ['USD']);
    if (!prices?.result?.prices?.WLD?.USD) {
      return null;
    }

    const { amount, decimals } = prices.result.prices.WLD.USD;
    const price = parseFloat(amount) * Math.pow(10, -decimals);
    return price;
  } catch (error: any) {
    console.error('Error getting WLD price:', error);
    return null;
  }
};

/**
 * Get transaction debug URL
 * GET /api/v2/minikit/transaction/debug
 */
export const getTransactionDebugURL = async (): Promise<{
  transactions: Array<{
    debugUrl: string;
    createdAt: string;
    block: number;
    simulationRequestId: string;
    simulationError?: string;
    walletAddress: string;
  }>;
} | null> => {
  try {
    const url = `${WORLD_API_BASE_URL}/minikit/transaction/debug?app_id=${WORLD_APP_ID}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORLD_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to get transaction debug URL:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error getting transaction debug URL:', error);
    return null;
  }
};

/**
 * Referral System Helpers
 * According to https://docs.world.org/mini-apps/growth/invites-viral
 */

/**
 * Generate Universal Link for referral
 * Universal-link format: https://world.org/mini-app?app_id={app_id}&path={path}
 * Deep-link format: worldapp://mini-app?app_id={app_id}&path={path}
 */
export const generateInviteLink = (referralCode: string): string => {
  const baseUrl = "https://world.org/mini-app";
  const appId = WORLD_APP_ID;
  const path = encodeURIComponent(`/invite?ref=${referralCode}`);

  return `${baseUrl}?app_id=${appId}&path=${path}`;
};

/**
 * Generate Deep Link for referral (opens World App directly if installed)
 */
export const generateDeepLink = (referralCode: string): string => {
  const appId = WORLD_APP_ID;
  const path = encodeURIComponent(`/invite?ref=${referralCode}`);

  return `worldapp://mini-app?app_id=${appId}&path=${path}`;
};

/**
 * Get referral code from URL parameters
 */
export const getReferralCodeFromURL = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref') || urlParams.get('code');
};

