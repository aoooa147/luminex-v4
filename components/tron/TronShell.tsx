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
  default: 'from-[#000000] via-[rgba(10,10,10,0.98)] to-[#000000]',
  maintenance: 'from-[#1a0000] via-[rgba(48,0,0,0.96)] to-[#0a0000]',
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

      {/* Energy stream - Static for performance (no animation) */}
      {showEnergyStream && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ opacity: 0.3 }}
        >
          <div className="tron-energy-stream" />
          <div className="tron-fog" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {children}
      </div>
    </div>
  )
}
