'use client';

import React, { memo } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { POWERS, BASE_APY, getPowerByCode, type PowerCode } from '@/lib/utils/powerConfig';
import { TronCard, TronButton, TronBadge } from '@/components/tron';

interface MembershipTabProps {
  currentPower: { code: PowerCode; name: string; totalAPY: number } | null;
  totalApy: number;
  isPurchasingPower: boolean;
  handlePurchasePower: (targetCode: PowerCode) => void;
}

const MembershipTab = memo(({
  currentPower,
  totalApy,
  isPurchasingPower,
  handlePurchasePower,
}: MembershipTabProps) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-tron-cyan" style={{ filter: 'drop-shadow(0 0 5px var(--tron-cyan))' }} />
          <span className="text-tron-cyan font-bold text-sm font-orbitron uppercase tracking-wider neon-text">POWER LICENSES</span>
        </div>
        {currentPower && (
          <TronBadge variant="success" size="md">
            <span className="text-base mr-1">⚡</span>
            {currentPower.name} {totalApy}%
          </TronBadge>
        )}
      </div>

      {/* Power Tiers */}
      <div className="space-y-3">
        {POWERS.map((power, index) => {
          const isOwned = currentPower?.code === power.code;
          const canUpgrade = !currentPower || (getPowerByCode(currentPower.code) && parseFloat(getPowerByCode(currentPower.code)!.priceWLD) < parseFloat(power.priceWLD));
          const isLower = currentPower && parseFloat(getPowerByCode(currentPower.code)!.priceWLD) > parseFloat(power.priceWLD);

          // Map power codes to glow colors
          const glowColors: Record<string, 'cyan' | 'blue' | 'purple' | 'orange'> = {
            'spark': 'cyan',
            'nova': 'blue',
            'quasar': 'purple',
            'supernova': 'orange',
            'singularity': 'orange',
          };
          const glowColor = glowColors[power.code] || 'cyan';

          return (
            <TronCard 
              key={power.code}
              glowColor={glowColor}
              className={`p-4 ${isOwned ? 'ring-2 ring-tron-red' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-lg">⚡</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-white font-bold text-base font-orbitron">{power.name}</span>
                      <TronBadge variant="success" size="sm">
                        {power.totalAPY}% APY
                      </TronBadge>
                    </div>
                    <div className="text-gray-300 text-xs font-orbitron">
                      +{power.totalAPY - BASE_APY}% Power Boost
                    </div>
                  </div>
                </div>
                {isOwned ? (
                  <TronBadge variant="success" size="md">
                    ✓ Active
                  </TronBadge>
                ) : isLower ? (
                  <TronBadge variant="default" size="md">
                    ↓
                  </TronBadge>
                ) : (
                  <TronButton
                    variant={canUpgrade ? 'success' : 'secondary'}
                    size="sm"
                    onClick={() => canUpgrade && !isPurchasingPower ? handlePurchasePower(power.code) : undefined}
                    disabled={!canUpgrade || isPurchasingPower}
                    className="whitespace-nowrap ml-3"
                  >
                    {isPurchasingPower ? (
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
                    ) : !currentPower ? (
                      `${power.priceWLD} WLD`
                    ) : (
                      `+${(parseFloat(power.priceWLD) - parseFloat(getPowerByCode(currentPower.code)!.priceWLD)).toFixed(1)} WLD`
                    )}
                  </TronButton>
                )}
              </div>
            </TronCard>
          );
        })}
      </div>
    </div>
  );
});

MembershipTab.displayName = 'MembershipTab';

export default MembershipTab;

