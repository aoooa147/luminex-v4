'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';
import Logo3D from './Logo3D';

interface WorldIDVerificationProps {
  onVerify: () => void;
}

export default function WorldIDVerification({ onVerify }: WorldIDVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  
  // Check if running in MiniKit environment
  const isMiniKit = typeof window !== 'undefined' && !!(window as any).MiniKit;

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
              if (data.siweMessageData?.chain_id) {
                sessionStorage.setItem('chainId', String(data.siweMessageData.chain_id));
              }
              if (walletData.name || walletData.username) {
                sessionStorage.setItem('userName', walletData.name || walletData.username || '');
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
    <div 
      className="h-[100dvh] bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden flex flex-col"
      style={{
        height: '100dvh',
        paddingTop: 'calc(var(--safe-top) + clamp(16px, 4vw, 24px))',
        paddingBottom: isMiniKit 
          ? 'calc(var(--safe-bottom) + clamp(16px, 4vw, 24px))' 
          : 'calc(var(--safe-bottom) + clamp(16px, 4vw, 24px))',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
        overflowY: 'hidden',
      }}
    >
      {/* Main Content - Full Screen Layout */}
      <div 
        className="flex flex-col items-center justify-center flex-1 overflow-y-auto"
        style={{
          padding: 'clamp(16px, 4vw, 32px)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl"
            animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"
            animate={{ opacity: [0.1, 0.15, 0.1], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Hero Section - Flex Layout (No absolute positioning) */}
        <section className="w-full max-w-lg flex flex-col gap-6">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center space-y-4"
          >
            <div 
              className="w-full max-w-[min(90vw,500px)] mx-auto flex items-center justify-center"
              style={{
                aspectRatio: '1/1',
              }}
            >
              <Logo3D size={140} interactive={true} />
            </div>
            <div className="text-center space-y-2 w-full">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="font-black bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 bg-clip-text text-transparent"
                style={{
                  fontSize: 'clamp(28px, 5vw, 42px)',
                  lineHeight: 1.1,
                }}
              >
                LUMINEX
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="font-bold text-yellow-400/80 tracking-widest uppercase text-center w-full"
                style={{
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  letterSpacing: '0.3em',
                }}
              >
                STAKING PLATFORM
              </motion.p>
            </div>
          </motion.div>

          {/* Verification Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative rounded-[24px] bg-black/60 backdrop-blur-xl border border-yellow-600/30"
            style={{
              padding: 'clamp(20px, 5vw, 32px)',
              background: 'radial-gradient(120% 120% at 0% 0%, rgba(26, 18, 8, 0.8) 0%, rgba(11, 14, 20, 0.6) 60%)',
              boxShadow: '0 0 30px rgba(255, 200, 70, 0.15) inset, 0 0 40px rgba(255, 200, 70, 0.08), 0 20px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="space-y-6">
              {/* Shield Icon */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg"
                  style={{
                    boxShadow: '0 10px 30px rgba(234, 179, 8, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Shield className="w-10 h-10 text-black" />
                </motion.div>
              </div>

              {/* Title */}
              <h2 
                className="font-bold text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
                style={{
                  fontSize: 'clamp(24px, 5vw, 32px)',
                }}
              >
                Verify Humanity
              </h2>

              {/* Description */}
              <p 
                className="text-gray-300 text-center leading-relaxed px-2"
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 18px)',
                  opacity: 0.9,
                }}
              >
                You must verify your humanity to access the application.
              </p>

              {/* Error Message */}
              {verifyError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-center text-sm">
                  {verifyError}
                </div>
              )}

              {/* Verify Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full rounded-[16px] bg-gradient-to-b from-[#f7c948] to-[#d08b26] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                style={{
                  height: '56px',
                  fontSize: 'clamp(16px, 3.5vw, 18px)',
                  letterSpacing: '0.2px',
                  boxShadow: '0 10px 30px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                }}
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
        </section>
      </div>

      {/* "เปิด MiniKit" Button - Only show if NOT in MiniKit environment */}
      {typeof window !== 'undefined' && !(window as any).MiniKit && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          onClick={() => {
            alert('กรุณาเปิดแอปใน World App เพื่อใช้งาน MiniKit');
          }}
          className="fixed z-40 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold text-xs rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          style={{
            right: `max(16px, var(--safe-right))`,
            bottom: `calc(16px + var(--safe-bottom))`,
            boxShadow: '0 4px 12px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)',
            maxWidth: 'calc(100vw - 2rem - var(--safe-left) - var(--safe-right))',
          }}
        >
          <span>เปิด MiniKit</span>
        </motion.button>
      )}
    </div>
  );
}

