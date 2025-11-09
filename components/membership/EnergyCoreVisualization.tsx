'use client';

import React, { memo, useMemo } from 'react';
import { TronCard } from '@/components/tron';
import { Zap } from 'lucide-react';

interface EnergyCoreVisualizationProps {
  currentPower: { code: string; name: string; totalAPY: number } | null;
  totalApy: number;
  baseApy: number;
  powerBoost: number;
}

export const EnergyCoreVisualization = memo(function EnergyCoreVisualization({
  currentPower,
  totalApy,
  baseApy,
  powerBoost,
}: EnergyCoreVisualizationProps) {
  // Calculate power percentage (0-100%) - Memoized
  const normalizedPercentage = useMemo(() => {
    const powerPercentage = currentPower ? totalApy : 0;
    const maxPower = 325; // Maximum possible APY
    return (powerPercentage / maxPower) * 100;
  }, [currentPower, totalApy]);

  // Memoize circle calculation
  const circleCircumference = useMemo(() => 2 * Math.PI * 45, []);
  const strokeDashoffset = useMemo(() => {
    return circleCircumference * (1 - normalizedPercentage / 100);
  }, [circleCircumference, normalizedPercentage]);

  return (
    <TronCard glowColor="primary" className="p-8 text-center">
      <div className="relative">
        {/* Radial Chart - Energy Core */}
        <div className="relative w-64 h-64 mx-auto mb-6">
          {/* Outer ring - Background */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 26, 42, 0.2)"
              strokeWidth="8"
            />
            
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#gradient-red)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                filter: 'drop-shadow(0 0 20px rgba(255, 26, 42, 0.8))',
                transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'translateZ(0)',
              }}
            />
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff1a2a" />
                <stop offset="50%" stopColor="#ff4757" />
                <stop offset="100%" stopColor="#ff0066" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-orbitron font-bold text-tron-red mb-2">
              {totalApy.toFixed(1)}%
            </div>
            <div className="text-sm font-orbitron text-gray-400 uppercase tracking-wide">
              Total APY
            </div>
            {currentPower && (
              <div className="mt-2 text-xs font-orbitron text-tron-red-bright">
                {currentPower.name}
              </div>
            )}
          </div>

          {/* Energy particles around the ring - Memoized */}
          {useMemo(() => {
            return [...Array(12)].map((_, i) => {
              const angle = (i * 30) * (Math.PI / 180);
              const radius = 45;
              const x = 50 + radius * Math.cos(angle);
              const y = 50 + radius * Math.sin(angle);
              const isActive = (i * 30) / 360 < normalizedPercentage / 100;

              return (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%) translateZ(0)',
                    backgroundColor: isActive ? '#ff1a2a' : 'rgba(255, 26, 42, 0.2)',
                    boxShadow: isActive ? '0 0 10px rgba(255, 26, 42, 0.8)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'background-color, box-shadow',
                  }}
                />
              );
            });
          }, [normalizedPercentage])}
        </div>

        {/* Stats below the chart */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-orbitron font-bold text-tron-red mb-1">
              {baseApy}%
            </div>
            <div className="text-xs font-orbitron text-gray-400 uppercase">
              Base APY
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-orbitron font-bold text-tron-red-bright mb-1">
              +{powerBoost}%
            </div>
            <div className="text-xs font-orbitron text-gray-400 uppercase">
              Power Boost
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-orbitron font-bold text-tron-red-neon mb-1">
              {currentPower ? '⚡' : '—'}
            </div>
            <div className="text-xs font-orbitron text-gray-400 uppercase">
              Status
            </div>
          </div>
        </div>
      </div>
    </TronCard>
  );
})
