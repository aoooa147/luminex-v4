/**
 * Custom hook for referral management
 * Handles referral code generation, stats fetching, and referral processing
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { trackReferral, trackCustomEvent } from '@/lib/utils/analytics';

export interface ReferralState {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  copied: boolean;
  isLoadingReferralData: boolean;
}

export interface ReferralActions {
  setCopied: (copied: boolean) => void;
  processReferralCode: (code: string) => Promise<void>;
  fetchReferralStats: () => Promise<void>;
}

export function useReferral(
  actualAddress: string | null,
  verified: boolean,
  language: string,
  onSuccess?: (message: string) => void
) {
  const [referralCode, setReferralCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoadingReferralData, setIsLoadingReferralData] = useState(false);

  // Safe referral code - ensure it's always a string
  const safeReferralCode = useMemo(() => {
    return typeof referralCode === 'string' && referralCode.length > 0 ? referralCode : 'LUX000000';
  }, [referralCode]);
  
  // Safe totals - ensure they're always numbers
  const safeTotalReferrals = useMemo(() => {
    return typeof totalReferrals === 'number' && !isNaN(totalReferrals) ? totalReferrals : 0;
  }, [totalReferrals]);
  
  const safeTotalEarnings = useMemo(() => {
    return typeof totalEarnings === 'number' && !isNaN(totalEarnings) ? totalEarnings : 0;
  }, [totalEarnings]);

  const fetchReferralStats = useCallback(async () => {
    if (!actualAddress) {
      setTotalReferrals(0);
      setTotalEarnings(0);
      return;
    }

    try {
      setIsLoadingReferralData(true);
      const response = await fetch(`/api/referral/stats?address=${actualAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      const data = await response.json();
      
      if (data.success && data.data?.stats) {
        setTotalReferrals(data.data.stats.totalReferrals || 0);
        setTotalEarnings(data.data.stats.totalEarnings || 0);
      } else {
        setTotalReferrals(0);
        setTotalEarnings(0);
      }
      setIsLoadingReferralData(false);
    } catch (error: any) {
      // Silently handle fetch errors - don't show to user
      setTotalReferrals(0);
      setTotalEarnings(0);
      setIsLoadingReferralData(false);
    }
  }, [actualAddress]);

  const processReferralCode = useCallback(async (code: string) => {
    if (!actualAddress || !code) return;

    try {
      const response = await fetch('/api/process-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUserId: actualAddress,
          referrerCode: code
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onSuccess?.('You received 5 LUX for using referral code!');
        fetchReferralStats();
        // Track referral processing
        trackReferral('referral_processed', code);
      }
    } catch (error) {
      // Error processing referral - silent error handling
    }
  }, [actualAddress, fetchReferralStats, onSuccess]);

  // Set referral code from wallet address
  useEffect(() => {
    if (actualAddress && !referralCode) {
      const code = `LUX${actualAddress.slice(2, 8).toUpperCase()}`;
      setReferralCode(code);
      // Track referral code generation
      trackReferral('code_generated', code);
    }
  }, [actualAddress, referralCode]);

  // Fetch referral stats when address is available
  useEffect(() => {
    if (actualAddress) {
      fetchReferralStats();
    }
  }, [actualAddress, fetchReferralStats]);

  // Check for referral code in URL or localStorage when user connects wallet
  useEffect(() => {
    if (actualAddress && verified) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      const storedCode = localStorage.getItem('luminex_referral_code');
      
      const referralCodeToProcess = refCode || storedCode;
      
      if (referralCodeToProcess) {
        processReferralCode(referralCodeToProcess);
        if (storedCode) {
          localStorage.removeItem('luminex_referral_code');
        }
      }
    }
  }, [actualAddress, verified, processReferralCode]);

  return {
    referralCode,
    totalReferrals,
    totalEarnings,
    copied,
    isLoadingReferralData,
    safeReferralCode,
    safeTotalReferrals,
    safeTotalEarnings,
    setCopied,
    processReferralCode,
    fetchReferralStats,
  };
}

