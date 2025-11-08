'use client';

import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { TronCard } from '@/components/tron';
import { Gamepad2 } from 'lucide-react';
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

  return (
    <AnimatePresence mode="wait">
      {!isLoaded ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center min-h-[400px]"
        >
          <AILoadingState message="Initializing game portal..." size="lg" />
        </motion.div>
      ) : (
        <motion.div
          key="game"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="space-y-3"
        >
          {/* Game Tab */}
          <TronCard glowColor="red" className="p-6 sm:p-8 text-center">
            <div className="relative z-10">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="text-6xl sm:text-7xl mb-4"
              >
                🎮
              </motion.div>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
});

GameTab.displayName = 'GameTab';

export default GameTab;

