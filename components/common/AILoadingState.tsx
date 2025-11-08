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
      {/* AI-like pulsing circle */}
      <motion.div
        className={`relative ${sizes[size]}`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-tron-red/30 blur-md" />
        <div className="absolute inset-0 rounded-full bg-tron-red border-2 border-tron-red-bright" />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-tron-red"
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />
      </motion.div>

      {/* Message with smooth transition */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentMessage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-orbitron text-tron-red text-center"
        >
          {currentMessage}
        </motion.p>
      </AnimatePresence>

      {/* Loading dots */}
      {showDots && (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`rounded-full bg-tron-red ${dotSizes[size]}`}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
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
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <AILoadingState message={message} size="lg" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

