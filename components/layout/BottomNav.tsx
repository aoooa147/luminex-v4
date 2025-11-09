'use client';

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  // Memoize tab change handlers to prevent unnecessary re-renders
  const handleStakingClick = useCallback(() => setActiveTab('staking'), [setActiveTab]);
  const handleMembershipClick = useCallback(() => setActiveTab('membership'), [setActiveTab]);
  const handleReferralClick = useCallback(() => setActiveTab('referral'), [setActiveTab]);
  const handleGameClick = useCallback(() => setActiveTab('game'), [setActiveTab]);
  const handleAdminClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.assign('/admin');
    }
  }, []);
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-2xl border-t border-yellow-600/20 z-40" 
      style={{
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.05)'
      }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex justify-around">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStakingClick}
          aria-label="Staking tab"
          aria-pressed={activeTab === 'staking'}
          className={`flex flex-col items-center space-y-1 relative ${activeTab === 'staking' ? 'text-white' : 'text-gray-500'}`}
        >
          {activeTab === 'staking' && (
            <motion.div
              layoutId="activeTab"
              className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl blur"
            />
          )}
          <PiggyBank className="w-6 h-6 relative z-10" aria-hidden="true" />
          <span className="text-xs font-bold relative z-10">Staking</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMembershipClick}
          aria-label="Power/Membership tab"
          aria-pressed={activeTab === 'membership'}
          className={`flex flex-col items-center space-y-1 relative ${activeTab === 'membership' ? 'text-white' : 'text-gray-500'}`}
        >
          {activeTab === 'membership' && (
            <motion.div
              layoutId="activeTab"
              className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl blur"
            />
          )}
          <Zap className="w-6 h-6 relative z-10" aria-hidden="true" />
          <span className="text-xs font-bold relative z-10">Power</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReferralClick}
          aria-label="Referral tab"
          aria-pressed={activeTab === 'referral'}
          className={`flex flex-col items-center space-y-1 relative ${activeTab === 'referral' ? 'text-white' : 'text-gray-500'}`}
        >
          {activeTab === 'referral' && (
            <motion.div
              layoutId="activeTab"
              className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl blur"
            />
          )}
          <UserPlus className="w-6 h-6 relative z-10" aria-hidden="true" />
          <span className="text-xs font-bold relative z-10">Referral</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGameClick}
          aria-label="Game tab"
          aria-pressed={activeTab === 'game'}
          className={`flex flex-col items-center space-y-1 relative ${activeTab === 'game' ? 'text-white' : 'text-gray-500'}`}
        >
          {activeTab === 'game' && (
            <motion.div
              layoutId="activeTab"
              className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl blur"
            />
          )}
          <Gamepad2 className="w-6 h-6 relative z-10" aria-hidden="true" />
          <span className="text-xs font-bold relative z-10">Game</span>
        </motion.button>
        {/* Admin Button - Only visible to admin users */}
        {isAdmin && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAdminClick}
            aria-label="Admin dashboard"
            className="flex flex-col items-center space-y-1 relative text-yellow-400 hover:text-yellow-300"
          >
            <Shield className="w-6 h-6 relative z-10" aria-hidden="true" />
            <span className="text-xs font-bold relative z-10">Admin</span>
          </motion.button>
        )}
      </div>
    </div>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
