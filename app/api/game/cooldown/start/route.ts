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
    
    const cooldowns = readJSON<Record<string, Record<string, number>>>('game_cooldowns', {});
    const addressLower = address.toLowerCase();
    
    if (!cooldowns[addressLower]) {
      cooldowns[addressLower] = {};
    }
    
    // Set current time as last play time
    cooldowns[addressLower][gameId] = Date.now();
    writeJSON('game_cooldowns', cooldowns);
    
    return NextResponse.json({
      ok: true,
      message: 'Cooldown started',
      lastPlayTime: cooldowns[addressLower][gameId]
    });
  } catch (e: any) {
    console.error('[cooldown/start] Error:', e?.message);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Failed to start cooldown' 
    }, { status: 500 });
  }
}
