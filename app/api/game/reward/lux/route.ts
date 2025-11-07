import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/game/storage';
import { LUX_TOKEN_ADDRESS } from '@/lib/utils/constants';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * Calculate LUX reward based on score
 * Distribution:
 * - 0 LUX: 40% chance (score < 1000)
 * - 1 LUX: 30% chance (score 1000-5000)
 * - 2 LUX: 15% chance (score 5000-15000)
 * - 3 LUX: 10% chance (score 15000-30000)
 * - 4 LUX: 4% chance (score 30000-50000)
 * - 5 LUX: 1% chance (score > 50000) - VERY RARE!
 */
function calculateLuxReward(score: number): number {
  if (score < 1000) {
    // 40% chance for 0 LUX
    return Math.random() < 0.4 ? 0 : 1;
  } else if (score < 5000) {
    // 30% chance for 1 LUX
    const rand = Math.random();
    if (rand < 0.1) return 0;
    if (rand < 0.4) return 1;
    return 2;
  } else if (score < 15000) {
    // 15% chance for 2 LUX
    const rand = Math.random();
    if (rand < 0.05) return 1;
    if (rand < 0.2) return 2;
    if (rand < 0.35) return 3;
    return 4;
  } else if (score < 30000) {
    // 10% chance for 3 LUX
    const rand = Math.random();
    if (rand < 0.02) return 2;
    if (rand < 0.12) return 3;
    if (rand < 0.22) return 4;
    return 5; // 8% chance for 5
  } else if (score < 50000) {
    // 4% chance for 4 LUX
    const rand = Math.random();
    if (rand < 0.01) return 3;
    if (rand < 0.05) return 4;
    if (rand < 0.13) return 5; // 8% chance for 5
    return 4;
  } else {
    // 1% chance for 5 LUX (VERY RARE!)
    const rand = Math.random();
    if (rand < 0.01) return 5; // 1% chance
    if (rand < 0.03) return 4; // 2% chance
    if (rand < 0.08) return 3; // 5% chance
    return 2; // 92% chance for 2 LUX even with high score
  }
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { address, gameId, score } = body;
  
  // Validate required fields
  if (!address || !gameId || typeof score !== 'number') {
    return createErrorResponse('Missing address, gameId, or score', 'MISSING_FIELDS', 400);
  }

  // Validate address format
  if (!isValidAddress(address)) {
    return createErrorResponse('Invalid address format', 'INVALID_ADDRESS', 400);
  }
    
    // Check if user has already claimed reward for this game session
    const rewards = readJSON<Record<string, Record<string, { amount: number; timestamp: number }>>>('game_rewards', {});
    const addressLower = address.toLowerCase();
    
    if (!rewards[addressLower]) {
      rewards[addressLower] = {};
    }
    
    // Check cooldown first
    const cooldowns = readJSON<Record<string, Record<string, number>>>('game_cooldowns', {});
    const lastPlayTime = cooldowns[addressLower]?.[gameId] || 0;
    const COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const timeSinceLastPlay = Date.now() - lastPlayTime;
    
    if (timeSinceLastPlay < COOLDOWN_MS) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Still on cooldown',
        remainingMs: COOLDOWN_MS - timeSinceLastPlay
      }, { status: 400 });
    }
    
    // Calculate reward
    const luxAmount = calculateLuxReward(score);
    
    // Record reward
    rewards[addressLower][gameId] = {
      amount: luxAmount,
      timestamp: Date.now()
    };
    writeJSON('game_rewards', rewards);
    
  logger.success('LUX reward processed', {
    address: addressLower,
    gameId,
    score,
    luxReward: luxAmount
  }, 'game/reward/lux');

  return NextResponse.json({
    ok: true,
    luxReward: luxAmount,
    score,
    gameId,
    message: luxAmount === 5 ? '🎉 EXTREME RARE! 5 LUX!' : `Received ${luxAmount} LUX reward`
  });
}, 'game/reward/lux');
