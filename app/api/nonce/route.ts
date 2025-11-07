import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

// The nonce must be at least 8 alphanumeric characters and created in backend

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Expects only alphanumeric characters
  const nonce = crypto.randomUUID().replace(/-/g, "");

  // The nonce should be stored somewhere that is not tamperable by the client
  // Optionally you can HMAC the nonce with a secret key stored in your environment
  const cookieStore = await cookies();
  cookieStore.set("siwe", nonce, {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 300, // 5 minutes expiry
  });

  logger.debug('Nonce generated for wallet authentication', { nonce }, 'nonce');
  
  return NextResponse.json({ nonce });
}, 'nonce');

