'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface GameButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const variantClasses = {
  primary: 'border-tron-cyan text-tron-cyan bg-tron-cyan/10 hover:bg-tron-cyan/20',
  secondary: 'border-tron-blue text-tron-blue bg-tron-blue/10 hover:bg-tron-blue/20',
  danger: 'border-tron-orange text-tron-orange bg-tron-orange/10 hover:bg-tron-orange/20',
  success: 'border-tron-purple text-tron-purple bg-tron-purple/10 hover:bg-tron-purple/20',
}

const glowClasses = {
  primary: 'shadow-neon-cyan',
  secondary: 'shadow-neon-blue',
  danger: 'shadow-neon-orange',
  success: 'shadow-neon-purple',
}

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export function GameButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
}: GameButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-xl border-2 font-orbitron font-bold uppercase tracking-wider
        transition-all duration-300 overflow-hidden
        ${variantClasses[variant]}
        ${glowClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      <span className="relative z-10">{children}</span>
      {!disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />
      )}
    </motion.button>
  )
}

