/**
 * Global Error Handler
 * 
 * This file handles React rendering errors globally.
 * It's required for Sentry to capture React errors.
 * 
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
 */

'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-white mb-4">Something went wrong!</h1>
            <p className="text-gray-400 mb-2">{error.message || 'An unexpected error occurred'}</p>
            {error.digest && (
              <p className="text-xs text-gray-500 mb-8">Error ID: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

