'use client';

import React, { memo } from 'react';
import { PiggyBank, Zap, UserPlus, Gamepad2, Shield } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'staking' | 'membership' | 'referral' | 'game';
  setActiveTab: (tab: 'staking' | 'membership' | 'referral' | 'game') => void;
  isAdmin: boolean;
}

const BottomNav = memo(({
  activeTab,
  setActiveTab,
  isAdmin,
}: BottomNavProps) => {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 glass-tron border-t border-tron-red/30 z-40 safe-area-bottom" 
      style={{
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 10, 15, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 26, 42, 0.15)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))'
      }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex justify-around">
        <button
          onClick={() => setActiveTab('staking')}
          aria-label="Staking tab"
          aria-pressed={activeTab === 'staking'}
          className={`flex flex-col items-center space-y-1 relative font-orbitron min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'staking' ? 'text-tron-red' : 'text-gray-400'}`}
        >
          {activeTab === 'staking' && (
            <div
              className="absolute -inset-2 bg-tron-red/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(255, 26, 42, 0.3)' }}
            />
          )}
          <PiggyBank className={`w-6 h-6 relative z-10 ${activeTab === 'staking' ? 'drop-shadow-[0_0_6px_rgba(255,26,42,0.6)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-bold relative z-10">Staking</span>
        </button>
        <button
          onClick={() => setActiveTab('membership')}
          aria-label="Power/Membership tab"
          aria-pressed={activeTab === 'membership'}
          className={`flex flex-col items-center space-y-1 relative font-orbitron min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'membership' ? 'text-tron-red' : 'text-gray-400'}`}
        >
          {activeTab === 'membership' && (
            <div
              className="absolute -inset-2 bg-tron-red/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(255, 26, 42, 0.3)' }}
            />
          )}
          <Zap className={`w-6 h-6 relative z-10 ${activeTab === 'membership' ? 'drop-shadow-[0_0_6px_rgba(255,26,42,0.6)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-bold relative z-10">Power</span>
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          aria-label="Referral tab"
          aria-pressed={activeTab === 'referral'}
          className={`flex flex-col items-center space-y-1 relative font-orbitron min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'referral' ? 'text-tron-purple' : 'text-gray-400'}`}
        >
          {activeTab === 'referral' && (
            <div
              className="absolute -inset-2 bg-tron-purple/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.25)' }}
            />
          )}
          <UserPlus className={`w-6 h-6 relative z-10 ${activeTab === 'referral' ? 'drop-shadow-[0_0_6px_var(--tron-purple)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-bold relative z-10">Referral</span>
        </button>
        <button
          onClick={() => setActiveTab('game')}
          aria-label="Game tab"
          aria-pressed={activeTab === 'game'}
          className={`flex flex-col items-center space-y-1 relative font-orbitron min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'game' ? 'text-tron-red' : 'text-gray-400'}`}
        >
          {activeTab === 'game' && (
            <div
              className="absolute -inset-2 bg-tron-red/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(255, 26, 42, 0.3)' }}
            />
          )}
          <Gamepad2 className={`w-6 h-6 relative z-10 ${activeTab === 'game' ? 'drop-shadow-[0_0_6px_rgba(255,26,42,0.6)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-bold relative z-10">Game</span>
        </button>
        {/* Admin Button - Only visible to admin users */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.assign('/admin');
              }
            }}
            aria-label="Admin dashboard"
            className="flex flex-col items-center space-y-1 relative text-tron-orange hover:text-tron-orange-light font-orbitron transition-colors duration-150"
          >
            <Shield className="w-6 h-6 relative z-10 drop-shadow-[0_0_6px_var(--tron-orange)]" aria-hidden="true" />
            <span className="text-xs font-bold relative z-10">Admin</span>
          </button>
        )}
      </div>
    </div>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;

