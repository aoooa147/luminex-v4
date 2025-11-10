'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';
import { POWERS, BASE_APY, getPowerByCode, type PowerCode } from '@/lib/utils/powerConfig';
import { LoadingSkeleton } from '@/components/common/LoadingStates';

interface MembershipTabProps {
  currentPower: { code: PowerCode; name: string; totalAPY: number } | null;
  totalApy: number;
  isPurchasingPower: boolean;
  isLoadingPowerData?: boolean;
  handlePurchasePower: (targetCode: PowerCode) => void;
}

const MembershipTab = memo(({
  currentPower,
  totalApy,
  isPurchasingPower,
  isLoadingPowerData = false,
  handlePurchasePower,
}: MembershipTabProps) => {
  // Memoize power purchase handlers
  const createPurchaseHandler = useCallback((powerCode: PowerCode) => {
    return () => handlePurchasePower(powerCode);
  }, [handlePurchasePower]);

  // Ensure POWERS is always an array with fallback
  const safePowers = useMemo(() => {
    try {
      if (Array.isArray(POWERS) && POWERS.length > 0) {
        return POWERS;
      }
      // Fallback powers if POWERS is undefined or empty
      return [
        { code: 'spark' as PowerCode, name: 'Spark', priceWLD: '1', totalAPY: 75 },
        { code: 'nova' as PowerCode, name: 'Nova', priceWLD: '5', totalAPY: 125 },
        { code: 'quasar' as PowerCode, name: 'Quasar', priceWLD: '10', totalAPY: 175 },
        { code: 'supernova' as PowerCode, name: 'Supernova', priceWLD: '50', totalAPY: 325 },
        { code: 'singularity' as PowerCode, name: 'Singularity', priceWLD: '200', totalAPY: 500 },
      ];
    } catch (error) {
      console.error('Error initializing POWERS:', error);
      // Return default powers on error
      return [
        { code: 'spark' as PowerCode, name: 'Spark', priceWLD: '1', totalAPY: 75 },
        { code: 'nova' as PowerCode, name: 'Nova', priceWLD: '5', totalAPY: 125 },
        { code: 'quasar' as PowerCode, name: 'Quasar', priceWLD: '10', totalAPY: 175 },
        { code: 'supernova' as PowerCode, name: 'Supernova', priceWLD: '50', totalAPY: 325 },
        { code: 'singularity' as PowerCode, name: 'Singularity', priceWLD: '200', totalAPY: 500 },
      ];
    }
  }, []);

  return (
    <motion.div
      key="membership"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-bold text-sm">POWER LICENSES</span>
        </div>
        {isLoadingPowerData ? (
          <LoadingSkeleton className="h-8 w-32" count={1} />
        ) : currentPower ? (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
            <span className="text-base" aria-hidden="true">⚡</span>
            <span className="text-white font-bold text-xs">{currentPower.name}</span>
            <span className="text-yellow-300 font-bold text-xs">{totalApy}%</span>
          </div>
        ) : null}
      </div>

      {/* Power Tiers */}
      <div className="space-y-3" role="list" aria-label="Power license tiers">
        {isLoadingPowerData ? (
          <LoadingSkeleton className="h-20 w-full" count={3} />
        ) : safePowers && Array.isArray(safePowers) && safePowers.length > 0 ? (
          safePowers.map((power, index) => {
          const isOwned = currentPower?.code === power.code;
          const currentPowerData = currentPower ? getPowerByCode(currentPower.code) : null;
          const canUpgrade = useMemo(() => 
            !currentPower || (currentPowerData && parseFloat(currentPowerData.priceWLD) < parseFloat(power.priceWLD)),
            [currentPower, currentPowerData, power.priceWLD]
          );
          const isLower = useMemo(() => 
            currentPower && currentPowerData && parseFloat(currentPowerData.priceWLD) > parseFloat(power.priceWLD),
            [currentPower, currentPowerData, power.priceWLD]
          );
          const upgradePrice = useMemo(() => {
            if (!currentPower || !currentPowerData) return power.priceWLD;
            return (parseFloat(power.priceWLD) - parseFloat(currentPowerData.priceWLD)).toFixed(1);
          }, [currentPower, currentPowerData, power.priceWLD]);

          const purchaseHandler = createPurchaseHandler(power.code);

          return (
            <motion.div
              key={power.code}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isOwned ? 'border-yellow-400 bg-yellow-500/10' : 'border-white/10 bg-black/20'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-lg">⚡</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-white font-bold text-base">{power.name}</span>
                    <span className="text-yellow-300 font-bold text-sm">{power.totalAPY}% APY</span>
                  </div>
                  <div className="text-white/70 text-xs">
                    +{power.totalAPY - BASE_APY}% Power Boost
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: canUpgrade && !isPurchasingPower && !isLoadingPowerData ? 1.05 : 1 }}
                whileTap={{ scale: canUpgrade && !isPurchasingPower && !isLoadingPowerData ? 0.95 : 1 }}
                onClick={canUpgrade && !isPurchasingPower && !isLoadingPowerData ? purchaseHandler : undefined}
                disabled={!canUpgrade || isPurchasingPower || !!isLower || isLoadingPowerData}
                aria-label={
                  isOwned 
                    ? `${power.name} power is active` 
                    : isLoadingPowerData
                    ? 'Loading power data...'
                    : isPurchasingPower 
                    ? 'Purchasing power...' 
                    : !canUpgrade
                    ? `Cannot purchase ${power.name} power`
                    : `Purchase ${power.name} power for ${power.priceWLD} WLD`
                }
                aria-disabled={!canUpgrade || isPurchasingPower || !!isLower || isLoadingPowerData}
                title={
                  !canUpgrade && !isOwned && !isLower
                    ? 'Please wait for data to load'
                    : isLower
                    ? 'This is a lower tier than your current power'
                    : isOwned
                    ? 'This power is already active'
                    : undefined
                }
                className={`px-4 py-2 font-bold rounded-lg text-xs whitespace-nowrap ml-3 transition-all ${
                  isOwned
                    ? 'bg-yellow-400 text-black cursor-default'
                    : isLower || !canUpgrade || isLoadingPowerData
                    ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-green-500 hover:bg-green-400 text-white cursor-pointer'
                }`}
              >
                {isLoadingPowerData ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : isPurchasingPower ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : isOwned ? (
                  '✓ Active'
                ) : isLower ? (
                  '↓'
                ) : !currentPower ? (
                  `${power.priceWLD} WLD`
                ) : (
                  `+${upgradePrice} WLD`
                )}
              </motion.button>
            </motion.div>
          );
        })
        ) : (
          <div className="text-center text-white/60 text-xs p-4">
            Loading power licenses...
          </div>
        )}
      </div>
    </motion.div>
  );
});

MembershipTab.displayName = 'MembershipTab';

export default MembershipTab;
