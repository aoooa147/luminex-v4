import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Admin wallet address
const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || process.env.TREASURY_ADDRESS || '';

/**
 * Check if user is admin
 */
function isAdmin(userId: string | null): boolean {
  if (!userId || !ADMIN_WALLET_ADDRESS) return false;
  return userId.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase();
}

/**
 * Middleware to check maintenance mode
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes (they handle maintenance mode themselves)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check system status (with fallback to operational)
  try {
    const systemStatusResponse = await fetch(
      `${request.nextUrl.origin}/api/system/status`,
      {
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );

    if (systemStatusResponse.ok) {
      const status = await systemStatusResponse.json();
      
      // If maintenance mode is enabled
      if (status.data?.maintenanceMode) {
        const userId = request.headers.get('x-user-id') || 
                       request.cookies.get('user_address')?.value ||
                       null;

        // Allow admin to access
        if (isAdmin(userId)) {
          return NextResponse.next();
        }

        // Redirect non-admin users to maintenance page
        if (pathname !== '/maintenance') {
          const url = request.nextUrl.clone();
          url.pathname = '/maintenance';
          return NextResponse.redirect(url);
        }
      }
    }
  } catch (error) {
    // On error, allow access (fail open)
    console.warn('[middleware] Failed to check system status:', error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
