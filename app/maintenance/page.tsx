'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TronShell, TronPanel } from '@/components/tron'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'

export default function MaintenancePage() {
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check system status
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/system/status')
        const data = await response.json()
        
        if (data.data?.maintenanceMessage) {
          setMaintenanceMessage(data.data.maintenanceMessage)
        }
        
        // If maintenance mode is disabled, redirect to home
        if (!data.data?.maintenanceMode) {
          window.location.href = '/'
        }
      } catch (error) {
        console.error('Failed to check system status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkStatus()
    
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <TronShell variant="maintenance" showEnergyStream={true}>
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <TronPanel
            status="danger"
            padding="lg"
            className="text-center"
            icon={AlertTriangle}
            title="SYSTEM IN RECLAMATION MODE"
          >
            <div className="space-y-6">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="mx-auto w-20 h-20 rounded-full border-4 border-tron-orange/50 border-t-transparent"
              />

              <div className="space-y-3">
                <h2 className="text-2xl font-orbitron font-bold text-tron-orange neon-text">
                  SYSTEM MAINTENANCE
                </h2>
                
                {maintenanceMessage ? (
                  <p className="text-gray-300 font-orbitron text-sm leading-relaxed">
                    {maintenanceMessage}
                  </p>
                ) : (
                  <p className="text-gray-300 font-orbitron text-sm leading-relaxed">
                    The system is currently undergoing maintenance. Please check back soon.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-gray-400 text-xs font-orbitron">
                <Clock className="w-4 h-4" />
                <span>We'll be back shortly</span>
              </div>

              <motion.button
                onClick={() => window.location.reload()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mx-auto flex items-center gap-2 rounded-lg border border-tron-orange/30 bg-tron-orange/10 px-4 py-2 text-sm font-orbitron text-tron-orange transition-colors hover:bg-tron-orange/20"
              >
                <RefreshCw className="w-4 h-4" />
                Check Again
              </motion.button>
            </div>
          </TronPanel>
        </motion.div>
      </div>
    </TronShell>
  )
}

