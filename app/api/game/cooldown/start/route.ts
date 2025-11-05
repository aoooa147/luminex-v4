import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/game/storage';

export const runtime = 'nodejs';

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

    // Set current time as last play time for ALL games
    cooldowns[addressLower] = Date.now();
    writeJSON('game_cooldowns_global', cooldowns);

    return NextResponse.json({
      ok: true,
      message: 'Global cooldown started - all games locked for 24 hours',
      lastPlayTime: cooldowns[addressLower],
      gameId: 'all' // Indicate all games are locked
    });
  } catch (e: any) {
    console.error('[cooldown/start] Error:', e?.message);
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Failed to start cooldown'
    }, { status: 500 });
  }
}
