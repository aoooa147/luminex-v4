'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { TronCard, TronButton } from '@/components/tron';

const GAMES = [
  {
    id: 'coin-flip',
    name: '🪙 Coin Flip Challenge',
    description: 'Flip a coin and guess the result! Win 10 LUX instantly!',
    href: '/game/coin-flip',
    glowColor: 'orange' as const,
  },
  {
    id: 'memory-match',
    name: '🧠 Color Memory Challenge',
    description: 'Test your memory by matching colors - Win 0-5 LUX (once per 24 hours)',
    href: '/game/memory-match',
    glowColor: 'purple' as const,
  },
  {
    id: 'number-rush',
    name: '⚡ Speed Reaction',
    description: 'React quickly to numbers - Win 0-5 LUX (once per 24 hours)',
    href: '/game/number-rush',
    glowColor: 'cyan' as const,
  },
  {
    id: 'color-tap',
    name: '🎨 Color Tap',
    description: 'Tap the correct color as fast as possible!',
    href: '/game/color-tap',
    glowColor: 'purple' as const,
  },
  {
    id: 'word-builder',
    name: '📝 Word Builder',
    description: 'Build words from letters to win rewards!',
    href: '/game/word-builder',
    glowColor: 'blue' as const,
  },
  {
    id: 'math-quiz',
    name: '🧮 Pattern Puzzle',
    description: 'Solve math patterns quickly - Win 0-5 LUX (once per 24 hours)',
    href: '/game/math-quiz',
    glowColor: 'orange' as const,
  },
];

const GameLauncherCard = memo(() => {
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <h2 className="text-lg sm:text-xl font-bold font-orbitron text-tron-red mb-1.5 neon-text">🎮 Play Games</h2>
        <p className="text-gray-300 text-xs sm:text-sm font-orbitron px-2">
          Play games and earn rewards! Win up to: 0-5 LUX (very rare to get 5!)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {GAMES.map((game) => (
          <Link key={game.id} href={game.href}>
            <TronCard
              glowColor={game.glowColor === 'cyan' ? 'orange' : game.glowColor === 'orange' ? 'orange' : game.glowColor}
              className="p-4 sm:p-5 flex flex-col min-h-[160px] h-full cursor-pointer hover:scale-105 transition-transform duration-200 relative overflow-hidden"
            >
              {/* Hover glow effect */}
              <div 
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200"
                style={{
                  background: `radial-gradient(circle at center, ${game.glowColor === 'orange' ? 'rgba(255, 107, 53, 0.2)' : 'rgba(255, 26, 42, 0.2)'}, transparent 70%)`,
                }}
              />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-1 mb-4">
                  <div className="text-lg sm:text-xl font-bold font-orbitron text-white mb-2 line-clamp-2">
                    {game.name}
                  </div>
                  <div className="text-xs sm:text-sm opacity-70 text-gray-300 font-orbitron line-clamp-2 leading-relaxed">
                    {game.description}
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="w-full py-2.5 px-4 rounded-lg border-2 border-tron-orange/50 bg-tron-orange/10 text-tron-orange hover:bg-tron-orange/20 transition-colors font-orbitron text-sm uppercase tracking-wider text-center font-bold">
                    PLAY NOW
                  </div>
                </div>
              </div>
            </TronCard>
          </Link>
        ))}
      </div>
    </div>
  );
});

GameLauncherCard.displayName = 'GameLauncherCard';

export default GameLauncherCard;
