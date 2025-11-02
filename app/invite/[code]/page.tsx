'use client';

import dynamic from 'next/dynamic';

const InviteContent = dynamic(() => import('./invite-content'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading invite...</p>
      </div>
    </div>
  ),
});

export default function InvitePage() {
  return <InviteContent />;
}
