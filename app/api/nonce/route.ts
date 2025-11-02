import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";

// The nonce must be at least 8 alphanumeric characters and created in backend

export async function GET(req: NextRequest) {
  try {
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

    console.log('✅ Generated nonce for wallet authentication');
    
    return NextResponse.json({ nonce });
  } catch (error: any) {
    console.error('❌ Error generating nonce:', error);
    return NextResponse.json(
      {
        error: "Failed to generate nonce",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

