'use client'

import React, { useEffect, useState } from 'react'
import { Radio, X } from 'lucide-react'

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

  if (!isVisible) return null;

  return (
    <div className={`relative z-50 ${className || ''}`}>
      <div
        className="mx-4 mt-4 rounded-xl border border-tron-red/30 bg-gradient-to-r from-tron-red/10 via-tron-red/5 to-tron-red/10 backdrop-blur-sm p-4 shadow-lg"
        style={{
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), 0 0 25px rgba(255, 26, 42, 0.2)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Radio className="w-5 h-5 text-tron-red" style={{ filter: 'drop-shadow(0 0 6px rgba(255, 26, 42, 0.6))' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-orbitron text-white leading-relaxed">
              {broadcast.message}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-tron-red/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss broadcast"
          >
            <X className="w-4 h-4 text-tron-red" />
          </button>
        </div>
      </div>
    </div>
  )
}

