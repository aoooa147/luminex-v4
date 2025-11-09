/**
 * Next.js Client Instrumentation File
 * 
 * This file is used to initialize Sentry on the client side.
 * It runs once when the app loads in the browser.
 * 
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */

import * as Sentry from "@sentry/nextjs";

// Only initialize if Sentry DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === 'development',
    
    replaysOnErrorSampleRate: 1.0,
    
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1,
    
    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Filter out certain errors
    beforeSend(event, hint) {
      // Filter out non-error events
      if (event.level !== 'error') {
        return event;
      }
      
      // Filter out errors from browser extensions
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Ignore extension errors
          if (
            error.message?.includes('Extension context invalidated') ||
            error.message?.includes('ResizeObserver loop') ||
            error.stack?.includes('chrome-extension://') ||
            error.stack?.includes('moz-extension://')
          ) {
            return null;
          }
        }
      }
      
      return event;
    },
    
    environment: process.env.NODE_ENV || 'development',
    
    // Set user context
    initialScope: {
      tags: {
        component: 'client',
      },
    },
  });
}

// Instrument router transitions for navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

