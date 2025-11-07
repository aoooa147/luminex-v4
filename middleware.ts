import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "img-src 'self' data: blob: https:; " +
    "style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "connect-src 'self' https://developer.worldcoin.org https://*.optimism.io https://*.alchemy.com https://worldchain-mainnet.g.alchemy.com wss://*.optimism.io wss://*.alchemy.com; " +
    "frame-src 'self' https://verify.worldcoin.org;"
  )
  
  // Additional security headers
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
