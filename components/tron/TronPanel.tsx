'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface TronPanelProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  status?: 'default' | 'success' | 'warning' | 'danger'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const statusBorder: Record<NonNullable<TronPanelProps['status']>, string> = {
  default: 'border-tron-cyan/20',
  success: 'border-[#17ffb8]/30',
  warning: 'border-[#ffd166]/30',
  danger: 'border-[#ff1a2a]/30',
}

const paddingMap: Record<NonNullable<TronPanelProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
}

export function TronPanel({
  children,
  className,
  title,
  subtitle,
  icon: Icon,
  status = 'default',
  padding = 'md',
}: TronPanelProps) {
  const panelClass = [
    'relative overflow-hidden rounded-[1.5rem] border backdrop-blur-xl',
    'bg-[radial-gradient(120%_200%_at_50%_0%,rgba(0,240,255,0.12),rgba(0,0,0,0.8))]',
    statusBorder[status],
    paddingMap[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={panelClass}>
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="tron-panel-glow" />
      </div>

      {(title || subtitle || Icon) && (
        <div className="relative z-10 mb-4 flex items-center gap-3">
          {Icon && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-tron-cyan/30 bg-tron-cyan/10 text-tron-cyan"
            >
              <Icon className="h-5 w-5" />
            </motion.span>
          )}
          <div className="space-y-1">
            {title && <h3 className="font-orbitron text-lg font-bold tracking-wide text-white">{title}</h3>}
            {subtitle && <p className="text-xs font-orbitron uppercase tracking-[0.3em] text-gray-300">{subtitle}</p>}
          </div>
        </div>
      )}

      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
