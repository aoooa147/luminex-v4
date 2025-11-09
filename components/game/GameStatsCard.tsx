'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface GameStatsCardProps {
  label: string
  value: string | number
  icon?: string
  color?: 'red' | 'cyan' | 'blue' | 'orange' | 'purple' | 'yellow'
  className?: string
}

const colorClasses = {
  red: 'text-tron-red border-tron-red/30 bg-tron-red/10',
  cyan: 'text-tron-cyan border-tron-cyan/30 bg-tron-cyan/10',
  blue: 'text-tron-blue border-tron-blue/30 bg-tron-blue/10',
  orange: 'text-tron-orange border-tron-orange/30 bg-tron-orange/10',
  purple: 'text-tron-purple border-tron-purple/30 bg-tron-purple/10',
  yellow: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
}

const glowClasses = {
  red: 'shadow-neon-red',
  cyan: 'shadow-neon-cyan',
  blue: 'shadow-neon-blue',
  orange: 'shadow-neon-orange',
  purple: 'shadow-neon-purple',
  yellow: 'shadow-[0_0_10px_rgba(250,204,21,0.5)]',
}

export const GameStatsCard = React.memo(function GameStatsCard({
  label,
  value,
  icon,
  color = 'red',
  className = '',
}: GameStatsCardProps) {
  // Memoize formatted value to avoid recalculation on every render
  const formattedValue = React.useMemo(() => {
    return typeof value === 'number' ? value.toLocaleString() : value;
  }, [value]);

  // Memoize className string to avoid recalculation
  const cardClassName = React.useMemo(() => {
    return `
      relative rounded-xl p-3 text-center border backdrop-blur-xl
      ${colorClasses[color]}
      ${glowClasses[color]}
      ${className}
    `.trim();
  }, [color, className]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cardClassName}
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-xs font-orbitron uppercase tracking-wide mb-1 opacity-80">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      <div className="text-xl font-bold font-orbitron">
        {formattedValue}
      </div>
    </motion.div>
  );
});

