'use client';

import React, { memo } from 'react';
import { 
  Coins, TrendingUp, TrendingDown, BarChart3, DollarSign as DollarIcon,
  Zap, Timer, Loader2, Gift, Sparkles, Lock, Unlock
} from 'lucide-react';
import { POOLS, TOKEN_NAME } from '@/lib/utils/constants';
import { BASE_APY, getPowerBoost } from '@/lib/utils/powerConfig';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { TronCard, TronButton, TronBadge } from '@/components/tron';

// Map pool IDs to icons
const POOL_ICONS: Record<number, typeof Unlock> = {
  0: Unlock,
  1: Lock,
  2: Lock,
  3: Lock,
  4: Lock,
};

// Map pool IDs to Tron colors
const POOL_COLORS: Record<number, 'red' | 'cyan' | 'blue' | 'purple' | 'orange' | 'pink'> = {
  0: "red",
  1: "blue",
  2: "purple",
  3: "orange",
  4: "pink",
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
  t,
}: StakingTabProps) => {
  return (
    <div className="space-y-2">
      {/* Pool Selection */}
      <div className="grid grid-cols-5 gap-1.5">
        {POOLS.map((pool) => {
          const Icon = POOL_ICONS[pool.id] || Unlock;
          const tronColor = POOL_COLORS[pool.id] || "red";
          const isActive = selectedPool === pool.id;
          
          const colorClasses = {
            red: isActive ? 'border-tron-red bg-tron-red/20 text-tron-red shadow-neon-red' : 'border-tron-red/30 text-gray-400',
            cyan: isActive ? 'border-tron-cyan bg-tron-cyan/20 text-tron-cyan shadow-neon-cyan' : 'border-tron-cyan/30 text-gray-400',
            blue: isActive ? 'border-tron-blue bg-tron-blue/20 text-tron-blue shadow-neon-blue' : 'border-tron-blue/30 text-gray-400',
            purple: isActive ? 'border-tron-purple bg-tron-purple/20 text-tron-purple shadow-neon-purple' : 'border-tron-purple/30 text-gray-400',
            orange: isActive ? 'border-tron-orange bg-tron-orange/20 text-tron-orange shadow-neon-orange' : 'border-tron-orange/30 text-gray-400',
            pink: isActive ? 'border-tron-pink bg-tron-pink/20 text-tron-pink' : 'border-tron-pink/30 text-gray-400',
          };
          
          return (
            <button
              key={pool.id}
              onClick={() => setSelectedPool(pool.id)}
              className={`relative p-1.5 rounded-lg border-2 transition-all duration-150 overflow-hidden backdrop-blur-sm font-orbitron min-h-[60px] hover:scale-105 active:scale-95 ${colorClasses[tronColor as keyof typeof colorClasses]}`}
              style={{ transform: 'translateZ(0)' }}
            >
              <div className="relative">
                <div className={`flex justify-center mb-0.5 ${isActive ? '' : 'opacity-60'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="font-bold text-[9px] leading-tight text-center">{pool.name}</p>
                <p className={`text-[8px] font-semibold mt-0.5 text-center ${isActive ? 'opacity-100' : 'opacity-50'}`}>{pool.apy}%</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Staking Card */}
      <TronCard glowColor="primary" className="p-3 sm:p-4">
        <div className="space-y-2">
          {/* Power License Status */}
          <div className="flex items-center justify-between p-2 bg-bg-tertiary/80 rounded-lg border border-tron-red/30 backdrop-blur-lg">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-tron-red" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 26, 42, 0.8))' }} />
              <span className="text-gray-300 text-[10px] font-orbitron">Power License:</span>
              <TronBadge variant={currentPower ? 'success' : 'default'} size="sm">
                {currentPower ? currentPower.name : 'None'}
              </TronBadge>
            </div>
            <div className="text-right">
              <div className="text-tron-red font-bold text-xs font-orbitron neon-text">{totalApy}% Total APY</div>
              <div className="text-gray-400 text-[9px] mt-0.5 font-orbitron">
                Base {baseApy}% {powerBoost > 0 ? `+ ${powerBoost}%` : ''}
              </div>
            </div>
          </div>

          {/* Staking Balance */}
          <div className="p-2 bg-bg-tertiary/80 rounded-lg border border-tron-red/30 backdrop-blur-lg">
            <p className="text-gray-300 text-[10px] mb-1 font-orbitron">{t('myStakingBalance')}</p>
            {!actualAddress || !STAKING_CONTRACT_ADDRESS ? (
              <div className="flex items-center justify-center py-1">
                <span className="text-tron-red text-[10px] text-center font-orbitron">
                  {!actualAddress ? 'Connect wallet' : 'Contract not configured'}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Coins className="w-4 h-4 text-tron-red" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 26, 42, 0.8))' }} />
                  <span className="text-lg font-extrabold text-tron-red font-orbitron">{formattedStakedAmount}</span>
                  <span className="text-gray-400 text-xs font-orbitron">LUX</span>
                </div>
                <TrendingUp className="w-4 h-4 text-tron-red-bright" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 71, 87, 0.8))' }} />
              </div>
            )}
          </div>

          {/* Earned Interest */}
          <div className="p-2 bg-bg-tertiary/80 rounded-lg border border-tron-red/30 backdrop-blur-lg">
            <p className="text-gray-300 text-[10px] mb-1 font-orbitron">{t('earnedInterest')}</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-extrabold text-tron-red font-orbitron neon-text">{formattedPendingRewards}</span>
              <span className="text-gray-400 text-xs font-orbitron">LUX</span>
            </div>
          </div>

          {/* Time Elapsed */}
          {timeElapsed.days > 0 || timeElapsed.hours > 0 || timeElapsed.minutes > 0 ? (
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-300 bg-tron-red/10 rounded-lg px-2 py-1 border border-tron-red/20 font-orbitron">
              <Timer className="w-3 h-3 flex-shrink-0 text-tron-red" />
              <span className="font-mono">
                {timeElapsed.days}D {timeElapsed.hours}H {timeElapsed.minutes}m
              </span>
            </div>
          ) : null}
        </div>
      </TronCard>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* STAKING Button */}
          <TronButton
            variant="success"
            size="sm"
            onClick={() => setShowStakeModal(true)}
            className="w-full"
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            {t('staking')}
          </TronButton>

          {/* Withdraw Interest */}
          <TronButton
            variant="primary"
            size="sm"
            onClick={handleClaimInterest}
            className="w-full"
          >
            {isClaimingInterest ? (
              <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
            ) : (
              <DollarIcon className="w-4 h-4 inline mr-1.5" />
            )}
            {t('withdrawInterest')}
          </TronButton>
        </div>

        {/* Withdraw Balance */}
        <TronButton
          variant="secondary"
          size="sm"
          onClick={handleWithdrawBalance}
          className="w-full"
        >
          {isWithdrawing ? (
            <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
          ) : (
            <TrendingDown className="w-4 h-4 inline mr-1.5" />
          )}
          {t('withdrawBalance')}
        </TronButton>

        {/* Free Token Button */}
        <TronButton
          variant="success"
          size="sm"
          onClick={() => setActiveTab('game')}
          className="w-full relative overflow-hidden"
        >
          <Gift className="w-4 h-4 inline mr-1.5" />
          {t('freeToken')}
          <Sparkles className="w-3.5 h-3.5 inline ml-1.5" />
        </TronButton>
      </div>
    </div>
  );
});

StakingTab.displayName = 'StakingTab';

export default StakingTab;

