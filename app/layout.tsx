import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import BrandStyle from '@/components/BrandStyle';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

// Sentry client initialization is now handled by instrumentation-client.ts
// This is the recommended approach for Next.js 15+

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Luminex Staking - Premium DeFi Platform',
  description: 'Premium DeFi staking platform for World App with up to 500% APY',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-512.png',
  },
  openGraph: {
    title: 'Luminex Staking',
    description: 'Premium DeFi staking platform',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Luminex',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
  userScalable: false,
  themeColor: '#9333ea',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="miniapp-verify-action" content="luminexstaking" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Luminex" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" as="image" href="https://i.postimg.cc/wvJqhSYW/Gemini-Generated-Image-ggu8gdggu8gdggu8-1.png" />
        <link rel="preconnect" href="https://i.postimg.cc" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <GoogleAnalytics />
        <ErrorBoundary>
          <MiniKitProvider>
            <BrandStyle />
            {children}
          </MiniKitProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
