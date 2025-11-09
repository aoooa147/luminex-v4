'use client';

import React, { memo } from 'react';
import { Home, Zap, Gamepad2, UserPlus, User, Shield } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'power' | 'game' | 'friends' | 'profile';
  setActiveTab: (tab: 'home' | 'power' | 'game' | 'friends' | 'profile') => void;
  isAdmin: boolean;
}

const BottomNav = memo(({
  activeTab,
  setActiveTab,
  isAdmin,
}: BottomNavProps) => {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 glass-tron border-t z-40 safe-area-bottom" 
      style={{
        background: 'linear-gradient(180deg, rgba(5, 8, 22, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTopColor: 'rgba(79, 70, 229, 0.2)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(79, 70, 229, 0.1)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        transform: 'translateZ(0)',
        contain: 'layout style',
      }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex justify-around">
        {/* Home Tab */}
        <button
          onClick={() => setActiveTab('home')}
          aria-label="Home tab"
          aria-pressed={activeTab === 'home'}
          className={`flex flex-col items-center space-y-1 relative min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'home' ? 'text-luminex-primary' : 'text-gray-400'}`}
        >
          {activeTab === 'home' && (
            <div
              className="absolute -inset-2 bg-luminex-primary/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(79, 70, 229, 0.3)' }}
            />
          )}
          <Home className={`w-6 h-6 relative z-10 ${activeTab === 'home' ? 'drop-shadow-[0_0_6px_rgba(79,70,229,0.6)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-semibold relative z-10">Home</span>
        </button>

        {/* Power Tab */}
        <button
          onClick={() => setActiveTab('power')}
          aria-label="Power tab"
          aria-pressed={activeTab === 'power'}
          className={`flex flex-col items-center space-y-1 relative min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'power' ? 'text-luminex-cyan' : 'text-gray-400'}`}
        >
          {activeTab === 'power' && (
            <div
              className="absolute -inset-2 bg-luminex-cyan/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)' }}
            />
          )}
          <Zap className={`w-6 h-6 relative z-10 ${activeTab === 'power' ? 'drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-semibold relative z-10">Power</span>
        </button>

        {/* Game Tab */}
        <button
          onClick={() => setActiveTab('game')}
          aria-label="Game tab"
          aria-pressed={activeTab === 'game'}
          className={`flex flex-col items-center space-y-1 relative min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'game' ? 'text-luminex-purple' : 'text-gray-400'}`}
        >
          {activeTab === 'game' && (
            <div
              className="absolute -inset-2 bg-luminex-purple/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}
            />
          )}
          <Gamepad2 className={`w-6 h-6 relative z-10 ${activeTab === 'game' ? 'drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-semibold relative z-10">Game</span>
        </button>

        {/* Friends Tab */}
        <button
          onClick={() => setActiveTab('friends')}
          aria-label="Friends tab"
          aria-pressed={activeTab === 'friends'}
          className={`flex flex-col items-center space-y-1 relative min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'friends' ? 'text-luminex-green' : 'text-gray-400'}`}
        >
          {activeTab === 'friends' && (
            <div
              className="absolute -inset-2 bg-luminex-green/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)' }}
            />
          )}
          <UserPlus className={`w-6 h-6 relative z-10 ${activeTab === 'friends' ? 'drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-semibold relative z-10">Friends</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => setActiveTab('profile')}
          aria-label="Profile tab"
          aria-pressed={activeTab === 'profile'}
          className={`flex flex-col items-center space-y-1 relative min-h-[44px] min-w-[44px] transition-colors duration-150 ${activeTab === 'profile' ? 'text-luminex-primary' : 'text-gray-400'}`}
        >
          {activeTab === 'profile' && (
            <div
              className="absolute -inset-2 bg-luminex-primary/20 rounded-2xl"
              style={{ boxShadow: '0 0 15px rgba(79, 70, 229, 0.3)' }}
            />
          )}
          <User className={`w-6 h-6 relative z-10 ${activeTab === 'profile' ? 'drop-shadow-[0_0_6px_rgba(79,70,229,0.6)]' : ''}`} aria-hidden="true" />
          <span className="text-xs font-semibold relative z-10">Profile</span>
        </button>
      </div>
    </div>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;

