'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Broadcast, X } from 'lucide-react'

interface BroadcastMessageProps {
  className?: string
}

export function BroadcastMessage({ className }: BroadcastMessageProps) {
  const [broadcast, setBroadcast] = useState<{ message: string; enabled: boolean } | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const checkBroadcast = async () => {
      try {
        const response = await fetch('/api/system/status')
        const data = await response.json()
        
        if (data.data?.broadcastEnabled && data.data?.broadcastMessage) {
          setBroadcast({
            message: data.data.broadcastMessage,
            enabled: data.data.broadcastEnabled,
          })
          setIsVisible(true)
          setIsDismissed(false)
        } else {
          setBroadcast(null)
        }
      } catch (error) {
        console.error('Failed to check broadcast:', error)
      }
    }

    checkBroadcast()
    
    // Check every 30 seconds
    const interval = setInterval(checkBroadcast, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    // Store dismissal in sessionStorage (only for this session)
    sessionStorage.setItem('broadcast_dismissed', Date.now().toString())
  }

  // Check if dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('broadcast_dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const now = Date.now()
      // Auto-show again after 1 hour
      if (now - dismissedTime > 3600000) {
        sessionStorage.removeItem('broadcast_dismissed')
        setIsDismissed(false)
      } else {
        setIsDismissed(true)
        setIsVisible(false)
      }
    }
  }, [])

  if (!broadcast || !broadcast.enabled || !broadcast.message || isDismissed) {
    return null
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`relative z-50 ${className || ''}`}
        >
          <div
            className="mx-4 mt-4 rounded-xl border border-tron-orange/30 bg-gradient-to-r from-tron-orange/10 via-tron-orange/5 to-tron-orange/10 backdrop-blur-xl p-4 shadow-lg"
            style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 107, 53, 0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Broadcast className="w-5 h-5 text-tron-orange" style={{ filter: 'drop-shadow(0 0 8px var(--tron-orange))' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-orbitron text-white leading-relaxed">
                  {broadcast.message}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-tron-orange/20 transition-colors"
                aria-label="Dismiss broadcast"
              >
                <X className="w-4 h-4 text-tron-orange" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

