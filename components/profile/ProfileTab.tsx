'use client';

import React, { memo } from 'react';
import { User, Shield, Settings, LogOut, Wallet, Zap, UserPlus, ArrowRight } from 'lucide-react';

interface ProfileTabProps {
  userInfo: any;
  actualAddress: string | null;
  formattedBalance: string;
  formattedWldBalance: string;
  isAdmin: boolean;
  onNavigate: (tab: 'home' | 'power' | 'game' | 'friends' | 'profile') => void;
}

export const ProfileTab = memo(function ProfileTab({
  userInfo,
  actualAddress,
  formattedBalance,
  formattedWldBalance,
  isAdmin,
  onNavigate,
}: ProfileTabProps) {
  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="neon-card p-6 text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-luminex-primary to-luminex-cyan flex items-center justify-center border-4 border-luminex-primary/50">
          <User className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-1">
          {userInfo?.username || userInfo?.name || 'User'}
        </h2>
        {actualAddress && (
          <p className="text-sm text-gray-400 font-mono">
            {actualAddress.slice(0, 6)}...{actualAddress.slice(-4)}
          </p>
        )}
      </div>

      {/* Wallet Balance */}
      <div className="neon-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-luminex-primary/20 border border-luminex-primary/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-luminex-primary" />
            </div>
            <div>
              <div className="text-sm text-gray-400">ยอดคงเหลือ</div>
              <div className="text-lg font-semibold text-white">{formattedBalance} LUX</div>
              <div className="text-sm text-gray-500">{formattedWldBalance} WLD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        <button
          onClick={() => onNavigate('power')}
          className="w-full neon-card p-4 flex items-center justify-between hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-luminex-cyan" />
            <span className="text-white font-medium">Power Management</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => onNavigate('friends')}
          className="w-full neon-card p-4 flex items-center justify-between hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-luminex-green" />
            <span className="text-white font-medium">Referral Program</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </button>

        {isAdmin && (
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.assign('/admin');
              }
            }}
            className="w-full neon-card p-4 flex items-center justify-between hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-500" />
              <span className="text-white font-medium">Admin Panel</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </button>
        )}

        <button className="w-full neon-card p-4 flex items-center justify-between hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-white font-medium">Settings</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
});

