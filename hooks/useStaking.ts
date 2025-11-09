/**
 * Custom hook for staking operations
 * Handles staking, claiming rewards, withdrawing, and fetching staking data
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { STAKING_CONTRACT_ADDRESS, LUX_TOKEN_ADDRESS, POOLS } from '@/lib/utils/constants';
import { trackStaking } from '@/lib/utils/analytics';

// Staking Contract ABI
const STAKING_ABI = [
  "function getUserStakeInfo(address user, uint8 poolId) external view returns (uint256 amount, uint256 lockPeriod, uint256 unlockTime, uint256 pendingRewards, bool isLP)",
  "function getPendingRewards(address user, uint8 poolId) external view returns (uint256)",
  "function totalStakedByUser(address user) external view returns (uint256)",
  "function stake(uint8 poolId, uint256 amount, uint256 lockPeriod) external",
  "function withdraw(uint8 poolId, uint256 amount) external",
  "function claimRewards(uint8 poolId) external",
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export interface StakingState {
  stakedAmount: number;
  pendingRewards: number;
  timeElapsed: { days: number; hours: number; minutes: number; seconds: number };
  isStaking: boolean;
  isClaiming: boolean;
  isWithdrawing: boolean;
  isClaimingInterest: boolean;
  isLoadingStakingData: boolean;
}

export interface StakingActions {
  handleStake: (amount: string, selectedPool: number, balance: number) => Promise<void>;
  handleClaimRewards: () => Promise<void>;
  handleWithdrawBalance: () => Promise<void>;
  handleClaimInterest: () => Promise<void>;
  fetchStakingData: () => Promise<void>;
}

export function useStaking(
  actualAddress: string | null,
  provider: ethers.Provider | null,
  selectedPool: number,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
) {
  const [stakedAmount, setStakedAmount] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaimingInterest, setIsClaimingInterest] = useState(false);
  const [isLoadingStakingData, setIsLoadingStakingData] = useState(false);
  
  const stakingDataFetchInProgress = useRef(false);

  const fetchStakingData = useCallback(async () => {
    if (!provider || !actualAddress || !STAKING_CONTRACT_ADDRESS) {
      setStakedAmount(0);
      setPendingRewards(0);
      return;
    }

    if (stakingDataFetchInProgress.current) {
      return;
    }

    try {
      stakingDataFetchInProgress.current = true;
      setIsLoadingStakingData(true);
      
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, provider);
      
      const totalStaked = await stakingContract.totalStakedByUser(actualAddress);
      const stakedFormatted = parseFloat(ethers.formatUnits(totalStaked, 18));
      setStakedAmount(stakedFormatted);
      
      const pendingRewardsBN = await stakingContract.getPendingRewards(actualAddress, selectedPool);
      const rewardsFormatted = parseFloat(ethers.formatUnits(pendingRewardsBN, 18));
      setPendingRewards(rewardsFormatted);
      
      try {
        const stakeInfo = await stakingContract.getUserStakeInfo(actualAddress, selectedPool);
        if (stakeInfo.startTime && stakeInfo.startTime > 0n) {
          const startTime = Number(stakeInfo.startTime);
          const currentTime = Math.floor(Date.now() / 1000);
          const elapsed = currentTime - startTime;
          
          const days = Math.floor(elapsed / 86400);
          const hours = Math.floor((elapsed % 86400) / 3600);
          const minutes = Math.floor((elapsed % 3600) / 60);
          const seconds = elapsed % 60;
          
          setTimeElapsed({ days, hours, minutes, seconds });
        }
      } catch (error) {
        // Could not fetch stake start time - silent error handling
      }
      
      stakingDataFetchInProgress.current = false;
      setIsLoadingStakingData(false);
    } catch (error: any) {
      stakingDataFetchInProgress.current = false;
      setIsLoadingStakingData(false);
      // Silently handle fetch errors - don't show to user
      // Reset to default values on error
      setStakedAmount(0);
      setPendingRewards(0);
      setTimeElapsed({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    }
  }, [provider, actualAddress, selectedPool]);

  const handleStake = useCallback(async (amount: string, selectedPool: number, balance: number) => {
    if (!amount) {
      onError?.('Please enter an amount to stake.');
      return;
    }
    if (!actualAddress) {
      onError?.('Please connect your wallet first. Solution: Connect your wallet in World App.');
      return;
    }
    if (Number(amount) > balance) {
      onError?.('Insufficient balance. Solution: Please check your LUX balance and stake a smaller amount. Hint: You can see your balance in the wallet section.');
      return;
    }
    if (!STAKING_CONTRACT_ADDRESS || !provider) {
      onError?.('Staking contract not configured. Solution: Please refresh the page or contact support.');
      return;
    }
    
    setIsStaking(true);
    try {
      const amountNum = Number(amount);
      const amountWei = ethers.parseUnits(amountNum.toString(), 18);
      const lockPeriod = POOLS[selectedPool].lockDays * 24 * 60 * 60;

      const MiniKit = (window as any).MiniKit;
      if (!MiniKit || !MiniKit.isInstalled()) {
        throw new Error('Please use World App to stake tokens');
      }

      if (!provider) {
        throw new Error('Provider not available');
      }

      const tokenContractInterface = new ethers.Interface(ERC20_ABI);
      const stakingContractInterface = new ethers.Interface(STAKING_ABI);

      const tokenContractRead = new ethers.Contract(LUX_TOKEN_ADDRESS, ERC20_ABI, provider);
      const allowance = await tokenContractRead.allowance(actualAddress, STAKING_CONTRACT_ADDRESS);
      
      if (allowance < amountWei) {
        const approveData = tokenContractInterface.encodeFunctionData('approve', [STAKING_CONTRACT_ADDRESS, amountWei]);
        
        const approveResult = await MiniKit.commandsAsync.sendTransaction({
          to: LUX_TOKEN_ADDRESS,
          data: approveData,
          value: '0'
        });
        
        if (!approveResult?.finalPayload?.transaction_id) {
          throw new Error('Token approval failed');
        }
      }

      const stakeData = stakingContractInterface.encodeFunctionData('stake', [selectedPool, amountWei, lockPeriod]);
      
      const stakeResult = await MiniKit.commandsAsync.sendTransaction({
        to: STAKING_CONTRACT_ADDRESS,
        data: stakeData,
        value: '0'
      });

      if (!stakeResult?.finalPayload?.transaction_id) {
        throw new Error('Staking transaction failed');
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      await Promise.all([
        fetchStakingData().catch(() => {})
      ]);

      setIsStaking(false);
      onSuccess?.(`Successfully staked ${amountNum} LUX!`);
      // Track analytics
      trackStaking('stake', amountNum, selectedPool);
    } catch (error: any) {
      setIsStaking(false);
      
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
        return;
      }
      
      // Provide user-friendly error messages with solutions
      const errorMessages: Record<string, { message: string; solution?: string; hint?: string }> = {
        'token approval failed': {
          message: 'Failed to approve tokens',
          solution: 'Please try again. If the problem persists, check your wallet connection.',
          hint: 'Token approval is required before staking. Make sure you approve the transaction in your wallet.',
        },
        'staking transaction failed': {
          message: 'Staking transaction failed',
          solution: 'Please check your balance and network connection, then try again.',
          hint: 'Make sure you have enough LUX tokens and sufficient gas fees.',
        },
        'please use world app to stake tokens': {
          message: 'World App is required',
          solution: 'Please open this app in World App to stake tokens.',
          hint: 'World App is needed for blockchain transactions. Make sure you are using the World App.',
        },
        'provider not available': {
          message: 'Wallet provider not available',
          solution: 'Please reconnect your wallet and try again.',
          hint: 'Your wallet connection may have been lost. Please refresh the page and reconnect.',
        },
        'insufficient balance': {
          message: 'Insufficient balance',
          solution: 'Please check your LUX balance and stake a smaller amount.',
          hint: 'You need enough LUX tokens in your wallet to stake. Check your balance first.',
        },
      };
      
      const errorInfo = errorMessages[errorMsg];
      if (errorInfo) {
        onError?.(`${errorInfo.message}. ${errorInfo.solution || ''} ${errorInfo.hint ? `Hint: ${errorInfo.hint}` : ''}`);
      } else {
        onError?.(error?.message || 'Staking failed. Please try again.');
      }
    }
  }, [actualAddress, provider, selectedPool, fetchStakingData, onSuccess, onError]);

  const handleClaimRewards = useCallback(async () => {
    if (pendingRewards === 0) {
      onError?.('No rewards to claim');
      return;
    }
    if (!actualAddress || !STAKING_CONTRACT_ADDRESS || !provider) {
      onError?.('Please connect wallet first');
      return;
    }

    setIsClaiming(true);
    try {
      const MiniKit = (window as any).MiniKit;
      if (!MiniKit || !MiniKit.isInstalled()) {
        throw new Error('Please use World App to claim rewards');
      }

      const stakingContractInterface = new ethers.Interface(STAKING_ABI);
      const claimData = stakingContractInterface.encodeFunctionData('claimRewards', [selectedPool]);

      const claimResult = await MiniKit.commandsAsync.sendTransaction({
        to: STAKING_CONTRACT_ADDRESS,
        data: claimData,
        value: '0'
      });

      if (!claimResult?.finalPayload?.transaction_id) {
        throw new Error('Claim rewards transaction failed');
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      await Promise.all([
        fetchStakingData().catch(() => {})
      ]);

      setIsClaiming(false);
      const rewardsValue = typeof pendingRewards === 'number' && !isNaN(pendingRewards) ? pendingRewards : 0;
      onSuccess?.(`Claimed ${rewardsValue.toFixed(2)} LUX rewards!`);
      // Track analytics
      trackStaking('claim', rewardsValue, selectedPool);
    } catch (error: any) {
      setIsClaiming(false);
      
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
        return;
      }
      
      // Provide user-friendly error messages with solutions
      const errorMessages: Record<string, { message: string; solution?: string; hint?: string }> = {
        'claim rewards transaction failed': {
          message: 'Failed to claim rewards',
          solution: 'Please check your network connection and try again.',
          hint: 'Make sure you are connected to the internet and have sufficient gas fees.',
        },
        'please use world app to claim rewards': {
          message: 'World App is required',
          solution: 'Please open this app in World App to claim rewards.',
          hint: 'World App is needed for blockchain transactions.',
        },
        'no rewards to claim': {
          message: 'No rewards available',
          solution: 'Stake more tokens to earn rewards.',
          hint: 'Rewards are calculated based on your staked amount and time.',
        },
      };
      
      const errorInfo = errorMessages[errorMsg];
      if (errorInfo) {
        onError?.(`${errorInfo.message}. ${errorInfo.solution || ''} ${errorInfo.hint ? `Hint: ${errorInfo.hint}` : ''}`);
      } else {
        onError?.(error?.message || 'Claim failed. Please try again.');
      }
    }
  }, [pendingRewards, actualAddress, provider, selectedPool, fetchStakingData, onSuccess, onError]);

  const handleWithdrawBalance = useCallback(async () => {
    if (stakedAmount === 0) {
      onError?.('No balance to withdraw. Solution: You need to stake tokens first. Hint: Stake some tokens to start earning rewards.');
      return;
    }
    if (!actualAddress || !STAKING_CONTRACT_ADDRESS || !provider) {
      onError?.('Please connect your wallet first. Solution: Connect your wallet in World App.');
      return;
    }

    setIsWithdrawing(true);
    try {
      const MiniKit = (window as any).MiniKit;
      if (!MiniKit || !MiniKit.isInstalled()) {
        throw new Error('Please use World App to withdraw balance');
      }

      if (!provider) {
        throw new Error('Provider not available');
      }

      const stakingContractRead = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, provider);
      const stakingContractInterface = new ethers.Interface(STAKING_ABI);
      
      const stakeInfo = await stakingContractRead.getUserStakeInfo(actualAddress, selectedPool);
      const amountWei = stakeInfo.amount;

      if (amountWei === 0n) {
        throw new Error('No staked balance to withdraw');
      }

      const withdrawData = stakingContractInterface.encodeFunctionData('withdraw', [selectedPool, amountWei]);

      const withdrawResult = await MiniKit.commandsAsync.sendTransaction({
        to: STAKING_CONTRACT_ADDRESS,
        data: withdrawData,
        value: '0'
      });

      if (!withdrawResult?.finalPayload?.transaction_id) {
        throw new Error('Withdrawal transaction failed');
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      await Promise.all([
        fetchStakingData().catch(() => {})
      ]);

      setIsWithdrawing(false);
      const withdrawnAmount = parseFloat(ethers.formatUnits(amountWei, 18));
      onSuccess?.(`Withdrew ${withdrawnAmount} LUX!`);
      // Track analytics
      trackStaking('withdraw', withdrawnAmount, selectedPool);
    } catch (error: any) {
      setIsWithdrawing(false);
      
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
        return;
      }
      
      // Provide user-friendly error messages with solutions
      const errorMessages: Record<string, { message: string; solution?: string; hint?: string }> = {
        'withdrawal transaction failed': {
          message: 'Failed to withdraw',
          solution: 'Please check your network connection and try again.',
          hint: 'Make sure you are connected to the internet and have sufficient gas fees.',
        },
        'please use world app to withdraw balance': {
          message: 'World App is required',
          solution: 'Please open this app in World App to withdraw.',
          hint: 'World App is needed for blockchain transactions.',
        },
        'no staked balance to withdraw': {
          message: 'No staked balance available',
          solution: 'You need to stake tokens first before you can withdraw.',
          hint: 'Stake some tokens to start earning, then you can withdraw later.',
        },
        'provider not available': {
          message: 'Wallet provider not available',
          solution: 'Please reconnect your wallet and try again.',
          hint: 'Your wallet connection may have been lost. Please refresh the page and reconnect.',
        },
      };
      
      const errorInfo = errorMessages[errorMsg];
      if (errorInfo) {
        onError?.(`${errorInfo.message}. ${errorInfo.solution || ''} ${errorInfo.hint ? `Hint: ${errorInfo.hint}` : ''}`);
      } else {
        onError?.(error?.message || 'Withdrawal failed. Please try again.');
      }
    }
  }, [stakedAmount, actualAddress, provider, selectedPool, fetchStakingData, onSuccess, onError]);

  const handleClaimInterest = useCallback(async () => {
    setIsClaimingInterest(true);
    await handleClaimRewards();
    setIsClaimingInterest(false);
  }, [handleClaimRewards]);

  // Fetch staking data when address or pool changes
  useEffect(() => {
    if (!actualAddress || !provider || !STAKING_CONTRACT_ADDRESS) return;
    
    fetchStakingData();
    
    const interval = setInterval(() => {
      fetchStakingData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [actualAddress, provider, selectedPool, fetchStakingData]);

  // Update time elapsed every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (stakedAmount > 0) {
        setTimeElapsed(prev => {
          let { seconds, minutes, hours, days } = prev;
          seconds++;
          if (seconds >= 60) { seconds = 0; minutes++; }
          if (minutes >= 60) { minutes = 0; hours++; }
          if (hours >= 24) { hours = 0; days++; }
          return { days, hours, minutes, seconds };
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stakedAmount]);

  // Memoize formatted values
  const formattedStakedAmount = useMemo(() => {
    const val = typeof stakedAmount === 'number' && !isNaN(stakedAmount) ? stakedAmount : 0;
    return val.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [stakedAmount]);
  
  const formattedPendingRewards = useMemo(() => {
    const val = typeof pendingRewards === 'number' && !isNaN(pendingRewards) ? pendingRewards : 0;
    return val.toLocaleString('en-US', { 
      minimumFractionDigits: 8, 
      maximumFractionDigits: 8 
    });
  }, [pendingRewards]);

  return {
    stakedAmount,
    pendingRewards,
    timeElapsed,
    isStaking,
    isClaiming,
    isWithdrawing,
    isClaimingInterest,
    isLoadingStakingData,
    formattedStakedAmount,
    formattedPendingRewards,
    handleStake,
    handleClaimRewards,
    handleWithdrawBalance,
    handleClaimInterest,
    fetchStakingData,
  };
}

