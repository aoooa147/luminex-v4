import './globals.css';
import type { Metadata } from 'next';
import { Inter, Prompt } from 'next/font/google';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import BrandStyle from '@/components/BrandStyle';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

// Initialize Sentry on the client side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  require('../sentry.client.config');
}

// Luminex Power App fonts - Clean, modern
const inter = Inter({ 
  subsets: ['latin', 'thai'],
  variable: '--font-inter',
  display: 'swap',
});

const prompt = Prompt({ 
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-prompt',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Luminex Staking - Premium DeFi Platform',
  description: 'Premium DeFi staking platform for World App with up to 500% APY',
  manifest: '/manifest.json',
  themeColor: '#9333ea',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
    userScalable: false, // Better for mobile app experience
  },
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
        {/* Tron fonts are loaded via next/font/google */}
      </head>
      <body className={`${inter.variable} ${prompt.variable} font-sans`} suppressHydrationWarning>
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
