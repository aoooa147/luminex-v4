'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { TronShell, TronPanel, TronButton, TronStatCard } from '@/components/tron'
import { 
  Shield, Settings, AlertTriangle, Broadcast, Users, 
  Activity, Database, Zap, RefreshCw, Power, CheckCircle,
  TrendingUp, Server, Clock
} from 'lucide-react'

interface SystemSettings {
  maintenanceMode: boolean
  maintenanceMessage: string | null
  broadcastMessage: string | null
  broadcastEnabled: boolean
  maxConcurrentUsers: number
  systemVersion: string
  status: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')

  useEffect(() => {
    // Check if user is admin (this should be done server-side in production)
    const checkAdmin = async () => {
      try {
        // Get user address from sessionStorage
        const userAddress = sessionStorage.getItem('verifiedAddress') || sessionStorage.getItem('user_address')
        if (!userAddress) {
          router.push('/')
          return
        }

        const response = await fetch('/api/admin/settings', {
          headers: {
            'x-user-id': userAddress,
          },
        })
        if (!response.ok) {
          // Not admin, redirect to home
          router.push('/')
          return
        }
        loadSettings(userAddress)
      } catch (error) {
        console.error('Failed to check admin status:', error)
        router.push('/')
      }
    }

    checkAdmin()
  }, [router])

  const loadSettings = async (userAddress?: string) => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: userAddress ? {
          'x-user-id': userAddress,
        } : {},
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.data)
        setMaintenanceMessage(data.data.maintenanceMessage || '')
        setBroadcastMessage(data.data.broadcastMessage || '')
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMaintenance = async (enabled: boolean) => {
    if (!confirm(`Are you sure you want to ${enabled ? 'enable' : 'disable'} maintenance mode?`)) {
      return
    }

    const userAddress = sessionStorage.getItem('verifiedAddress') || sessionStorage.getItem('user_address')

    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userAddress || '',
        },
        body: JSON.stringify({
          maintenanceMode: enabled,
          maintenanceMessage: enabled ? maintenanceMessage : null,
        }),
      })

      if (response.ok) {
        await loadSettings(userAddress || undefined)
        alert(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`)
      } else {
        alert('Failed to update maintenance mode')
      }
    } catch (error) {
      console.error('Failed to toggle maintenance:', error)
      alert('Failed to update maintenance mode')
    } finally {
      setIsUpdating(false)
    }
  }

  const updateBroadcast = async () => {
    const userAddress = sessionStorage.getItem('verifiedAddress') || sessionStorage.getItem('user_address')

    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userAddress || '',
        },
        body: JSON.stringify({
          broadcastMessage: broadcastMessage,
          broadcastEnabled: !!broadcastMessage,
        }),
      })

      if (response.ok) {
        await loadSettings(userAddress || undefined)
        alert('Broadcast message updated')
      } else {
        alert('Failed to update broadcast message')
      }
    } catch (error) {
      console.error('Failed to update broadcast:', error)
      alert('Failed to update broadcast message')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <TronShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="mx-auto w-12 h-12 border-4 border-tron-cyan/50 border-t-transparent rounded-full"
            />
            <p className="mt-4 text-gray-400 font-orbitron">Loading...</p>
          </div>
        </div>
      </TronShell>
    )
  }

  return (
    <TronShell>
      <div className="min-h-screen px-4 py-6 pb-24">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-tron-cyan" style={{ filter: 'drop-shadow(0 0 10px var(--tron-cyan))' }} />
              <h1 className="text-3xl font-orbitron font-bold text-tron-cyan neon-text">
                ADMIN CONTROL CENTER
              </h1>
            </div>
            <TronButton
              variant="secondary"
              size="sm"
              onClick={() => router.push('/')}
            >
              Back to App
            </TronButton>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TronStatCard
              label="System Status"
              value={settings?.status === 'operational' ? 'OPERATIONAL' : 'MAINTENANCE'}
              icon={settings?.status === 'operational' ? CheckCircle : AlertTriangle}
              trend={settings?.status === 'operational' ? 'up' : 'down'}
            />
            <TronStatCard
              label="Max Concurrent Users"
              value={settings?.maxConcurrentUsers?.toLocaleString() || '100,000'}
              icon={Users}
              trend="up"
            />
            <TronStatCard
              label="System Version"
              value={settings?.systemVersion || '4.0.0'}
              icon={Activity}
              trend="up"
            />
          </div>

          {/* Maintenance Mode */}
          <TronPanel
            title="Maintenance Mode"
            icon={Power}
            status={settings?.maintenanceMode ? 'danger' : 'default'}
            padding="lg"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 font-orbitron text-sm mb-2">
                    {settings?.maintenanceMode 
                      ? 'System is currently in maintenance mode' 
                      : 'System is operational'}
                  </p>
                  {settings?.maintenanceMode && settings?.maintenanceMessage && (
                    <p className="text-tron-orange text-xs font-orbitron">
                      {settings.maintenanceMessage}
                    </p>
                  )}
                </div>
                <TronButton
                  variant={settings?.maintenanceMode ? 'danger' : 'success'}
                  size="sm"
                  onClick={() => toggleMaintenance(!settings?.maintenanceMode)}
                  disabled={isUpdating}
                >
                  {settings?.maintenanceMode ? 'Disable' : 'Enable'} Maintenance
                </TronButton>
              </div>

              {settings?.maintenanceMode && (
                <div className="space-y-2">
                  <label className="block text-xs font-orbitron text-gray-400 uppercase tracking-wide">
                    Maintenance Message
                  </label>
                  <textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="Enter maintenance message..."
                    className="w-full rounded-lg border border-tron-cyan/30 bg-bg-tertiary/80 p-3 text-sm text-white font-orbitron placeholder:text-gray-500 focus:border-tron-cyan focus:outline-none"
                    rows={3}
                  />
                  <TronButton
                    variant="primary"
                    size="sm"
                    onClick={() => toggleMaintenance(true)}
                    disabled={isUpdating}
                  >
                    Update Message
                  </TronButton>
                </div>
              )}
            </div>
          </TronPanel>

          {/* Broadcast Message */}
          <TronPanel
            title="Broadcast Message"
            icon={Broadcast}
            status={settings?.broadcastEnabled ? 'warning' : 'default'}
            padding="lg"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 font-orbitron text-sm">
                    {settings?.broadcastEnabled 
                      ? 'Broadcast message is active' 
                      : 'No broadcast message'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-orbitron text-gray-400 uppercase tracking-wide">
                  Broadcast Message
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter broadcast message (leave empty to disable)..."
                  className="w-full rounded-lg border border-tron-cyan/30 bg-bg-tertiary/80 p-3 text-sm text-white font-orbitron placeholder:text-gray-500 focus:border-tron-cyan focus:outline-none"
                  rows={3}
                />
                <TronButton
                  variant="primary"
                  size="sm"
                  onClick={updateBroadcast}
                  disabled={isUpdating}
                >
                  {broadcastMessage ? 'Update Broadcast' : 'Disable Broadcast'}
                </TronButton>
              </div>
            </div>
          </TronPanel>

          {/* System Actions */}
          <TronPanel
            title="System Actions"
            icon={Settings}
            padding="lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TronButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  const userAddress = sessionStorage.getItem('verifiedAddress') || sessionStorage.getItem('user_address')
                  loadSettings(userAddress || undefined)
                }}
                disabled={isUpdating}
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Refresh Status
              </TronButton>
              <TronButton
                variant="primary"
                size="sm"
                onClick={() => router.push('/')}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                View Statistics
              </TronButton>
            </div>
          </TronPanel>
        </div>
      </div>
    </TronShell>
  )
}
