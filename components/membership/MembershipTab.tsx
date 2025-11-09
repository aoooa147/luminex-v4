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
        ) : (
          POWERS.map((power, index) => {
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
                whileHover={{ scale: canUpgrade && !isPurchasingPower ? 1.05 : 1 }}
                whileTap={{ scale: canUpgrade && !isPurchasingPower ? 0.95 : 1 }}
                onClick={canUpgrade && !isPurchasingPower ? purchaseHandler : undefined}
                disabled={!canUpgrade || isPurchasingPower || !!isLower}
                aria-label={
                  isOwned 
                    ? `${power.name} power is active` 
                    : isPurchasingPower 
                    ? 'Purchasing power...' 
                    : `Purchase ${power.name} power for ${power.priceWLD} WLD`
                }
                aria-disabled={!canUpgrade || isPurchasingPower || !!isLower}
                className={`px-4 py-2 font-bold rounded-lg text-xs whitespace-nowrap ml-3 ${
                  isOwned
                    ? 'bg-yellow-400 text-black cursor-default'
                    : isLower || !canUpgrade
                    ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-400 text-white'
                }`}
              >
                {isPurchasingPower ? (
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
        )}
      </div>
    </motion.div>
  );
});

MembershipTab.displayName = 'MembershipTab';

export default MembershipTab;
