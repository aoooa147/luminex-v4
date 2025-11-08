'use client';

import React, { memo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TronCard } from '@/components/tron';
import { AILoadingState } from '@/components/common/AILoadingState';

const GameLauncherCard = dynamic(() => import('@/components/game/GameLauncherCard'), { 
  ssr: false,
  loading: () => <AILoadingState message="Loading games..." size="md" />
});

const GameTab = memo(() => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate intelligent loading
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <AILoadingState message="Initializing game portal..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Game Tab */}
      <TronCard glowColor="red" className="p-6 sm:p-8 text-center">
        <div className="relative z-10">
          <div className="text-6xl sm:text-7xl mb-4">
            🎮
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-orbitron text-tron-red mb-2 neon-text">
            Play & Earn!
          </h1>
          <p className="text-gray-300 mb-2 text-base sm:text-lg font-orbitron">
            Play games and earn rewards
          </p>
        </div>
      </TronCard>

      {/* Game Launcher */}
      <GameLauncherCard />
    </div>
  );
});

GameTab.displayName = 'GameTab';

export default GameTab;

