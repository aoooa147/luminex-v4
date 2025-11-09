'use client';

import React, { memo, useMemo } from 'react';
import { Zap, TrendingUp, Target, ArrowRight, Gamepad2 } from 'lucide-react';
import { type PowerCode } from '@/lib/utils/powerConfig';

interface PowerTabProps {
  currentPower: { code: string; name: string; totalAPY: number } | null;
  totalApy: number;
  baseApy: number;
  powerBoost: number;
  isPurchasingPower: boolean;
  handlePurchasePower: (powerCode: PowerCode) => Promise<void>;
  onNavigate: (tab: 'home' | 'power' | 'game' | 'friends' | 'profile') => void;
}

export const PowerTab = memo(function PowerTab({
  currentPower,
  totalApy,
  baseApy,
  powerBoost,
  isPurchasingPower,
  handlePurchasePower,
  onNavigate,
}: PowerTabProps) {
  // Calculate daily power usage and remaining
  const dailyPowerUsage = useMemo(() => {
    return currentPower ? Math.floor(Math.random() * 50) + 20 : 0; // Mock data
  }, [currentPower]);

  const dailyPowerRemaining = useMemo(() => {
    return 100 - dailyPowerUsage;
  }, [dailyPowerUsage]);

  const dailyTarget = 80;
  const userRank = 5;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Power Control</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-bg-tertiary/50 border border-luminex-primary/20 text-sm text-gray-400">
            ภาพรวม
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-bg-tertiary/50 border border-luminex-primary/20 text-sm text-gray-400">
            รายละเอียด
          </button>
        </div>
      </div>

      {/* Power Dial - Large Circular Gauge */}
      <div className="neon-card p-8">
        <div className="text-center">
          <div className="relative w-64 h-64 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(79, 70, 229, 0.2)"
                strokeWidth="8"
              />
              
              {/* Progress circle - Green for high, Cyan for medium, Primary for low */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={totalApy >= 200 ? '#22C55E' : totalApy >= 100 ? '#22D3EE' : '#4F46E5'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - (totalApy / 325))}`}
                style={{
                  filter: 'drop-shadow(0 0 15px rgba(79, 70, 229, 0.6))',
                  transition: 'stroke-dashoffset 1s ease-out',
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold text-white mb-1">
                {totalApy.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Total APY</div>
              {currentPower && (
                <div className="text-xs text-luminex-cyan mt-1">{currentPower.name}</div>
              )}
            </div>
          </div>

          {/* Power Boost Button */}
          <button
            onClick={async () => {
              if (!currentPower) {
                await handlePurchasePower('spark');
              }
            }}
            disabled={isPurchasingPower}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50"
            style={{
              background: currentPower 
                ? 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)'
                : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              boxShadow: '0 0 20px rgba(79, 70, 229, 0.4)',
            }}
          >
            {isPurchasingPower ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังประมวลผล...
              </span>
            ) : currentPower ? (
              'Boost พลัง'
            ) : (
              'เปิดโหมดประหยัดพลัง'
            )}
          </button>
        </div>
      </div>

      {/* Power Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="neon-card p-4">
          <div className="text-sm text-gray-400 mb-2">พลังที่ใช้วันนี้</div>
          <div className="text-2xl font-bold text-luminex-cyan">{dailyPowerUsage} kWh</div>
        </div>
        <div className="neon-card p-4">
          <div className="text-sm text-gray-400 mb-2">พลังที่เหลือ</div>
          <div className="text-2xl font-bold text-luminex-green">{dailyPowerRemaining} kWh</div>
        </div>
        <div className="neon-card p-4">
          <div className="text-sm text-gray-400 mb-2">เป้าหมายรายวัน</div>
          <div className="text-2xl font-bold text-white">{dailyTarget} kWh</div>
        </div>
        <div className="neon-card p-4">
          <div className="text-sm text-gray-400 mb-2">อันดับของคุณ</div>
          <div className="text-2xl font-bold text-luminex-primary">#{userRank}</div>
        </div>
      </div>

      {/* Mini Chart Placeholder */}
      <div className="neon-card p-4">
        <div className="text-sm text-gray-400 mb-3">การใช้พลัง 7 วันล่าสุด</div>
        <div className="h-32 flex items-end justify-between gap-1">
          {[65, 80, 45, 90, 70, 85, 75].map((value, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-luminex-primary to-luminex-cyan rounded-t"
              style={{
                height: `${value}%`,
                minHeight: '4px',
              }}
            />
          ))}
        </div>
      </div>

      {/* CTA - Go to Game */}
      <button
        onClick={() => onNavigate('game')}
        className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
        }}
      >
        <Gamepad2 className="w-5 h-5" />
        ไปเล่นเกมเก็บพลังเพิ่ม
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
});

