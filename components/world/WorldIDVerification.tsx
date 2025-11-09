'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';
import Logo3D from '@/components/ui/Logo3D';

interface WorldIDVerificationProps {
  onVerify: () => void;
}

export default function WorldIDVerification({ onVerify }: WorldIDVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const minikitProbeRef = useRef<HTMLDivElement>(null);
  
  // Check if running in MiniKit environment
  const isMiniKit = typeof window !== 'undefined' && !!(window as any).MiniKit;

  // Dynamic MiniKit gap measurement using ResizeObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Set initial value
    document.documentElement.style.setProperty('--minikit-gap', '84px');

    // Only measure if NOT in MiniKit environment (button is visible)
    if (isMiniKit) {
      document.documentElement.style.setProperty('--minikit-gap', '0px');
      return;
    }

    const ro = new ResizeObserver(() => {
      const vh = window.innerHeight;
      const r = document.documentElement.getBoundingClientRect();
      const used = Math.max(0, (r.bottom - vh)); // ส่วนที่เกิน
      const gap = Math.max(72, Math.min(128, Math.round(used + 12))); // clamp ค่า
      document.documentElement.style.setProperty('--minikit-gap', gap + 'px');
    });

    ro.observe(document.documentElement);

    return () => {
      ro.disconnect();
    };
  }, [isMiniKit]);

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
          
          // DEBUG: Log entire result object to see all available fields
          console.log('🔍 MiniKit walletAuth result (full):', JSON.stringify(result, null, 2));
          console.log('🔍 MiniKit walletAuth result.finalPayload:', JSON.stringify(result.finalPayload, null, 2));
          
          // Check all possible fields in result
          if (result) {
            console.log('🔍 result keys:', Object.keys(result));
            if (result.user) console.log('🔍 result.user:', JSON.stringify(result.user, null, 2));
            if (result.profile) console.log('🔍 result.profile:', JSON.stringify(result.profile, null, 2));
            if (result.username) console.log('🔍 result.username:', result.username);
            if (result.name) console.log('🔍 result.name:', result.name);
          }
          
          // Check MiniKit object itself
          console.log('🔍 MiniKit object keys:', Object.keys(MiniKit));
          if (MiniKit.user) {
            console.log('🔍 MiniKit.user:', JSON.stringify(MiniKit.user, null, 2));
          }
          if (MiniKit.getUser) {
            console.log('🔍 MiniKit.getUser available');
          }
          if (MiniKit.getUserInfo) {
            console.log('🔍 MiniKit.getUserInfo available');
          }
          
          const walletData = result.finalPayload;

          const res = await fetch('/api/complete-siwe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: walletData })
          });

          const data = await res.json();

          if (data.status === 'ok' && data.isValid) {
            if (typeof window !== 'undefined') {
              // Set verified status
              sessionStorage.setItem('verified', 'true');
              
              // Set wallet address
              if (walletData.address) {
                const address = walletData.address.toLowerCase();
                sessionStorage.setItem('verifiedAddress', address);
                // Also store in localStorage for persistence
                localStorage.setItem('user_address', address);
                console.log('✅ Wallet address saved:', address);
                
                // Try to get username from multiple sources (priority order)
                let foundUsername: string | null = null;
                
                // Method 1: Check result object itself (not just finalPayload)
                if (result && typeof result === 'object') {
                  if ((result as any).username) {
                    foundUsername = (result as any).username;
                    console.log('✅ Username from result.username:', foundUsername);
                  } else if ((result as any).name) {
                    foundUsername = (result as any).name;
                    console.log('✅ Username from result.name:', foundUsername);
                  } else if ((result as any).user?.username) {
                    foundUsername = (result as any).user.username;
                    console.log('✅ Username from result.user.username:', foundUsername);
                  } else if ((result as any).profile?.username) {
                    foundUsername = (result as any).profile.username;
                    console.log('✅ Username from result.profile.username:', foundUsername);
                  }
                }
                
                // Method 2: Check walletData from MiniKit walletAuth (check all possible fields)
                if (!foundUsername && walletData) {
                  const walletDataAny = walletData as any;
                  if (walletDataAny.name) {
                    foundUsername = walletDataAny.name;
                    console.log('✅ Username from walletData.name:', foundUsername);
                  } else if (walletDataAny.username) {
                    foundUsername = walletDataAny.username;
                    console.log('✅ Username from walletData.username:', foundUsername);
                  } else if (walletDataAny.user?.username) {
                    foundUsername = walletDataAny.user.username;
                    console.log('✅ Username from walletData.user.username:', foundUsername);
                  } else if (walletDataAny.profile?.username) {
                    foundUsername = walletDataAny.profile.username;
                    console.log('✅ Username from walletData.profile.username:', foundUsername);
                  } else if (walletDataAny.userName) {
                    foundUsername = walletDataAny.userName;
                    console.log('✅ Username from walletData.userName:', foundUsername);
                  } else if (walletDataAny.displayName) {
                    foundUsername = walletDataAny.displayName;
                    console.log('✅ Username from walletData.displayName:', foundUsername);
                  }
                }
                
                // Method 3: Check MiniKit.user (if available)
                if (!foundUsername && (window as any).MiniKit?.user) {
                  const miniKitUser = (window as any).MiniKit.user;
                  if (miniKitUser.username) {
                    foundUsername = miniKitUser.username;
                    console.log('✅ Username from MiniKit.user.username:', foundUsername);
                  } else if (miniKitUser.name) {
                    foundUsername = miniKitUser.name;
                    console.log('✅ Username from MiniKit.user.name:', foundUsername);
                  } else if (miniKitUser.displayName) {
                    foundUsername = miniKitUser.displayName;
                    console.log('✅ Username from MiniKit.user.displayName:', foundUsername);
                  }
                }
                
                // Method 4: Try MiniKit.getUserByAddress (if available)
                if (!foundUsername && (window as any).MiniKit?.getUserByAddress) {
                  try {
                    const userData = await (window as any).MiniKit.getUserByAddress(address);
                    console.log('🔍 getUserByAddress result:', JSON.stringify(userData, null, 2));
                    if (userData?.username) {
                      foundUsername = userData.username;
                      console.log('✅ Username from getUserByAddress:', foundUsername);
                    } else if (userData?.name) {
                      foundUsername = userData.name;
                      console.log('✅ Username from getUserByAddress.name:', foundUsername);
                    }
                  } catch (e) {
                    console.warn('⚠️ getUserByAddress error:', e);
                  }
                }
                
                // Method 5: Try MiniKit.getUser (if available)
                if (!foundUsername && (window as any).MiniKit?.getUser) {
                  try {
                    const userData = await (window as any).MiniKit.getUser();
                    console.log('🔍 getUser result:', JSON.stringify(userData, null, 2));
                    if (userData?.username) {
                      foundUsername = userData.username;
                      console.log('✅ Username from getUser:', foundUsername);
                    }
                  } catch (e) {
                    console.warn('⚠️ getUser error:', e);
                  }
                }
                
                // Method 6: Try MiniKit.getUserInfo (if available)
                if (!foundUsername && (window as any).MiniKit?.getUserInfo) {
                  try {
                    const userInfo = await (window as any).MiniKit.getUserInfo();
                    console.log('🔍 getUserInfo result:', JSON.stringify(userInfo, null, 2));
                    if (userInfo?.username) {
                      foundUsername = userInfo.username;
                      console.log('✅ Username from getUserInfo:', foundUsername);
                    }
                  } catch (e) {
                    console.warn('⚠️ getUserInfo error:', e);
                  }
                }
                
                // Method 7: Fetch from our API (which will check database first, then World App APIs)
                if (!foundUsername) {
                  try {
                    const profileResponse = await fetch(`/api/world/user-profile?address=${address}`);
                    if (profileResponse.ok) {
                      const profileData = await profileResponse.json();
                      console.log('🔍 API user-profile response:', JSON.stringify(profileData, null, 2));
                      if (profileData?.success && profileData?.data?.username) {
                        foundUsername = profileData.data.username;
                        console.log('✅ Username from API:', foundUsername);
                      }
                    }
                  } catch (e) {
                    console.warn('⚠️ API user-profile error:', e);
                  }
                }
                
                // Store username if found - save to database AND localStorage
                if (foundUsername) {
                  sessionStorage.setItem('userName', foundUsername);
                  localStorage.setItem('userName', foundUsername);
                  console.log('✅ Username saved to storage:', foundUsername);
                  
                  // Save to database via API
                  try {
                    const saveResponse = await fetch('/api/world/username/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        address: address, 
                        username: foundUsername,
                        source: 'minikit',
                      })
                    });
                    if (saveResponse.ok) {
                      const saveData = await saveResponse.json();
                      if (saveData?.success) {
                        console.log('✅ Username saved to database:', foundUsername);
                      }
                    }
                  } catch (e) {
                    console.warn('⚠️ Failed to save username to database:', e);
                  }
                } else {
                  console.warn('⚠️ No username found from any source');
                  // Check server storage for stored username (fallback)
                  try {
                    const getResponse = await fetch(`/api/world/username/get?address=${address}`);
                    if (getResponse.ok) {
                      const getData = await getResponse.json();
                      if (getData?.success && getData?.username && typeof getData.username === 'string') {
                        const retrievedUsername = getData.username.trim();
                        if (retrievedUsername) {
                          foundUsername = retrievedUsername;
                          sessionStorage.setItem('userName', foundUsername);
                          localStorage.setItem('userName', foundUsername);
                          console.log('✅ Username retrieved from server storage (fallback):', foundUsername);
                        }
                      }
                    }
                  } catch (e) {
                    console.warn('⚠️ Failed to load username from database:', e);
                  }
                }
              }
              
              if (data.siweMessageData?.chain_id) {
                sessionStorage.setItem('chainId', String(data.siweMessageData.chain_id));
              }
              
              console.log('✅ Verification successful, calling onVerify callback');
            }
            
            // Call onVerify callback immediately
            // The callback should read from sessionStorage
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
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'calc(24px + var(--safe-bottom) + var(--minikit-gap))',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
        overflowY: 'hidden',
      }}
    >
      {/* MiniKit probe element for measurement */}
      {!isMiniKit && (
        <div 
          ref={minikitProbeRef}
          id="minikit-probe" 
          style={{
            position: 'fixed',
            right: '16px',
            bottom: 0,
            width: '1px',
            height: '1px',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Main Content - Full Screen Layout - Centered */}
      <div 
        className="flex flex-col items-center justify-center flex-1 overflow-y-auto"
        style={{
          padding: 'clamp(20px, 5vw, 40px)',
          justifyContent: 'center',
          alignItems: 'center',
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

        {/* Hero Section - Centered Layout */}
        <section className="w-full max-w-lg flex flex-col items-center justify-center gap-2 mx-auto">
          {/* Logo Section - Centered with Grid + Aspect Ratio */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center space-y-2 w-full"
          >
            <div 
              className="mx-auto mb-2 grid place-items-center"
              style={{
                maxWidth: '520px',
                width: 'min(92vw, 520px)',
                aspectRatio: '4 / 3',
              }}
            >
              <Logo3D size={160} interactive={true} />
            </div>
            <div className="text-center space-y-1 w-full">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="font-black bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 bg-clip-text text-transparent text-center w-full"
                style={{
                  fontSize: 'clamp(32px, 6vw, 48px)',
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
                  fontSize: 'clamp(12px, 2.8vw, 16px)',
                  letterSpacing: '0.3em',
                }}
              >
                STAKING PLATFORM
              </motion.p>
            </div>
          </motion.div>

          {/* Verification Card - Centered */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative rounded-[24px] bg-black/60 backdrop-blur-xl border border-yellow-600/30 w-full max-w-md mx-auto"
            style={{
              padding: 'clamp(24px, 6vw, 36px)',
              background: 'radial-gradient(120% 120% at 0% 0%, rgba(26, 18, 8, 0.8) 0%, rgba(11, 14, 20, 0.6) 60%)',
              boxShadow: '0 0 30px rgba(255, 200, 70, 0.15) inset, 0 0 40px rgba(255, 200, 70, 0.08), 0 20px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="space-y-5 flex flex-col items-center">
              {/* Shield Icon - Centered */}
              <div className="flex justify-center w-full">
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

              {/* Title - Centered */}
              <h2 
                className="font-bold text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent w-full"
                style={{
                  fontSize: 'clamp(24px, 5vw, 32px)',
                }}
              >
                Verify Humanity
              </h2>

              {/* Description - Centered */}
              <p 
                className="text-gray-300 text-center leading-relaxed px-2 w-full"
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 18px)',
                  opacity: 0.9,
                }}
              >
                You must verify your humanity to access the application.
              </p>

              {/* Error Message - Centered */}
              {verifyError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-center text-sm w-full">
                  {verifyError}
                </div>
              )}

              {/* Action Buttons - Side by Side */}
              <div className="w-full flex flex-col sm:flex-row gap-3">
                {/* Verify Button - Responsive with min() + clamp() */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="flex-1 bg-gradient-to-b from-[#f7c948] to-[#d08b26] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  style={{
                    width: 'min(100%, 560px)',
                    height: 'clamp(56px, 8vw, 72px)',
                    borderRadius: '16px',
                    fontSize: 'clamp(16px, 4vw, 20px)',
                    letterSpacing: '0.2px',
                    boxShadow: '0 10px 30px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-6 h-6" />
                      <span>Verify</span>
                    </>
                  )}
                </motion.button>

                {/* "เปิด MiniKit" Button - Only show if NOT in MiniKit environment */}
                {typeof window !== 'undefined' && !(window as any).MiniKit && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      alert('กรุณาเปิดแอปใน World App เพื่อใช้งาน MiniKit');
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                    style={{
                      width: 'min(100%, 560px)',
                      height: 'clamp(48px, 6.2vw, 56px)',
                      borderRadius: '14px',
                      fontSize: 'clamp(14px, 3.8vw, 16px)',
                      letterSpacing: '0.2px',
                      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    <span>เปิด MiniKit</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

