'use client';

import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, TrendingUp, TrendingDown, BarChart3, DollarSign as DollarIcon,
  Zap, Timer, Loader2, Gift, Sparkles, Lock, Unlock, Droplet
} from 'lucide-react';
import { POOLS, TOKEN_NAME, STAKING_CONTRACT_ADDRESS } from '@/lib/utils/constants';
import { BASE_APY, getPowerBoost } from '@/lib/utils/powerConfig';
import { LoadingSpinner, LoadingSkeleton } from '@/components/common/LoadingStates';
import { EmptyStakingState, EmptyRewardsState } from '@/components/common/EmptyStates';
import { useMiniKit } from '@/hooks/useMiniKit';
import { MiniKit } from '@worldcoin/minikit-js';

// Map pool IDs to icons
const POOL_ICONS: Record<number, typeof Unlock> = {
  0: Unlock,
  1: Lock,
  2: Lock,
  3: Lock,
  4: Lock,
};

// Map pool IDs to colors
const POOL_COLORS: Record<number, string> = {
  0: "from-blue-400 to-cyan-400",
  1: "from-green-400 to-emerald-400",
  2: "from-purple-400 to-pink-400",
  3: "from-orange-400 to-red-400",
  4: "from-red-500 to-pink-500",
};

interface StakingTabProps {
  selectedPool: number;
  setSelectedPool: (pool: number) => void;
  currentPower: { code: string; name: string; totalAPY: number } | null;
  totalApy: number;
  baseApy: number;
  powerBoost: number;
  actualAddress: string | null;
  STAKING_CONTRACT_ADDRESS: string | null;
  formattedStakedAmount: string;
  formattedPendingRewards: string;
  timeElapsed: { days: number; hours: number; minutes: number; seconds: number };
  setShowStakeModal: (show: boolean) => void;
  handleClaimInterest: () => void;
  handleWithdrawBalance: () => void;
  setActiveTab: (tab: 'staking' | 'membership' | 'referral' | 'game') => void;
  isClaimingInterest: boolean;
  isWithdrawing: boolean;
  pendingRewards: number;
  stakedAmount: number;
  isLoadingStakingData?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const StakingTab = memo(({
  selectedPool,
  setSelectedPool,
  currentPower,
  totalApy,
  baseApy,
  powerBoost,
  actualAddress,
  STAKING_CONTRACT_ADDRESS,
  formattedStakedAmount,
  formattedPendingRewards,
  timeElapsed,
  setShowStakeModal,
  handleClaimInterest,
  handleWithdrawBalance,
  setActiveTab,
  isClaimingInterest,
  isWithdrawing,
  pendingRewards,
  stakedAmount,
  isLoadingStakingData = false,
  t,
}: StakingTabProps) => {
  const [faucetCooldown, setFaucetCooldown] = useState({ hours: 0, minutes: 0 });
  const [canClaimFaucet, setCanClaimFaucet] = useState(false);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const { sendTransaction } = useMiniKit();

  // Check faucet cooldown
  useEffect(() => {
    if (!actualAddress) return;
    
    const checkFaucet = async () => {
      try {
        const res = await fetch('/api/faucet/check', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address: actualAddress })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            setCanClaimFaucet(data.canClaim || false);
            setFaucetCooldown({ 
              hours: data.remainingHours || 0, 
              minutes: data.remainingMinutes || 0 
            });
          }
        }
      } catch (e) {
        // Silent error
      }
    };
    
    checkFaucet();
    const interval = setInterval(checkFaucet, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [actualAddress]);

  // Handle faucet claim
  const handleClaimFaucet = async () => {
    if (!actualAddress || !canClaimFaucet || isClaimingFaucet) return;
    
    if (!MiniKit.isInstalled()) {
      alert('World App is required to claim faucet. Please open this app in World App.');
      return;
    }
    
    setIsClaimingFaucet(true);
    try {
      // Step 1: Initialize transaction
      const initRes = await fetch('/api/faucet/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: actualAddress })
      });
      
      const initData = await initRes.json();
      
      if (!initRes.ok || !initData.ok || !initData.reference) {
        alert(initData.error || initData.message || 'Failed to initialize faucet claim. Please try again.');
        setIsClaimingFaucet(false);
        return;
      }

      const reference = initData.reference;
      
      // Step 2: Show transaction authorization popup
      let payload: any = null;
      try {
        const transactionData = '0x'; // Empty data - just for authorization
        payload = await sendTransaction(
          STAKING_CONTRACT_ADDRESS as `0x${string}`,
          transactionData,
          '0x0' // 0 value in hex - user is receiving reward
        );
      } catch (e: any) {
        if (e?.type === 'user_cancelled') {
          setIsClaimingFaucet(false);
          return;
        }
        throw e;
      }

      // Step 3: Confirm transaction
      if (!payload?.transaction_id) {
        alert('Transaction was cancelled. Please try again.');
        setIsClaimingFaucet(false);
        return;
      }

      const confirmRes = await fetch('/api/faucet/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          payload: {
            reference,
            transaction_id: payload.transaction_id
          }
        })
      });
      
      const confirmData = await confirmRes.json();
      
      if (confirmData && confirmData.ok) {
        alert(`Successfully claimed ${initData.amount || 1} LUX!`);
        setCanClaimFaucet(false);
        setFaucetCooldown({ hours: 24, minutes: 0 });
        // Refresh faucet status after successful claim
        setTimeout(() => {
          const checkFaucet = async () => {
            try {
              const res = await fetch('/api/faucet/check', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ address: actualAddress })
              });
              if (res.ok) {
                const data = await res.json();
                if (data && typeof data === 'object') {
                  setCanClaimFaucet(data.canClaim || false);
                  setFaucetCooldown({ 
                    hours: data.remainingHours || 0, 
                    minutes: data.remainingMinutes || 0 
                  });
                }
              }
            } catch (e) {
              // Silent error
            }
          };
          checkFaucet();
        }, 1000);
      } else {
        alert(confirmData?.error || confirmData?.message || 'Failed to claim faucet reward. Please try again.');
      }
    } catch (error: any) {
      alert(error?.message || 'Failed to claim faucet reward. Please try again.');
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  return (
    <motion.div
      key="staking"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-2"
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Free Faucet Card */}
      {actualAddress && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="relative bg-gradient-to-br from-purple-900/30 via-black to-purple-900/30 rounded-xl p-4 text-white overflow-hidden border border-purple-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                <Droplet className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-purple-300">รับ 1 LUX ฟรี</p>
                <p className="text-xs text-white/60">
                  {canClaimFaucet 
                    ? 'พร้อมรับรางวัล' 
                    : `รออีก ${faucetCooldown.hours}ช ${faucetCooldown.minutes}น`}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: canClaimFaucet ? 1.05 : 1 }}
              whileTap={{ scale: canClaimFaucet ? 0.95 : 1 }}
              onClick={handleClaimFaucet}
              disabled={!canClaimFaucet || isClaimingFaucet}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                canClaimFaucet
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-700/50 text-white/50 cursor-not-allowed'
              }`}
            >
              {isClaimingFaucet ? '⏳ กำลังรับ...' : canClaimFaucet ? 'รับ 1 LUX' : 'รอ 24 ชม'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Pool Selection */}
      <div className="grid grid-cols-5 gap-1.5">
        {(POOLS || []).map((pool) => {
          const Icon = POOL_ICONS[pool.id] || Unlock;
          const color = POOL_COLORS[pool.id] || "from-blue-400 to-cyan-400";
          return (
            <motion.button
              key={pool.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedPool(pool.id)}
              className={`relative p-1.5 rounded-lg border-2 transition-all overflow-hidden ${
                selectedPool === pool.id
                  ? 'border-yellow-500 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 shadow-lg shadow-yellow-500/20'
                  : 'border-white/10 bg-black/40 backdrop-blur-lg hover:border-white/20'
              }`}
              style={{ willChange: 'transform' }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10`}></div>
              <div className="relative">
                <i
                  className={`flex justify-center mb-0.5 ${
                    selectedPool === pool.id ? 'text-yellow-400' : 'text-white/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </i>
                <p className="text-white font-bold text-[9px] leading-tight">{pool.name}</p>
                <p className={`text-[8px] font-semibold mt-0.5 ${selectedPool === pool.id ? 'text-yellow-400' : 'text-white/50'}`}>{pool.apy}%</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Staking Card */}
      {!actualAddress || !STAKING_CONTRACT_ADDRESS ? (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl p-6 text-white overflow-hidden border border-yellow-600/20"
        >
          <div className="text-center">
            <p className="text-yellow-400 text-sm mb-2">
              {!actualAddress ? 'Connect your wallet to start staking' : 'Contract not configured'}
            </p>
            {!actualAddress && (
              <p className="text-white/60 text-xs">
                Connect your wallet in World App to stake LUX tokens and earn rewards
              </p>
            )}
          </div>
        </motion.div>
      ) : isLoadingStakingData ? (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl p-3 text-white overflow-hidden border border-yellow-600/20"
        >
          <div className="relative z-10 space-y-2">
            <LoadingSkeleton className="h-12 w-full" count={3} />
          </div>
        </motion.div>
      ) : stakedAmount === 0 ? (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl p-6 text-white overflow-hidden border border-yellow-600/20"
        >
          <EmptyStakingState
            action={
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowStakeModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg"
              >
                Start Staking
              </motion.button>
            }
          />
        </motion.div>
      ) : (
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl p-3 text-white overflow-hidden border border-yellow-600/20"
      >
        <div className="relative z-10 space-y-2">
          {/* Power License Status */}
          <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-white/10">
            <div className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" aria-hidden="true" />
              <span className="text-white/80 text-[10px]">Power License:</span>
              <span className="text-white font-bold text-xs">
                {currentPower ? currentPower.name : 'None'}
              </span>
            </div>
            <div className="text-right">
              <div className="text-yellow-300 font-bold text-xs">{totalApy}% Total APY</div>
              <div className="text-white/60 text-[9px] mt-0.5">
                Base {baseApy}% {powerBoost > 0 ? `+ ${powerBoost}%` : ''}
              </div>
            </div>
          </div>

          {/* Staking Balance */}
          <div className="p-2 bg-black/40 rounded-lg border border-white/10">
            <p className="text-white/80 text-[10px] mb-1">{t('myStakingBalance')}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Coins className="w-4 h-4 text-yellow-300" aria-hidden="true" />
                  <span className="text-lg font-extrabold text-white">{formattedStakedAmount}</span>
                  <span className="text-white/60 text-xs">LUX</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-300" aria-hidden="true" />
              </div>
          </div>

          {/* Earned Interest */}
          <div className="p-2 bg-black/40 rounded-lg border border-white/10">
            <p className="text-white/80 text-[10px] mb-1">{t('earnedInterest')}</p>
              {pendingRewards === 0 ? (
                <EmptyRewardsState className="p-0" />
              ) : (
            <div className="flex items-center justify-between">
              <span className="text-xl font-extrabold text-yellow-300">{formattedPendingRewards}</span>
              <span className="text-white/60 text-xs">LUX</span>
            </div>
              )}
          </div>

          {/* Time Elapsed */}
          {timeElapsed.days > 0 || timeElapsed.hours > 0 || timeElapsed.minutes > 0 ? (
            <div className="flex items-center space-x-1.5 text-[10px] text-white/70 bg-white/5 rounded-lg px-2 py-1">
                <Timer className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span className="font-mono">
                {timeElapsed.days}D {timeElapsed.hours}H {timeElapsed.minutes}m
              </span>
            </div>
          ) : null}
        </div>
      </motion.div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* STAKING Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowStakeModal(true)}
            aria-label="Open stake modal"
            className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 text-xs shadow-lg"
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            <span>{t('staking')}</span>
          </motion.button>

          {/* Withdraw Interest */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaimInterest}
            disabled={isClaimingInterest || pendingRewards === 0}
            aria-label={isClaimingInterest ? 'Claiming rewards...' : 'Claim rewards'}
            aria-disabled={isClaimingInterest || pendingRewards === 0}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 disabled:opacity-50 text-xs shadow-lg"
          >
            {isClaimingInterest ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <DollarIcon className="w-4 h-4" aria-hidden="true" />
                <span>{t('withdrawInterest')}</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Withdraw Balance */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleWithdrawBalance}
          disabled={isWithdrawing || stakedAmount === 0}
          aria-label={isWithdrawing ? 'Withdrawing...' : 'Withdraw balance'}
          aria-disabled={isWithdrawing || stakedAmount === 0}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 disabled:opacity-50 text-xs shadow-lg"
        >
          {isWithdrawing ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              <TrendingDown className="w-4 h-4" aria-hidden="true" />
              <span>{t('withdrawBalance')}</span>
            </>
          )}
        </motion.button>

        {/* Free Token Button */}
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 15px 35px rgba(147, 51, 234, 0.4)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('game')}
          aria-label="Play games to earn free tokens"
          className="w-full text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 relative overflow-hidden group text-xs"
          style={{
            background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #9333ea 100%)',
            backgroundSize: '200% 100%',
            boxShadow: '0 8px 25px rgba(147, 51, 234, 0.3), 0 0 15px rgba(236, 72, 153, 0.2)'
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-lg"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            style={{
              background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #9333ea 100%)',
              backgroundSize: '200% 100%'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/50 via-amber-400/50 to-yellow-400/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-lg"></div>
          <Gift className="w-4 h-4 relative z-10" />
          <span className="text-xs relative z-10 font-extrabold">{t('freeToken')}</span>
          <Sparkles className="w-3.5 h-3.5 relative z-10" />
        </motion.button>
      </div>
    </motion.div>
  );
});

StakingTab.displayName = 'StakingTab';

export default StakingTab;
