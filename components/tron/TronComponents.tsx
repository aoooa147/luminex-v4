'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Shield, Sparkles, TrendingUp } from 'lucide-react'

// 🎨 Tron Button Component
export function TronButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '' 
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}) {
  const variants = {
    primary: 'border-tron-red text-tron-red hover:bg-tron-red/20',
    secondary: 'border-tron-blue text-tron-blue hover:bg-tron-blue/20',
    danger: 'border-tron-orange text-tron-orange hover:bg-tron-orange/20',
    success: 'border-tron-purple text-tron-purple hover:bg-tron-purple/20',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        neon-button relative overflow-hidden
        border-2 rounded-lg font-orbitron font-semibold uppercase tracking-wider
        transition-all duration-300
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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

// 🎮 Tron Card Component
export function TronCard({ 
  children, 
  title,
  icon: Icon,
  glowColor = 'red',
  className = '' 
}: {
  children: React.ReactNode
  title?: string
  icon?: any
  glowColor?: 'red' | 'cyan' | 'blue' | 'orange' | 'purple'
  className?: string
}) {
  const glowColors = {
    red: 'shadow-neon-red border-tron-red/30',
    cyan: 'shadow-neon-cyan border-tron-cyan/30',
    blue: 'shadow-neon-blue border-tron-blue/30',
    orange: 'shadow-neon-orange border-tron-orange/30',
    purple: 'shadow-neon-purple border-tron-purple/30',
  }

  const textColors = {
    red: 'text-tron-red',
    cyan: 'text-tron-cyan',
    blue: 'text-tron-blue',
    orange: 'text-tron-orange',
    purple: 'text-tron-purple',
  }

  const bgColors = {
    red: 'bg-tron-red/10 border-tron-red/30',
    cyan: 'bg-tron-cyan/10 border-tron-cyan/30',
    blue: 'bg-tron-blue/10 border-tron-blue/30',
    orange: 'bg-tron-orange/10 border-tron-orange/30',
    purple: 'bg-tron-purple/10 border-tron-purple/30',
  }

  const borderGradients = {
    red: 'via-tron-red',
    cyan: 'via-tron-cyan',
    blue: 'via-tron-blue',
    orange: 'via-tron-orange',
    purple: 'via-tron-purple',
  }

  return (
    <motion.div
      className={`
        neon-card relative
        bg-gradient-to-br from-bg-tertiary/90 to-bg-secondary/90
        backdrop-blur-xl rounded-2xl p-6
        border ${glowColors[glowColor]}
        ${className}
      `}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ 
        duration: 0.25, 
        ease: 'easeOut',
        layout: { duration: 0.2 }
      }}
      layout
    >
      {/* Top border animation */}
      <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
        <motion.div
          className={`h-full w-1/3 bg-gradient-to-r from-transparent ${borderGradients[glowColor]} to-transparent`}
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Header */}
      {(title || Icon) && (
        <div className="flex items-center gap-3 mb-4">
          {Icon && (
            <div className={`p-2 rounded-lg border ${bgColors[glowColor]}`}>
              <Icon className={`w-5 h-5 ${textColors[glowColor]}`} />
            </div>
          )}
          {title && (
            <h3 className={`text-lg font-orbitron font-bold ${textColors[glowColor]}`}>
              {title}
            </h3>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Background effect */}
      <div className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none">
        <div className="hex-pattern absolute inset-0" />
      </div>
    </motion.div>
  )
}

// ⚡ Stat Card Component
export function TronStatCard({
  label,
  value,
  change,
  icon: Icon,
  trend = 'up',
}: {
  label: string
  value: string
  change?: string
  icon: any
  trend?: 'up' | 'down'
}) {
  return (
    <TronCard glowColor={trend === 'up' ? 'red' : 'orange'}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 uppercase tracking-wide font-orbitron mb-2">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-orbitron">
              {value}
            </span>
            {change && (
              <span className={`
                text-sm font-semibold
                ${trend === 'up' ? 'text-tron-red' : 'text-tron-orange'}
              `}>
                {trend === 'up' ? '+' : ''}{change}
              </span>
            )}
          </div>
        </div>
        <div className={`
          p-3 rounded-xl
          ${trend === 'up' ? 'bg-tron-red/10' : 'bg-tron-orange/10'}
          ${trend === 'up' ? 'border-tron-red/30' : 'border-tron-orange/30'}
          border
        `}>
          <Icon className={`
            w-6 h-6
            ${trend === 'up' ? 'text-tron-red' : 'text-tron-orange'}
          `} />
        </div>
      </div>
    </TronCard>
  )
}

// 🎯 Progress Bar Component
export function TronProgressBar({
  value,
  max,
  label,
  showValue = true,
}: {
  value: number
  max: number
  label?: string
  showValue?: boolean
}) {
  const percentage = (value / max) * 100

  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && (
            <span className="text-gray-400 font-orbitron uppercase tracking-wide">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-tron-red font-semibold font-orbitron">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      
      <div className="relative h-3 bg-bg-tertiary rounded-full border border-tron-red/30 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-tron-red/5 to-tron-red-bright/5" />
        
        {/* Progress */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-tron-red to-tron-red-bright rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            boxShadow: '0 0 20px rgba(255, 26, 42, 0.6), inset 0 0 20px rgba(255, 26, 42, 0.3)',
          }}
        />
        
        {/* Animated shine */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// 🌟 Badge Component
export function TronBadge({
  children,
  variant = 'default',
  size = 'md',
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}) {
  const variants = {
    default: 'bg-tron-red/20 text-tron-red border-tron-red/30',
    success: 'bg-tron-purple/20 text-tron-purple border-tron-purple/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
    danger: 'bg-tron-orange/20 text-tron-orange border-tron-orange/30',
  }

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const dotColors = {
    default: 'bg-tron-red shadow-neon-red',
    success: 'bg-tron-purple shadow-neon-purple',
    warning: 'bg-yellow-400',
    danger: 'bg-tron-orange shadow-neon-orange',
  }

  return (
    <span className={`
      inline-flex items-center gap-1
      rounded-full border font-orbitron font-semibold uppercase tracking-wider
      ${variants[variant]}
      ${sizes[size]}
    `}>
      <span className={`
        w-1.5 h-1.5 rounded-full
        ${dotColors[variant]}
      `} />
      {children}
    </span>
  )
}

// 🎪 Tab Navigation Component
export function TronTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: any }[]
  activeTab: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-2 p-2 bg-bg-tertiary/50 rounded-xl border border-tron-red/20">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-6 py-3 rounded-lg border
              font-orbitron font-semibold uppercase tracking-wide text-sm
              transition-all duration-300
              ${isActive 
                ? 'text-tron-red bg-tron-red/10 border-tron-red/50' 
                : 'text-gray-400 hover:text-tron-red/70 border-transparent'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
            
            {isActive && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-tron-red"
                layoutId="activeTab"
                style={{ boxShadow: '0 0 10px rgba(255, 26, 42, 0.8)' }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

// 🔔 Alert Component
export function TronAlert({
  children,
  type = 'info',
  onClose,
}: {
  children: React.ReactNode
  type?: 'info' | 'success' | 'warning' | 'error'
  onClose?: () => void
}) {
  const types = {
    info: { bg: 'bg-tron-red/10', border: 'border-tron-red/30', text: 'text-tron-red', icon: Sparkles },
    success: { bg: 'bg-tron-purple/10', border: 'border-tron-purple/30', text: 'text-tron-purple', icon: Shield },
    warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-400/30', text: 'text-yellow-400', icon: Zap },
    error: { bg: 'bg-tron-orange/10', border: 'border-tron-orange/30', text: 'text-tron-orange', icon: TrendingUp },
  }

  const config = types[type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        relative flex items-start gap-3 p-4 rounded-xl
        border ${config.border} ${config.bg}
        backdrop-blur-xl
      `}
    >
      <Icon className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 text-sm text-gray-200">
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`${config.text} hover:opacity-70 transition-opacity`}
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}

// 🎨 Input Field Component
export function TronInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
  error,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  icon?: any
  error?: string
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-orbitron text-tron-red uppercase tracking-wide">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-tron-red/50">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            input-tron w-full
            ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3
            bg-bg-tertiary/80 backdrop-blur-xl
            border-2 rounded-xl
            font-orbitron text-tron-red
            placeholder:text-tron-red/30
            outline-none transition-all duration-300
            ${error 
              ? 'border-tron-orange focus:border-tron-orange focus:shadow-neon-orange' 
              : 'border-tron-red/30 focus:border-tron-red focus:shadow-neon-red'
            }
          `}
        />
        
        {/* Animated border */}
        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-tron-red to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-tron-orange flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-tron-orange" />
          {error}
        </p>
      )}
    </div>
  )
}

// 🎯 Example Usage Component
export function TronUIShowcase() {
  const [activeTab, setActiveTab] = React.useState('staking')

  return (
    <div className="min-h-screen p-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <motion.h1
          className="text-6xl font-orbitron font-bold gradient-text"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          LUMINEX
        </motion.h1>
        <p className="text-xl text-gray-400 font-exo">
          Tron-Inspired Interface Design
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TronStatCard
          label="Total Staked"
          value="1,234"
          change="+12.5%"
          icon={Zap}
          trend="up"
        />
        <TronStatCard
          label="APY Rate"
          value="325%"
          change="+5%"
          icon={TrendingUp}
          trend="up"
        />
        <TronStatCard
          label="Users"
          value="5.2K"
          change="+234"
          icon={Shield}
          trend="up"
        />
        <TronStatCard
          label="Revenue"
          value="$89K"
          change="-2.1%"
          icon={Sparkles}
          trend="down"
        />
      </div>

      {/* Tabs */}
      <TronTabs
        tabs={[
          { id: 'staking', label: 'Staking', icon: Zap },
          { id: 'membership', label: 'Membership', icon: Shield },
          { id: 'games', label: 'Games', icon: Sparkles },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TronCard title="Flexible Pool" icon={Zap} glowColor="red">
          <div className="space-y-4">
            <TronProgressBar value={750} max={1000} label="Pool Capacity" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400">APY</span>
              <TronBadge variant="success">50%</TronBadge>
            </div>
            <TronButton variant="primary" size="md" className="w-full">
              Stake Now
            </TronButton>
          </div>
        </TronCard>

        <TronCard title="365-Day Lock" icon={Shield} glowColor="blue">
          <div className="space-y-4">
            <TronProgressBar value={450} max={1000} label="Pool Capacity" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400">APY</span>
              <TronBadge variant="success">325%</TronBadge>
            </div>
            <TronButton variant="secondary" size="md" className="w-full">
              Stake Now
            </TronButton>
          </div>
        </TronCard>
      </div>

      {/* Alert */}
      <TronAlert type="info">
        🎉 New feature: Earn 2x rewards during the launch week!
      </TronAlert>
    </div>
  )
}

