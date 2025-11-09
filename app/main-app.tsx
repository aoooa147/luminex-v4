'use client';

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';
import { WORLD_APP_ID as ENV_WORLD_APP_ID, WORLD_ACTION as ENV_WORLD_ACTION, LUX_TOKEN_ADDRESS as LUX_TOKEN_ADDRESS_FROM_CONSTANTS, STAKING_CONTRACT_ADDRESS as STAKING_CONTRACT_ADDRESS_FROM_CONSTANTS, WLD_TOKEN_ADDRESS as WLD_TOKEN_ADDRESS_FROM_CONSTANTS, TREASURY_ADDRESS as TREASURY_ADDRESS_FROM_CONSTANTS, POOLS as POOLS_FROM_CONSTANTS, LOGO_URL as LOGO_URL_FROM_CONSTANTS, TOKEN_NAME as TOKEN_NAME_FROM_CONSTANTS } from '@/lib/utils/constants';
import { POWERS, BASE_APY, getPowerByCode, getPowerBoost, type PowerCode } from '@/lib/utils/powerConfig';
import { registerServiceWorker, improveTouchInteractions } from '@/lib/utils/pwa';
import { useWallet } from '@/hooks/useWallet';
import { useStaking } from '@/hooks/useStaking';
import { usePower } from '@/hooks/usePower';
import { useReferral } from '@/hooks/useReferral';
import { useLanguage } from '@/hooks/useLanguage';
import { Toast, useToast } from '@/components/common/Toast';
const MiniKitPanel = dynamic(() => import('@/components/world/MiniKitPanel'), { ssr: false });
import Logo3D from '@/components/ui/Logo3D';
import WorldIDVerification from '@/components/world/WorldIDVerification';
// Lazy load tabs for better performance
const StakingTab = dynamic(() => import('@/components/staking/StakingTab'), { ssr: false });
const MembershipTab = dynamic(() => import('@/components/membership/MembershipTab'), { ssr: false });
const ReferralTab = dynamic(() => import('@/components/referral/ReferralTab'), { ssr: false });
const GameTab = dynamic(() => import('@/components/game/GameTab'), { ssr: false });
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
// Lazy load modals
const StakeModal = dynamic(() => import('@/components/modals/StakeModal'), { ssr: false });
const QRModal = dynamic(() => import('@/components/modals/QRModal'), { ssr: false });

const LOGO_URL = LOGO_URL_FROM_CONSTANTS;
const TOKEN_NAME = TOKEN_NAME_FROM_CONSTANTS;
// Use TREASURY_ADDRESS from constants.ts (can be overridden by NEXT_PUBLIC_TREASURY_ADDRESS env variable)
const TREASURY_ADDRESS = TREASURY_ADDRESS_FROM_CONSTANTS; // Default: 0xdc6c9ac4c8ced68c9d8760c501083cd94dcea4e8
// Admin wallet address - configure this in .env.local as NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || TREASURY_ADDRESS;

// preserved original:
const WORLD_APP_ID /* original: app_0ebc1640de72f393da01afc094665266 */ = (ENV_WORLD_APP_ID || "app_0ebc1640de72f393da01afc094665266");
// preserved original:
const WORLD_ACTION /* original: luminexstaking */ = (ENV_WORLD_ACTION || "luminexstaking");

// Contract addresses - Update these with your deployed contract addresses
const LUX_TOKEN_ADDRESS = LUX_TOKEN_ADDRESS_FROM_CONSTANTS;
const STAKING_CONTRACT_ADDRESS = STAKING_CONTRACT_ADDRESS_FROM_CONSTANTS;
const WLD_TOKEN_ADDRESS = WLD_TOKEN_ADDRESS_FROM_CONSTANTS;

const isWorldApp = () => {
  if (typeof window === 'undefined') return false;
  const hasMiniKit = !!(window as any).MiniKit;
  const ua = (navigator && navigator.userAgent) ? navigator.userAgent : '';
  const looksLikeWorldApp = /WorldApp|MiniApp|WorldAppWebView|WorldAppAndroid|WorldAppIOS/i.test(ua);
  const params = new URLSearchParams(window.location.search);
  const queryOverride = params.has('inapp') || params.get('inapp') === '1';
  const envOverride = (process.env.NEXT_PUBLIC_FORCE_INAPP || '').toString() === 'true';
  return hasMiniKit || looksLikeWorldApp || queryOverride || envOverride;
};

const LuminexApp = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'staking' | 'membership' | 'referral' | 'game'>('staking');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPool, setSelectedPool] = useState(0);
  const [stakeAmount, setStakeAmount] = useState('');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [isShowInput, setIsShowInput] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Use custom hooks
  const walletHook = useWallet(verifiedAddress);
  const { toast, showToast } = useToast();
  const languageHook = useLanguage();
  
  // Extract values from hooks
  const {
    actualAddress,
    provider,
    userInfo,
    setUserInfo,
    balance,
    wldBalance,
    isLoadingBalance,
    formattedBalance,
    formattedWldBalance,
    fetchBalance: walletFetchBalance,
  } = walletHook;
  
  const { language, showLanguageMenu, setShowLanguageMenu, setLanguage: setLanguageHook, t } = languageHook;

  // Use staking hook
  const stakingHook = useStaking(
    actualAddress,
    provider,
    selectedPool,
    (message) => showToast(message, 'success'),
    (message) => showToast(message, 'error')
  );

  const {
    stakedAmount,
    pendingRewards,
    timeElapsed,
    isStaking,
    isClaiming,
    isWithdrawing,
    isClaimingInterest,
    isLoadingStakingData,
    formattedStakedAmount,
    formattedPendingRewards,
    handleStake: handleStakeHook,
    handleClaimRewards,
    handleWithdrawBalance,
    handleClaimInterest,
    fetchStakingData,
  } = stakingHook;

  // Use power hook
  const powerHook = usePower(
    actualAddress,
    (message) => showToast(message, 'success'),
    (message) => showToast(message, 'error'),
    () => walletFetchBalance()
  );

  const {
    currentPower,
    isPurchasingPower,
    isLoadingPowerData,
    handlePurchasePower,
    fetchPowerStatus,
  } = powerHook;

  // Use referral hook
  const referralHook = useReferral(
    actualAddress,
    verified,
    language,
    (message) => showToast(message, 'success')
  );

  const {
    referralCode,
    safeReferralCode,
    safeTotalReferrals,
    safeTotalEarnings,
    copied,
    isLoadingReferralData,
    setCopied,
  } = referralHook;

  // Check if user is admin
  useEffect(() => {
    if (actualAddress) {
      const isAdminUser = actualAddress.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase();
      setIsAdmin(isAdminUser);
    } else {
      setIsAdmin(false);
    }
  }, [actualAddress]);

  // Wrapper for handleStake to handle modal state
  const handleStake = useCallback(async () => {
    if (!stakeAmount) {
      setIsShowInput(true);
      return;
    }
    await handleStakeHook(stakeAmount, selectedPool, balance);
    if (stakeAmount) {
      setShowStakeModal(false);
      setIsShowInput(false);
      setStakeAmount('');
    }
  }, [stakeAmount, selectedPool, balance, handleStakeHook]);

  useEffect(() => {
    // Get verified status and address from sessionStorage
    if (typeof window !== 'undefined') {
      // Register PWA service worker
      registerServiceWorker();
      // Improve mobile touch interactions
      improveTouchInteractions();

      // For World App: load verified status and address
      if (isWorldApp()) {
        const verifiedFromStorage = sessionStorage.getItem('verified');
        if (verifiedFromStorage === 'true') {
          setVerified(true);
        }
        
        const verifiedAddr = sessionStorage.getItem('verifiedAddress');
        if (verifiedAddr) {
          setVerifiedAddress(verifiedAddr);
        }
      }
      
      const userName = sessionStorage.getItem('userName');
      if (userName) {
        setUserInfo({ name: userName, username: userName });
      }
    }
  }, [setUserInfo]);


  // Initial loading screen - show before verification
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const hideLoading = () => {
      // Wait minimum 1.5 seconds for smooth UX
      timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 1500);
    };

    // Check if page is already loaded
    if (document.readyState === 'complete') {
      hideLoading();
    } else {
      // Wait for page to fully load
      window.addEventListener('load', hideLoading, { once: true });
    }
    
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('load', hideLoading);
    };
  }, []);

  // Show loading screen first
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden flex items-center justify-center">
        {/* Elegant gold background particles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/8 rounded-full blur-3xl"
            animate={{ 
              opacity: [0.1, 0.2, 0.1],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-amber-500/6 rounded-full blur-3xl"
            animate={{ 
              opacity: [0.08, 0.15, 0.08],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-yellow-400/5 rounded-full blur-3xl"
            animate={{ 
              opacity: [0.05, 0.12, 0.05],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </div>
        
                  <div className="text-center relative z-10 max-w-md w-full px-4">      
            {/* Large Logo - 3D */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative inline-block mb-8 flex justify-center"
            >
              <Logo3D size={160} interactive={true} />
            </motion.div>
          
          {/* Gold spinner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative w-20 h-20 mx-auto mb-6"
          >
            <div className="absolute inset-0 border-4 border-yellow-600/30 border-t-yellow-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 border-4 border-transparent border-r-yellow-400/40 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
          </motion.div>
          
          {/* Loading text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-yellow-400/90 text-xl font-medium tracking-wide mb-4"
            style={{
              textShadow: '0 0 10px rgba(234, 179, 8, 0.5)'
            }}
          >
            Loading Luminex...
          </motion.p>
          
          {/* Animated dots */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex items-center justify-center gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-yellow-500 rounded-full"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.3, 1],
                  y: [0, -5, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

    // Require World App verification
  if (!verified && isWorldApp()) {
    return (
      <WorldIDVerification 
        onVerify={async () => {
          console.log('🔄 onVerify callback called');
          
          // Read verified address from sessionStorage after verification
          if (typeof window !== 'undefined') {
            const verifiedAddr = sessionStorage.getItem('verifiedAddress') || localStorage.getItem('user_address');
            console.log('📍 Verified address from storage:', verifiedAddr);
            
            if (verifiedAddr) {
              const normalizedAddr = verifiedAddr.toLowerCase();
              setVerifiedAddress(normalizedAddr);
              console.log('✅ Verified address set in state:', normalizedAddr);
            } else {
              console.warn('⚠️ No verified address found in storage');
            }
            
            const userName = sessionStorage.getItem('userName');
            if (userName) {
              setUserInfo({ name: userName, username: userName });
              console.log('✅ User name set:', userName);
            }
          }
          
          // Set verified state
          setVerified(true);
          console.log('✅ Verified status set to true');
          
          // Force wallet connection after verification
          // Wait a bit for state to update, then connect wallet
          setTimeout(async () => {
            console.log('🔌 Attempting to connect wallet after verification...');
            try {
              // Check if walletHook has connectWallet
              if (walletHook && walletHook.connectWallet) {
                await walletHook.connectWallet();
                console.log('✅ Wallet connected successfully after verification');
              } else {
                console.warn('⚠️ connectWallet function not available in walletHook');
              }
            } catch (err: any) {
              console.error('❌ Failed to connect wallet after verification:', err);
            }
          }, 300);
        }}
      />
    );
  }

  // Only World App is supported
  if (!verified && !isWorldApp()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-yellow-400 mb-4">World App Required</h1>
          <p className="text-gray-300 mb-6">
            This application only works in World App. Please open this app in World App to continue.
          </p>
        </div>
      </div>
    );
  }

  const currentPool = POOLS_FROM_CONSTANTS[selectedPool];
  const baseApy = BASE_APY; // Base APY is now 50% (from powerConfig)
  const powerBoost = currentPower ? getPowerBoost(getPowerByCode(currentPower.code) || null) : 0;
  const totalApy = currentPower ? currentPower.totalAPY : baseApy;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-y-auto">
      {/* Luxurious gold geometric background pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{ 
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(234, 179, 8, 0.08) 35px, rgba(234, 179, 8, 0.08) 70px),
                          repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(217, 119, 6, 0.08) 35px, rgba(217, 119, 6, 0.08) 70px)`,
        transform: 'translateZ(0)'
      }}></div>
      
      {/* Elegant gold animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/8 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.06, 0.12, 0.06],
            scale: [1, 1.1, 1],
            x: [0, 20, 0],
            y: [0, 15, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-amber-500/6 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.05, 0.1, 0.05],
            scale: [1, 1.15, 1],
            x: [0, -25, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-yellow-400/5 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.03, 0.08, 0.03],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
      </div>

      {/* Header */}
      <AppHeader
        actualAddress={actualAddress}
        userInfo={userInfo}
        formattedBalance={formattedBalance}
        formattedWldBalance={formattedWldBalance}
        isLoadingBalance={isLoadingBalance}
        language={language}
        showLanguageMenu={showLanguageMenu}
        setShowLanguageMenu={setShowLanguageMenu}
        setLanguage={setLanguageHook}
        t={t}
      />

      {/* Main Content */}
      <div 
        className="relative max-w-md mx-auto px-4 py-2 pb-20 overflow-y-auto"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'staking' && (
            <StakingTab
              selectedPool={selectedPool}
              setSelectedPool={setSelectedPool}
              currentPower={currentPower}
              totalApy={totalApy}
              baseApy={baseApy}
              powerBoost={powerBoost}
              actualAddress={actualAddress}
              STAKING_CONTRACT_ADDRESS={STAKING_CONTRACT_ADDRESS}
              formattedStakedAmount={formattedStakedAmount}
              formattedPendingRewards={formattedPendingRewards}
              timeElapsed={timeElapsed}
              setShowStakeModal={setShowStakeModal}
              handleClaimInterest={handleClaimInterest}
              handleWithdrawBalance={handleWithdrawBalance}
              setActiveTab={setActiveTab}
              isClaimingInterest={isClaimingInterest}
              isWithdrawing={isWithdrawing}
              pendingRewards={pendingRewards}
              stakedAmount={stakedAmount}
              isLoadingStakingData={isLoadingStakingData}
              t={t}
            />
          )}
          
          {activeTab === 'membership' && (
            <MembershipTab
              currentPower={currentPower}
              totalApy={totalApy}
              isPurchasingPower={isPurchasingPower}
              isLoadingPowerData={isLoadingPowerData}
              handlePurchasePower={handlePurchasePower}
            />
          )}
          
          {activeTab === 'referral' && (
            <ReferralTab
              safeTotalReferrals={safeTotalReferrals}
              safeTotalEarnings={safeTotalEarnings}
              safeReferralCode={safeReferralCode}
              referralCode={referralCode}
              copied={copied}
              isLoadingReferralData={isLoadingReferralData}
              setCopied={setCopied}
              setShowQRModal={setShowQRModal}
              t={t}
            />
          )}

          {activeTab === 'game' && (
            <GameTab />
          )}
        </AnimatePresence>
            </div>

      {/* Stake Modal */}
      <StakeModal
        showStakeModal={showStakeModal}
        setShowStakeModal={setShowStakeModal}
        isShowInput={isShowInput}
        setIsShowInput={setIsShowInput}
        stakeAmount={stakeAmount}
        setStakeAmount={setStakeAmount}
        balance={balance}
        isStaking={isStaking}
        handleStake={handleStake}
      />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
      />

      {/* Toast Notification */}
      <Toast toast={toast} />

      {/* QR Code Modal */}
      <QRModal
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        safeReferralCode={safeReferralCode}
        showToast={showToast}
      />

      {/* Spacer for bottom nav */}
      <div className="h-16"></div>
    </div>
  );
};

export default LuminexApp;

// --- MiniKitPanel bootstrap (non-destructive) ---
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const id = '__minikit_panel__';
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
      }
      // use React 18 root
      const { createRoot } = await import('react-dom/client');
      // @ts-ignore
      const root = el.__root || createRoot(el);
      // @ts-ignore
      el.__root = root;
      root.render(<MiniKitPanel />);
    } catch (e) {
      // MiniKitPanel bootstrap error - silent error handling
    }
  })();
}