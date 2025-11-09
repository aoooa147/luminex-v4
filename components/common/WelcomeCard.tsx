'use client';

import React, { memo, useMemo } from 'react';
import { TronCard } from '@/components/tron';
import { User } from 'lucide-react';

interface WelcomeCardProps {
  username?: string;
  address?: string;
}

export const WelcomeCard = memo(function WelcomeCard({ username, address }: WelcomeCardProps) {
  const displayName = useMemo(() => {
    return username || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'User');
  }, [username, address]);

  return (
    <div className="neon-card p-5">
      <div className="flex items-center gap-4">
        {/* Profile Icon - Glowing Circle */}
        <div className="relative">
          <div 
            className="w-16 h-16 rounded-full bg-gradient-to-br from-luminex-primary to-luminex-cyan flex items-center justify-center border-2 border-luminex-primary/50"
            style={{
              boxShadow: '0 0 30px rgba(79, 70, 229, 0.5), inset 0 0 20px rgba(34, 211, 238, 0.2)',
            }}
          >
            <User className="w-8 h-8 text-white" />
          </div>
          {/* Pulsing ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-luminex-cyan/30"
            style={{
              animation: 'pulse-ring 2s ease-in-out infinite',
            }}
          />
        </div>

        {/* Welcome Text */}
        <div className="flex-1">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
            สวัสดี,
          </p>
          <h2 className="text-xl font-semibold text-white">
            {displayName} 👋
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            พร้อมปลดปล่อยพลังแล้วหรือยัง?
          </p>
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
})
