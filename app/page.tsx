'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const LOGO_URL = "https://i.postimg.cc/wvJqhSYW/Gemini-Generated-Image-ggu8gdggu8gdggu8-1.png";

// Simple minimal loading - main loading is handled in main-app.tsx
const LuminexApp = dynamic(() => import('./main-app'), {
  ssr: false,
  loading: () => null, // No loading here, let main-app handle it
});

export default function HomePage() {
  // Preload logo on mount
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = LOGO_URL;
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return <LuminexApp />;
}
