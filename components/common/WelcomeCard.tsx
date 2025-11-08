'use client';

import React from 'react';
import { TronCard } from '@/components/tron';
import { User } from 'lucide-react';

interface WelcomeCardProps {
  username?: string;
  address?: string;
}

export function WelcomeCard({ username, address }: WelcomeCardProps) {
  const displayName = username || address?.slice(0, 6) + '...' + address?.slice(-4) || 'User';

  return (
    <TronCard glowColor="cyan" className="p-4 backdrop-blur-xl bg-gradient-to-br from-bg-tertiary/90 to-bg-secondary/90">
      <div className="flex items-center gap-4">
        {/* Profile Icon - Glowing Circle */}
        <div className="relative">
          <div 
            className="w-16 h-16 rounded-full bg-gradient-to-br from-tron-cyan to-tron-blue flex items-center justify-center border-2 border-tron-cyan/50"
            style={{
              boxShadow: '0 0 30px rgba(0, 229, 255, 0.6), inset 0 0 20px rgba(0, 229, 255, 0.2)',
            }}
          >
            <User className="w-8 h-8 text-white" />
          </div>
          {/* Pulsing ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-tron-cyan/30"
            style={{
              animation: 'pulse-ring 2s ease-in-out infinite',
            }}
          />
        </div>

        {/* Welcome Text */}
        <div className="flex-1">
          <p className="text-gray-400 text-xs font-orbitron uppercase tracking-wide mb-1">
            Welcome back,
          </p>
          <h2 className="text-xl font-orbitron font-bold text-tron-cyan">
            {displayName}
          </h2>
          {address && (
            <p className="text-gray-500 text-xs font-mono mt-1">
              {address}
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </TronCard>
  );
}
