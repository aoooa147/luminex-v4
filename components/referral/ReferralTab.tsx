'use client';

import React, { memo } from 'react';
import { UserPlus, Coins, Share2, Copy, Check, QrCode } from 'lucide-react';
import { TOKEN_NAME } from '@/lib/utils/constants';
import { trackReferral } from '@/lib/utils/analytics';
import { TronCard, TronButton, TronStatCard, TronBadge } from '@/components/tron';

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
    <div className="space-y-3">
      {/* Hero Section */}
      <TronCard glowColor="purple" className="p-8 text-center">
        <div className="relative z-10">
          <div className="text-7xl mb-4">
            🎁🎊
          </div>
          <h1 className="text-2xl font-extrabold font-orbitron text-tron-purple mb-2 neon-text">
            Invite Friends!
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

      {/* Referral Code */}
      <TronCard glowColor="purple" title="Your Referral Code" icon={Share2} className="p-4">
        <div className="relative">
          <div className="bg-bg-tertiary/80 rounded-xl p-3 border-2 border-tron-purple/40 backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tron-purple text-xs mb-1 font-orbitron">Share this code with friends</p>
                <p className="text-2xl font-extrabold text-white font-mono tracking-wider font-orbitron">{safeReferralCode}</p>
              </div>
              <TronButton
                variant="success"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(referralCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  // Track referral code copy
                  trackReferral('code_shared', safeReferralCode);
                }}
                className="w-10 h-10 p-0"
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </TronButton>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="mt-4 space-y-2">
          <TronButton
            variant="primary"
            size="sm"
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
                  // Track referral link share
                  trackReferral('code_shared', safeReferralCode);
                } else {
                  await navigator.clipboard.writeText(inviteLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  // Track referral link copy
                  trackReferral('code_shared', safeReferralCode);
                }
              } catch (error) {
                // Error sharing - silent error handling
              }
            }}
            className="w-full"
          >
            <Share2 className="w-5 h-5 inline mr-1.5" />
            {t('shareLink') || 'Share Link'}
          </TronButton>
          <TronButton
            variant="success"
            size="sm"
            onClick={() => setShowQRModal(true)}
            className="w-full"
          >
            <QrCode className="w-5 h-5 inline mr-1.5" />
            {t('showQRCode') || 'Show QR Code'}
          </TronButton>
        </div>
      </TronCard>

      {/* Rewards Info */}
      <TronCard glowColor="orange" icon={Coins} title="How It Works" className="p-3">
        <ul className="space-y-1.5 text-gray-300 text-xs font-orbitron">
          <li className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-tron-cyan flex-shrink-0" style={{ filter: 'drop-shadow(0 0 3px var(--tron-cyan))' }} />
            <span>Share your referral code with friends</span>
          </li>
          <li className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-tron-cyan flex-shrink-0" style={{ filter: 'drop-shadow(0 0 3px var(--tron-cyan))' }} />
            <span>Get 50 {TOKEN_NAME} when they sign up</span>
          </li>
          <li className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-tron-cyan flex-shrink-0" style={{ filter: 'drop-shadow(0 0 3px var(--tron-cyan))' }} />
            <span>Unlimited referrals!</span>
          </li>
        </ul>
      </TronCard>
    </div>
  );
});

ReferralTab.displayName = 'ReferralTab';

export default ReferralTab;

