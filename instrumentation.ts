/**
 * Next.js Instrumentation File
 * 
 * This file is used to initialize Sentry and other monitoring tools.
 * It runs once when the server starts.
 * 
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Only run in Node.js environment (server-side)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize Sentry server configuration
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      await import('./sentry.server.config');
    }
  }

  // Only run in Edge environment (edge runtime)
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import and initialize Sentry edge configuration
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      await import('./sentry.edge.config');
    }
  }
}

// Instrument request errors from nested React Server Components
export const onRequestError = Sentry.captureRequestError;

