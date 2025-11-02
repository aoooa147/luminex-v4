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
      window.location.href = '/';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-pink-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
        <p className="text-white text-lg">Redirecting to Luminex Staking...</p>
        <p className="text-gray-400 text-sm mt-2">Processing referral code...</p>
      </div>
    </div>
  );
}

