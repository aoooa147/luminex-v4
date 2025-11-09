'use client';

import React, { memo, useCallback } from 'react';
import Link from 'next/link';
import { TronCard } from '@/components/tron';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  glowColor?: 'primary' | 'cyan' | 'green' | 'purple' | 'orange';
  onClick?: () => void;
}

export const QuickActionCard = memo(function QuickActionCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  glowColor = 'primary',
  onClick 
}: QuickActionCardProps) {
  const colorClasses = {
    primary: {
      bg: 'bg-luminex-primary/10',
      border: 'border-luminex-primary/30',
      text: 'text-luminex-primary',
      glow: 'rgba(79, 70, 229, 0.3)',
      textGlow: 'rgba(79, 70, 229, 0.8)',
    },
    cyan: {
      bg: 'bg-luminex-cyan/10',
      border: 'border-luminex-cyan/30',
      text: 'text-luminex-cyan',
      glow: 'rgba(34, 211, 238, 0.3)',
      textGlow: 'rgba(34, 211, 238, 0.8)',
    },
    green: {
      bg: 'bg-luminex-green/10',
      border: 'border-luminex-green/30',
      text: 'text-luminex-green',
      glow: 'rgba(34, 197, 94, 0.3)',
      textGlow: 'rgba(34, 197, 94, 0.8)',
    },
    purple: {
      bg: 'bg-luminex-purple/10',
      border: 'border-luminex-purple/30',
      text: 'text-luminex-purple',
      glow: 'rgba(168, 85, 247, 0.3)',
      textGlow: 'rgba(168, 85, 247, 0.8)',
    },
    orange: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-500',
      glow: 'rgba(249, 115, 22, 0.3)',
      textGlow: 'rgba(249, 115, 22, 0.8)',
    },
  };

  const colors = colorClasses[glowColor];

  const cardContent = (
    <div className="flex flex-col items-center gap-2 text-center">
      {/* Icon - Circular with glow */}
      <div 
        className={`flex-shrink-0 p-3 rounded-xl ${colors.bg} border ${colors.border}`}
        style={{
          boxShadow: `0 0 20px ${colors.glow}`,
        }}
      >
        <Icon 
          className={`w-6 h-6 ${colors.text}`}
          style={{ 
            filter: `drop-shadow(0 0 8px ${colors.textGlow})`,
            strokeWidth: 2,
          }} 
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-semibold ${colors.text} mb-0.5`}>
          {title}
        </h3>
        {description && (
          <p className="text-gray-400 text-xs leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  if (onClick) {
    return (
      <div 
        onClick={handleClick} 
        className="cursor-pointer"
        style={{ transform: 'translateZ(0)' }}
      >
        <div className="neon-card p-4">
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <Link href={href} style={{ transform: 'translateZ(0)' }}>
      <div className="neon-card p-4 cursor-pointer">
        {cardContent}
      </div>
    </Link>
  );
})
