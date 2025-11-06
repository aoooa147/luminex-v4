// Invite Page - Handle referral links
// According to https://docs.world.org/mini-apps/growth/invites-viral
// Universal-link format: https://world.org/mini-app?app_id={app_id}&path={path}

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Loader2 } from 'lucide-react';
import { WORLD_APP_ID } from '@/lib/utils/constants';

export default function InvitePage() {
  const router = useRouter();
  const { ref, code } = router.query;

  useEffect(() => {
    // Get referral code from URL params
    const referralCode = (ref as string) || (code as string);
    
    if (!referralCode) {
      // No referral code, redirect to main app
      window.location.assign('/');
      return;
    }

    // Store referral code in localStorage for processing after wallet connection
    if (typeof window !== 'undefined') {
      localStorage.setItem('luminex_referral_code', referralCode);
      console.log('✅ Referral code stored:', referralCode);
    }

    // Redirect to mini app with referral code
    // Use the same path format but with referral parameter
    const miniAppUrl = `https://world.org/mini-app?app_id=${WORLD_APP_ID}&path=${encodeURIComponent(`/?ref=${referralCode}`)}`;
    
    // Try to redirect to World App first (deep link)
    const deepLink = `worldapp://mini-app?app_id=${WORLD_APP_ID}&path=${encodeURIComponent(`/?ref=${referralCode}`)}`;
    
    // Attempt deep link first, fallback to universal link
    const timeout = setTimeout(() => {
      console.log('Redirecting to mini app via universal link...');
      window.location.href = miniAppUrl;
    }, 1000);

    // Try deep link (may fail if World App not installed, will fall through to universal link)
    window.location.href = deepLink;

    return () => {
      clearTimeout(timeout);
    };
  }, [ref, code, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden flex items-center justify-center">
      {/* Elegant gold background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-amber-500/6 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="text-center relative z-10">
        <Loader2 className="w-12 h-12 animate-spin text-yellow-500 mx-auto mb-4" style={{ filter: 'drop-shadow(0 0 10px rgba(234, 179, 8, 0.5))' }} />
        <p className="text-yellow-400/90 text-lg font-medium tracking-wide">Redirecting to Luminex Staking...</p>
        <p className="text-gray-400 text-sm mt-2">Processing referral code...</p>
        <div className="flex items-center justify-center gap-1 mt-3">
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

