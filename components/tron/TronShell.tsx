'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface TronShellProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'maintenance'
  showEnergyStream?: boolean
  showGrid?: boolean
}

const variantBackgrounds: Record<NonNullable<TronShellProps['variant']>, string> = {
  default: 'from-[#050505] via-[rgba(8,12,24,0.96)] to-[#050505]',
  maintenance: 'from-[#170000] via-[rgba(48,0,0,0.96)] to-[#050505]',
}

export function TronShell({
  children,
  className,
  variant = 'default',
  showEnergyStream = true,
  showGrid = true,
}: TronShellProps) {
  const shellClass = ['relative min-h-screen overflow-hidden text-white', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      {/* Base gradient */}
      <div
        className={['absolute inset-0 -z-20 bg-gradient-to-b', variantBackgrounds[variant]]
          .filter(Boolean)
          .join(' ')}
      />

      {/* Grid overlay */}
      {showGrid && (
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
          <div className="tron-grid" />
          <div className="tron-grid tron-grid-secondary" />
        </div>
      )}

      {/* Energy stream */}
      {showEnergyStream && (
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.35] }}
          transition={{ duration: 18, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        >
          <div className="tron-energy-stream" />
          <div className="tron-fog" />
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {children}
      </div>
    </div>
  )
}
