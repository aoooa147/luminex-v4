'use client';

import React, { memo } from 'react';
import { UserPlus, Coins, Share2, Copy, Check, QrCode } from 'lucide-react';
import { TOKEN_NAME } from '@/lib/utils/constants';
import { trackReferral } from '@/lib/utils/analytics';
import { TronCard, TronButton, TronStatCard, TronBadge } from '@/components/tron';
import { NetworkVisualization } from './NetworkVisualization';

interface ReferralTabProps {
  safeTotalReferrals: number;
  safeTotalEarnings: number;
  safeReferralCode: string;
  referralCode: string;
  copied: boolean;
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
  setCopied,
  setShowQRModal,
  t,
}: ReferralTabProps) => {
  return (
    <div className="space-y-3 relative">
      {/* Network Background */}
      <div className="absolute inset-0 pointer-events-none -z-10" style={{ height: '200%', top: '-50%' }}>
        <NetworkVisualization totalReferrals={safeTotalReferrals} />
      </div>

      {/* Hero Section */}
      <TronCard glowColor="purple" className="p-8 text-center relative">
        <div className="relative z-10">
          <div className="text-7xl mb-4">
            🎁🎊
          </div>
          <h1 className="text-2xl font-extrabold font-orbitron text-tron-purple mb-2 neon-text">
            EXPANDING THE NETWORK
          </h1>
          <p className="text-gray-300 mb-1.5 text-sm font-orbitron">Get 50 {TOKEN_NAME} for each friend you invite</p>
          <p className="text-tron-purple font-bold text-base font-orbitron neon-text">💰 Earn More Together! 💰</p>
        </div>
      </TronCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        <TronStatCard
          label="Total Referrals"
          value={safeTotalReferrals.toString()}
          icon={UserPlus}
          trend="up"
        />
        <TronStatCard
          label="Total Earnings"
          value={safeTotalEarnings.toString()}
          icon={Coins}
          trend="up"
        />
      </div>

      {/* Referral Code - Chamfered Frame with Glow */}
      <TronCard glowColor="purple" className="p-6 relative">
        <div className="text-center mb-4">
          <Share2 className="w-8 h-8 text-tron-purple mx-auto mb-2" style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.8))' }} />
          <h2 className="text-lg font-orbitron font-bold text-tron-purple uppercase tracking-wider">
            Your Referral Code
          </h2>
        </div>
        
        <div className="relative">
          <div 
            className="bg-bg-tertiary/90 rounded-xl p-6 border-2 border-tron-purple/50 backdrop-blur-lg relative"
            style={{
              clipPath: 'polygon(15px 0%, 100% 0%, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0% 100%, 0% 15px)',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.1)',
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-tron-purple text-xs mb-2 font-orbitron uppercase tracking-wide">Share this code with friends</p>
                <p 
                  className="text-3xl font-extrabold text-white font-mono tracking-wider font-orbitron"
                  style={{
                    textShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
                    letterSpacing: '0.2em',
                  }}
                >
                  {safeReferralCode}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  trackReferral('code_shared', safeReferralCode);
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-tron-purple/50 bg-tron-purple/10 text-tron-purple hover:bg-tron-purple/20 transition-colors font-orbitron text-sm uppercase tracking-wider"
                style={{
                  boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)',
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
                }}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    COPIED
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    COPY CODE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* QR Code Button */}
        <div className="mt-4">
          <button
            onClick={() => setShowQRModal(true)}
            className="w-full py-3 px-4 rounded-lg border-2 border-tron-purple/50 bg-tron-purple/10 text-tron-purple hover:bg-tron-purple/20 transition-colors font-orbitron text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            style={{
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)',
            }}
          >
            <QrCode className="w-5 h-5" />
            {t('showQRCode') || 'Show QR Code'}
          </button>
        </div>
      </TronCard>

      {/* How It Works - Step by Step */}
      <TronCard glowColor="orange" className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Coins className="w-6 h-6 text-tron-orange" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 107, 53, 0.8))' }} />
          <h3 className="text-lg font-orbitron font-bold text-tron-orange uppercase tracking-wider">
            How It Works
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-full bg-tron-orange/20 border-2 border-tron-orange/50 flex items-center justify-center font-orbitron font-bold text-tron-orange text-sm"
              style={{
                boxShadow: '0 0 15px rgba(255, 107, 53, 0.4)',
              }}
            >
              1
            </div>
            <div className="flex-1">
              <p className="text-white font-orbitron font-semibold mb-1">Share Your Code</p>
              <p className="text-gray-400 text-xs font-orbitron">Share your referral code with friends</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-full bg-tron-orange/20 border-2 border-tron-orange/50 flex items-center justify-center font-orbitron font-bold text-tron-orange text-sm"
              style={{
                boxShadow: '0 0 15px rgba(255, 107, 53, 0.4)',
              }}
            >
              2
            </div>
            <div className="flex-1">
              <p className="text-white font-orbitron font-semibold mb-1">Friends Sign Up</p>
              <p className="text-gray-400 text-xs font-orbitron">They join using your code</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-full bg-tron-orange/20 border-2 border-tron-orange/50 flex items-center justify-center font-orbitron font-bold text-tron-orange text-sm"
              style={{
                boxShadow: '0 0 15px rgba(255, 107, 53, 0.4)',
              }}
            >
              3
            </div>
            <div className="flex-1">
              <p className="text-white font-orbitron font-semibold mb-1">Earn Rewards</p>
              <p className="text-gray-400 text-xs font-orbitron">Get 50 {TOKEN_NAME} per referral - Unlimited!</p>
            </div>
          </div>
        </div>
      </TronCard>

      {/* Share Now Button - Large Vivid Orange */}
      <button
        onClick={async () => {
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
            // Silent error handling
          }
        }}
        className="w-full py-4 px-6 rounded-lg border-2 border-tron-orange bg-tron-orange/20 text-tron-orange font-orbitron font-bold text-lg uppercase tracking-wider transition-all duration-200 hover:bg-tron-orange/30 hover:scale-105 active:scale-95"
        style={{
          boxShadow: '0 0 30px rgba(255, 107, 53, 0.5), inset 0 0 20px rgba(255, 107, 53, 0.1)',
          textShadow: '0 0 10px rgba(255, 107, 53, 0.8)',
          transform: 'translateZ(0)',
        }}
      >
        <span className="flex items-center justify-center gap-2">
          <Share2 className="w-6 h-6" />
          SHARE NOW
        </span>
      </button>
    </div>
  );
});

ReferralTab.displayName = 'ReferralTab';

export default ReferralTab;

