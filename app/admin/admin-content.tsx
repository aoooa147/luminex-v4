'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Users, DollarSign, TrendingUp, BarChart3, Settings, 
  LogOut, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw,
  Eye, Trash2, Edit, Lock, Unlock, Crown, Wallet, Clock, 
  Activity, PieChart, Archive, Download, UserPlus, PiggyBank, Coins, Send
} from "lucide-react";
import { ethers } from "ethers";
import { TREASURY_ADDRESS, TOKEN_NAME, POOLS, MEMBERSHIP_TIERS } from '@/lib/utils/constants';
import { formatNumber } from '@/lib/utils/helpers';
// Admin wallet address - configure this in .env.local as ADMIN_WALLET_ADDRESS
const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || TREASURY_ADDRESS;

// Simple useMiniKit for admin page
const useMiniKit = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name?: string; username?: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if MiniKit is available
    if (typeof window !== 'undefined' && (window as any).MiniKit) {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    
    const connectWallet = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).MiniKit?.walletAuth) {
          const walletData = await (window as any).MiniKit.walletAuth();
          if (walletData?.address) {
            setWallet({ address: walletData.address, name: walletData.name, username: walletData.username });
            setIsConnected(true);
            setUserInfo({ name: walletData.name, username: walletData.username });
          }
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    };
    
    connectWallet();
  }, [ready]);

  const getWalletInfo = useCallback(() => ({
    address: wallet?.address,
    isConnected,
    user: userInfo
  }), [wallet, isConnected, userInfo]);

  return { miniKitReady: ready, getWalletInfo };
};

const AdminPage = () => {
  const { miniKitReady, getWalletInfo } = useMiniKit();
  const walletInfo = useMemo(() => getWalletInfo(), [getWalletInfo]);
  const walletAddress = walletInfo.address;
  const isConnected = walletInfo.isConnected;
  const userInfo = walletInfo.user;

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStaking: 0,
    totalRevenue: 0,
    totalReferrals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!miniKitReady || !isConnected || !walletAddress) {
      return;
    }

    const checkAdminAccess = async () => {
      try {
        // Convert addresses to lowercase for comparison
        const isAdminUser = walletAddress?.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase();
        setIsAdmin(isAdminUser);
        setShowAccessDenied(!isAdminUser);
        
        if (isAdminUser) {
          await loadAdminStats();
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        setShowAccessDenied(true);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [miniKitReady, isConnected, walletAddress]);

  const loadAdminStats = async () => {
    try {
      // TODO: In production, fetch real stats from your backend/database
      // For now, using mock data with localStorage as simple storage
      if (typeof window !== 'undefined') {
        const storedStats = localStorage.getItem('luminex_admin_stats');
        if (storedStats) {
          setStats(JSON.parse(storedStats));
        } else {
          // Initialize with default stats
          setStats({
            totalUsers: 156,
            totalStaking: 125000,
            totalRevenue: 8500,
            totalReferrals: 42,
          });
        }
      }
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadAdminStats();
      
      // Haptic feedback
      if ((window as any).MiniKit?.commandsAsync?.sendHapticFeedback) {
        await (window as any).MiniKit.commandsAsync.sendHapticFeedback({ type: 'success' });
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Access Denied Screen
  if (!miniKitReady || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-pink-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-pink-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card glass-card-hover rounded-2xl p-8 text-center border border-purple-400/30"
          >
            <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Admin Access Required</h2>
            <p className="text-gray-300 mb-6">
              Please connect your wallet to access the admin dashboard.
            </p>
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-300 text-sm">
                Only authorized admin wallets can access this area.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (showAccessDenied || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-pink-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card glass-card-hover rounded-2xl p-8 text-center border border-red-400/30"
          >
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-300 mb-6">
              You don't have permission to access the admin dashboard.
            </p>
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm font-mono break-all">
                Required: {ADMIN_WALLET_ADDRESS.slice(0, 10)}...{ADMIN_WALLET_ADDRESS.slice(-8)}
              </p>
              <p className="text-red-300 text-sm font-mono break-all mt-2">
                Connected: {walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}
              </p>
            </div>
            <motion.a
              href="/"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block btn-premium text-white font-semibold px-6 py-3 rounded-lg glow-purple-sm"
            >
              Back to App
            </motion.a>
          </motion.div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-pink-950 relative main-container">
      {/* Enhanced Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl float-animation"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl float-animation-delay-1"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl float-animation-delay-2"></div>
      </div>

      {/* Header */}
      <div className="relative bg-black/60 backdrop-blur-2xl border-b border-purple-500/20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center glow-purple-sm">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  Admin Dashboard
                  <span className="text-xs bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">🔒 Secure</span>
                </h1>
                <p className="text-sm text-gray-400">
                  Full system control & monitoring
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refreshStats}
                disabled={refreshing}
                className="glass-card glass-card-hover rounded-xl px-4 py-2 flex items-center space-x-2 text-white border border-purple-400/30"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </motion.button>
              <motion.a
                href="/"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="glass-card glass-card-hover rounded-xl px-4 py-2 flex items-center space-x-2 text-white border border-purple-400/30"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Back to App</span>
              </motion.a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-6xl mx-auto px-6 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card glass-card-hover rounded-2xl p-6 border border-purple-400/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center glow-blue">
                <Users className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm mb-2">Total Users</p>
            <p className="text-3xl font-extrabold text-white">{stats.totalUsers}</p>
            <p className="text-green-400 text-xs mt-2">↗ +12% this month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card glass-card-hover rounded-2xl p-6 border border-purple-400/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 gradient-purple-pink rounded-xl flex items-center justify-center glow-purple-sm">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm mb-2">Total Staking</p>
            <p className="text-3xl font-extrabold text-white">{formatNumber(stats.totalStaking)}</p>
            <p className="text-purple-400 text-xs mt-2">↗ +8.5% this month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card glass-card-hover rounded-2xl p-6 border border-purple-400/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center glow-blue">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm mb-2">Total Revenue</p>
            <p className="text-3xl font-extrabold text-white">${formatNumber(stats.totalRevenue)}</p>
            <p className="text-green-400 text-xs mt-2">↗ +15% this month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card glass-card-hover rounded-2xl p-6 border border-purple-400/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center glow-purple-sm">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm mb-2">Total Referrals</p>
            <p className="text-3xl font-extrabold text-white">{stats.totalReferrals}</p>
            <p className="text-yellow-400 text-xs mt-2">↗ +25% this month</p>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card glass-card-hover rounded-2xl p-6 border border-purple-400/30 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card glass-card-hover rounded-xl p-4 flex flex-col items-center space-y-2 text-white border border-blue-400/30 magnetic-hover"
            >
              <BarChart3 className="w-6 h-6 text-blue-400" />
              <span className="text-sm font-semibold">View Analytics</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card glass-card-hover rounded-xl p-4 flex flex-col items-center space-y-2 text-white border border-purple-400/30 magnetic-hover"
            >
              <Archive className="w-6 h-6 text-purple-400" />
              <span className="text-sm font-semibold">Export Data</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card glass-card-hover rounded-xl p-4 flex flex-col items-center space-y-2 text-white border border-green-400/30 magnetic-hover"
            >
              <Download className="w-6 h-6 text-green-400" />
              <span className="text-sm font-semibold">Download Report</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card glass-card-hover rounded-xl p-4 flex flex-col items-center space-y-2 text-white border border-yellow-400/30 magnetic-hover"
            >
              <Settings className="w-6 h-6 text-yellow-400" />
              <span className="text-sm font-semibold">Settings</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Token Distribution Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card glass-card-hover rounded-2xl p-6 border border-yellow-400/30 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            Token Distribution System
          </h2>
          <div className="space-y-3">
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                How It Works
              </h3>
              <ul className="space-y-2 text-white/80 text-sm">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Free LUX:</strong> Users claim 1 LUX/day from Smart Contract</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Rewards:</strong> Staking APY calculated automatically, users claim when ready</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Referrals:</strong> 50 LUX each to referrer + new user (one-time)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>All ON-CHAIN:</strong> Smart Contract handles all distributions automatically</span>
                </li>
              </ul>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Admin Action Required
              </h3>
              <p className="text-white/80 text-sm mb-2">
                Fund Staking Contract with LUX tokens using:
              </p>
              <div className="bg-black/30 rounded p-3 font-mono text-xs text-blue-300 break-all">
                stakingContract.fundContract(amount)
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card glass-card-hover rounded-2xl p-6 border border-purple-400/30"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {/* Mock recent activities */}
            {[
              { type: 'staking', user: '0x1234...5678', amount: '5,000 LUX', time: '2 mins ago', status: 'success' },
              { type: 'membership', user: '0xabcd...efgh', amount: 'Gold Tier', time: '15 mins ago', status: 'success' },
              { type: 'referral', user: '0x5678...1234', amount: 'New referral', time: '1 hour ago', status: 'success' },
              { type: 'withdrawal', user: '0x9876...5432', amount: '2,500 LUX', time: '3 hours ago', status: 'success' },
            ].map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-purple-400/20 hover:border-purple-400/40 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{activity.type.toUpperCase()}</p>
                    <p className="text-gray-400 text-sm">{activity.user}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-white font-semibold">{activity.amount}</p>
                    <p className="text-gray-400 text-sm">{activity.time}</p>
                  </div>
                  {activity.status === 'success' && (
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>Admin access logged</span>
        </div>
        <span>© {new Date().getFullYear()} Luminex Staking - Admin Panel</span>
      </div>
    </div>
  );
};

export default AdminPage;

