// Injected content via Sentry wizard below
const { withSentryConfig } = require("@sentry/nextjs");
const path = require('path');

// Bundle analyzer - only enable when ANALYZE env variable is set
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Set outputFileTracingRoot to fix workspace root warning
  outputFileTracingRoot: path.join(__dirname),
  images: { 
    domains: ['i.postimg.cc'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  // Enable compression for better performance
  compress: true,
  // Optimize production builds
  swcMinify: true,
  // Optimize fonts
  optimizeFonts: true,
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // Content Security Policy - adjust based on your needs
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: https: i.postimg.cc",
          "connect-src 'self' https://www.google-analytics.com https://api.world.org https://*.sentry.io",
          "frame-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
          "upgrade-insecure-requests",
        ].join('; '),
      },
      // Strict Transport Security - only in production
      ...(process.env.NODE_ENV === 'production' ? [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
      ] : []),
    ];

    return [
      {
        source: '/:path*',
        headers: [
          ...securityHeaders,
          // Enable compression headers
          { key: 'Accept-Encoding', value: 'gzip, deflate, br' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Optimize bundle size - tree shaking
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }
    
    return config;
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  
  // Suppresses source map uploading logs during build
  silent: true,
  
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Only upload source maps in production
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableClientWebpackPlugin: process.env.NODE_ENV === 'development',
  disableServerWebpackPlugin: process.env.NODE_ENV === 'development',
  
  // Automatically annotate React components to show component data in Sentry
  reactComponentAnnotation: {
    enabled: true,
  },
};

// Apply bundle analyzer first, then Sentry
let config = withBundleAnalyzer(nextConfig);

// Make sure adding Sentry options is the last code to run before exporting
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN 
  ? withSentryConfig(config, sentryWebpackPluginOptions)
  : config;
