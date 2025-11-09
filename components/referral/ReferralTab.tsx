'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Coins, Share2, Copy, Check, QrCode } from 'lucide-react';
import { TOKEN_NAME } from '@/lib/utils/constants';
import { trackReferral } from '@/lib/utils/analytics';
import { LoadingSkeleton } from '@/components/common/LoadingStates';
import { EmptyReferralsState } from '@/components/common/EmptyStates';

interface ReferralTabProps {
  safeTotalReferrals: number;
  safeTotalEarnings: number;
  safeReferralCode: string;
  referralCode: string;
  copied: boolean;
  isLoadingReferralData?: boolean;
  setCopied: (copied: boolean) => void;
  setShowQRModal: (show: boolean) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ReferralTab = memo(({
  safeTotalReferrals,
  safeTotalEarnings,
  safeReferralCode,
  referralCode,
  copied,
  isLoadingReferralData = false,
  setCopied,
  setShowQRModal,
  t,
}: ReferralTabProps) => {
  // Memoize event handlers to prevent unnecessary re-renders
  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackReferral('code_shared', safeReferralCode);
  }, [referralCode, safeReferralCode, setCopied]);

  const handleShareLink = useCallback(async () => {
    try {
      const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || '';
      const inviteLink = `https://world.org/mini-app?app_id=${WORLD_APP_ID}&path=${encodeURIComponent(`/?ref=${safeReferralCode}`)}`;
      if (navigator.share) {
        await navigator.share({
          title: 'Join Luminex Staking!',
          text: `Use my referral code ${safeReferralCode} and get 50 LUX!`,
          url: inviteLink,
        });
        trackReferral('code_shared', safeReferralCode);
      } else {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        trackReferral('code_shared', safeReferralCode);
      }
    } catch (error) {
      // Error sharing - silent error handling
    }
  }, [safeReferralCode, setCopied]);

  const handleShowQR = useCallback(() => {
    setShowQRModal(true);
  }, [setShowQRModal]);

  // Memoize computed values
  const shareLinkText = useMemo(() => t('shareLink') || 'Share Link', [t]);
  const showQRText = useMemo(() => t('showQRCode') || 'Show QR Code', [t]);
  return (
    <motion.div
      key="referral"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-3"
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Hero Section */}
      <div 
        className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl p-8 text-center overflow-hidden border-2 border-yellow-600/30" 
        style={{
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.1), inset 0 1px 0 rgba(234, 179, 8, 0.1)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-transparent animate-pulse"></div>
        <div className="relative z-10">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="text-7xl mb-4"
            aria-hidden="true"
          >
            🎁🎊
          </motion.div>
          <h1 className="text-2xl font-extrabold text-white mb-2">
            Invite Friends!
          </h1>
          <p className="text-white/90 mb-1.5 text-sm">Get 50 {TOKEN_NAME} for each friend you invite</p>
          <p className="text-yellow-300 font-bold text-base">💰 Earn More Together! 💰</p>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoadingReferralData ? (
        <div className="grid grid-cols-2 gap-2" role="region" aria-label="Referral statistics">
          <LoadingSkeleton className="h-20 w-full" count={1} />
          <LoadingSkeleton className="h-20 w-full" count={1} />
        </div>
      ) : safeTotalReferrals === 0 && safeTotalEarnings === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl p-6 border border-yellow-600/20"
        >
          <EmptyReferralsState />
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-2" role="region" aria-label="Referral statistics">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl p-3 text-black font-bold"
            style={{
              boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)',
              willChange: 'transform'
            }}
            role="status"
            aria-label={`Total referrals: ${safeTotalReferrals}`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <UserPlus className="w-5 h-5" aria-hidden="true" />
              <div>
                <p className="text-white/80 text-xs">Total Referrals</p>
                <p className="text-xl font-extrabold">{safeTotalReferrals}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-3 text-white"
            style={{ willChange: 'transform' }}
            role="status"
            aria-label={`Total earnings: ${safeTotalEarnings} ${TOKEN_NAME}`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <Coins className="w-5 h-5" aria-hidden="true" />
              <div>
                <p className="text-white/80 text-xs">Total Earnings</p>
                <p className="text-xl font-extrabold">{safeTotalEarnings}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Referral Code */}
      <div className="bg-black/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/10 shadow-2xl">
        <h2 className="text-white font-bold text-base mb-2 flex items-center gap-2">
          <Share2 className="w-5 h-5" aria-hidden="true" />
          Your Referral Code
        </h2>
        
        <div className="relative">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-3 border-2 border-yellow-500/40"
            style={{ willChange: 'transform' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-xs mb-1">Share this code with friends</p>
                <p className="text-2xl font-extrabold text-white font-mono tracking-wider" aria-label={`Referral code: ${safeReferralCode}`}>{safeReferralCode}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCopyCode}
                aria-label={copied ? 'Referral code copied' : 'Copy referral code'}
                className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center"
                style={{
                  boxShadow: '0 0 15px rgba(234, 179, 8, 0.4)',
                  willChange: 'transform'
                }}
              >
                {copied ? (
                  <Check className="w-5 h-5 text-white" aria-hidden="true" />
                ) : (
                  <Copy className="w-5 h-5 text-white" aria-hidden="true" />
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Share Buttons */}
        <div className="mt-4 space-y-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShareLink}
            aria-label="Share referral link"
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/30 text-sm"
          >
            <Share2 className="w-5 h-5" aria-hidden="true" />
            <span>{shareLinkText}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShowQR}
            aria-label="Show QR code for referral"
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center space-x-2 text-sm"
            style={{
              boxShadow: '0 4px 20px rgba(234, 179, 8, 0.4)'
            }}
          >
            <QrCode className="w-5 h-5" aria-hidden="true" />
            <span>{showQRText}</span>
          </motion.button>
        </div>
      </div>

      {/* Rewards Info */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-3 border border-yellow-400/30">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-yellow-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5 text-yellow-300" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base mb-1.5">How It Works</h3>
            <ul className="space-y-1.5 text-white/80 text-xs" role="list">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" aria-hidden="true" />
                <span>Share your referral code with friends</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" aria-hidden="true" />
                <span>Get 50 {TOKEN_NAME} when they sign up</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" aria-hidden="true" />
                <span>Unlimited referrals!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ReferralTab.displayName = 'ReferralTab';

export default ReferralTab;
