'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AILoadingStateProps {
  message?: string
  showDots?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const messages = [
  'Processing...',
  'Analyzing data...',
  'Optimizing performance...',
  'Loading resources...',
  'Syncing state...',
]

export function AILoadingState({
  message,
  showDots = true,
  size = 'md',
  className = '',
}: AILoadingStateProps) {
  const [currentMessage, setCurrentMessage] = React.useState(message || messages[0])
  const [messageIndex, setMessageIndex] = React.useState(0)

  React.useEffect(() => {
    if (!message) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => {
          const next = (prev + 1) % messages.length
          setCurrentMessage(messages[next])
          return next
        })
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [message])

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* AI-like pulsing circle - Static for performance */}
      <div className={`relative ${sizes[size]}`}>
        <div className="absolute inset-0 rounded-full bg-tron-red/30 blur-md" />
        <div className="absolute inset-0 rounded-full bg-tron-red border-2 border-tron-red-bright" />
        <div
          className="absolute inset-0 rounded-full border-2 border-tron-red animate-spin"
          style={{
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            animationDuration: '2s',
            transform: 'translateZ(0)'
          }}
        />
      </div>

      {/* Message - Static */}
      <p className="text-sm font-orbitron text-tron-red text-center">
        {currentMessage}
      </p>

      {/* Loading dots - Static pulsing with CSS */}
      {showDots && (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`rounded-full bg-tron-red ${dotSizes[size]} animate-pulse`}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s',
                transform: 'translateZ(0)'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Smart loading overlay
export function AILoadingOverlay({ 
  isVisible, 
  message 
}: { 
  isVisible: boolean
  message?: string 
}) {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-200">
      <AILoadingState message={message} size="lg" />
    </div>
  )
}

