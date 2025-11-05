// Temporary file - Clean redesign of WorldIDVerification component
// This will be integrated into main-app.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MoreVertical, AlertTriangle, Shield, Loader2 } from 'lucide-react';
import Logo3D from '@/components/Logo3D';

export const WorldIDVerificationClean = ({ onVerify }: { onVerify: () => void }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const hasWindowMiniKit = typeof window !== 'undefined' && (window as any).MiniKit;
      if (hasWindowMiniKit) {
        const MiniKit = (window as any).MiniKit;
        if (MiniKit.commandsAsync?.walletAuth) {
          const nonce = crypto.randomUUID().replace(/-/g, '');
          const result = await MiniKit.commandsAsync.walletAuth({ nonce });
          const walletData = result.finalPayload;
          const res = await fetch('/api/complete-siwe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: walletData })
          });
          const data = await res.json();
          if (data.status === 'ok' && data.isValid) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('verified', 'true');
              if (walletData.address) {
                sessionStorage.setItem('verifiedAddress', walletData.address);
              }
            }
            onVerify();
          } else {
            throw new Error(data.message || 'Wallet authentication failed');
          }
        } else {
          throw new Error('Wallet auth not available');
        }
      } else {
        onVerify();
      }
    } catch (error: any) {
      setVerifyError(error.message || 'Authentication failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-yellow-600/20 h-14">
        <div className="flex items-center justify-between px-4 h-full">
          <button
            onClick={() => window.history.back()}
            className="w-8 h-8 flex items-center justify-center text-white hover:text-yellow-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center border border-yellow-500/50">
              <span className="text-black font-black text-xs">L</span>
            </div>
            <span className="text-white font-semibold text-sm">Luminex Staking</span>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <button className="w-8 h-8 flex items-center justify-center text-white hover:text-yellow-400 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20 pb-20">
        {/* Background */}
        <div className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(234, 179, 8, 0.1) 35px, rgba(234, 179, 8, 0.1) 70px)`,
          }}
        />
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"
            animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-3xl"
            animate={{ opacity: [0.08, 0.15, 0.08], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-md px-4">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-6"
          >
            <Logo3D size={140} interactive={true} />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-black text-center mb-2"
          >
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 bg-clip-text text-transparent">
              LUMINEX
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center text-xs font-bold uppercase tracking-wider mb-8"
            style={{ letterSpacing: '0.2em', color: 'rgba(234, 179, 8, 0.9)' }}
          >
            STAKING PLATFORM
          </motion.p>

          {/* Verification Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative rounded-2xl p-6 border-2 border-yellow-600/50 shadow-2xl backdrop-blur-xl bg-black/80"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 via-amber-600/5 to-transparent rounded-2xl" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />

            <div className="relative z-10">
              {/* Shield Icon */}
              <div className="flex justify-center mb-4">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-600 via-amber-600 to-yellow-700 border-2 border-yellow-600/60 shadow-lg"
                >
                  <Shield className="w-8 h-8 text-black" />
                </motion.div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-extrabold mb-3 text-center">
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Verify Humanity
                </span>
              </h2>

              {/* Description - Centered */}
              <p className="text-gray-300 text-sm text-center leading-relaxed mb-6 px-2">
                You must verify your humanity to access the application.
              </p>

              {/* Error */}
              {verifyError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-center text-sm">
                  {verifyError}
                </div>
              )}

              {/* Verify Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Verify</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* "เปิด MiniKit" Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        onClick={() => {
          if (typeof window !== 'undefined' && (window as any).MiniKit) {
            handleVerify();
          } else {
            alert('กรุณาเปิดแอปใน World App เพื่อใช้งาน MiniKit');
          }
        }}
        className="fixed bottom-4 right-4 z-40 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold text-xs rounded-lg shadow-lg hover:shadow-xl transition-all border border-purple-400/50"
        style={{
          boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.2)',
        }}
      >
        เปิด MiniKit
      </motion.button>
    </div>
  );
};

