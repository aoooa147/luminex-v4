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
      {/* The Arena Header */}
      <TronCard glowColor="orange" className="p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Arena background effect */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 30%, rgba(255, 107, 53, 0.3), transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(255, 26, 42, 0.2), transparent 50%)
            `,
          }}
        />
        
        <div className="relative z-10">
          <div className="text-6xl sm:text-7xl mb-4">
            🎮
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-orbitron text-tron-orange mb-2 neon-text uppercase tracking-wider">
            THE ARENA
          </h1>
          <p className="text-gray-300 mb-2 text-base sm:text-lg font-orbitron">
            Enter the games and earn rewards
          </p>
          <div className="mt-4 inline-block px-4 py-2 rounded-lg border border-tron-orange/30 bg-tron-orange/10">
            <p className="text-tron-orange text-xs font-orbitron font-bold">
              Win up to 0-5 LUX per game
            </p>
          </div>
        </div>
      </TronCard>

      {/* Game Launcher */}
      <GameLauncherCard />
    </div>
  );
});

GameTab.displayName = 'GameTab';

export default GameTab;

