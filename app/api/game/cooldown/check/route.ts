import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/game/storage';

export const runtime = 'nodejs';

const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { address, gameId } = await request.json();

    if (!address || !gameId) {
      return NextResponse.json({
        ok: false,
        error: 'Missing address or gameId'
      }, { status: 400 });
    }

    // Global cooldown: playing ANY game locks ALL games for 24 hours
    const cooldowns = readJSON<Record<string, number>>('game_cooldowns_global', {});
    const addressLower = address.toLowerCase();

    // Get the last time this user played ANY game
    const lastPlayTime = cooldowns[addressLower] || 0;
    const now = Date.now();
    const timeSinceLastPlay = now - lastPlayTime;
    const isOnCooldown = timeSinceLastPlay < COOLDOWN_MS;
    const remainingMs = Math.max(0, COOLDOWN_MS - timeSinceLastPlay);
    const remainingHours = remainingMs / (60 * 60 * 1000);
    const remainingMinutes = (remainingMs % (60 * 60 * 1000)) / (60 * 1000);

    return NextResponse.json({
      ok: true,
      isOnCooldown,
      lastPlayTime,
      remainingMs,
      remainingHours: Math.floor(remainingHours),
      remainingMinutes: Math.floor(remainingMinutes),
      canPlay: !isOnCooldown,
      lastPlayedGame: 'any' // Indicate this is a global cooldown
    });
  } catch (e: any) {
    console.error('[cooldown/check] Error:', e?.message);
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Failed to check cooldown'
    }, { status: 500 });
  }
}
