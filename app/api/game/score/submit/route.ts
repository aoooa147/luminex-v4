import { NextRequest, NextResponse } from 'next/server'; 
import { readJSON, writeJSON } from '@/lib/game/storage'; 
import { verifyScoreSignature } from '@/lib/game/verify';
import { logger } from '@/lib/utils/logger';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { getClientIP, checkIPRisk } from '@/lib/utils/ipTracking';
import { enhancedAntiCheat } from '@/lib/game/anticheatEnhanced';
import { rateLimiters } from '@/lib/cache/rateLimiter';

export const runtime = 'nodejs';

const WINDOW_MS=Number(process.env.GAME_SCORE_WINDOW_MS ?? 60000);
const MAX_SCORE_PER_SECOND = 5000;
const MAX_SCORE_PER_ACTION = 10000;
const MIN_GAME_DURATION_FOR_HIGH_SCORE = 10; // seconds
const HIGH_SCORE_THRESHOLD = 50000;

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting
  const rateLimitResult = await rateLimiters.gameAction(req);
  if (!rateLimitResult.allowed) {
    return createErrorResponse(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }

  const body = await req.json();
  const { address, payload, sig, deviceId } = body;
  
  // Validate required fields
  if (!address || !payload?.nonce || !sig) {
    return createErrorResponse('Missing address, payload.nonce, or sig', 'MISSING_FIELDS', 400);
  }
  
  const { score, ts, nonce, gameDuration, actionsCount } = payload; 
  if (typeof score !== 'number' || !ts || !nonce) {
    return createErrorResponse('Invalid payload format', 'INVALID_PAYLOAD', 400);
  }
  
  // Validate address format
  if (!isValidAddress(address)) {
    return createErrorResponse('Invalid address format', 'INVALID_ADDRESS', 400);
  }
  
  // Enhanced anti-cheat validation
  const addressLower = address.toLowerCase();
  
  // Get IP address and user agent
  const ipAddress = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || undefined;
  
  // Check IP risk (async, don't block if it fails)
  let ipInfo;
  try {
    ipInfo = await checkIPRisk(ipAddress);
    
    // Register IP in database
    await enhancedAntiCheat.registerIP(ipAddress, addressLower, ipInfo);
    
    // Block if high risk IP
    if (ipInfo.riskLevel === 'high' && (ipInfo.isVPN || ipInfo.isProxy || ipInfo.isTor)) {
      logger.warn('Anti-cheat: high risk IP detected', { 
        address: addressLower, 
        ipAddress,
        riskLevel: ipInfo.riskLevel
      }, 'game/score/submit');
      return createErrorResponse('High risk IP detected', 'HIGH_RISK_IP', 400);
    }
  } catch (error) {
    // Silent fallback - continue without IP check
    logger.warn('Failed to check IP risk', { error }, 'game/score/submit');
  }
  
  // Register device fingerprint if provided
  if (deviceId) {
    try {
      await enhancedAntiCheat.registerDevice(deviceId, addressLower, {
        userAgent,
        ipAddress,
      });
    } catch (error) {
      // Silent fallback
    }
  }
  
  // Validate nonce
  const nonces = readJSON<Record<string,string>>('nonces',{}); 
  const expected = nonces[addressLower]; 
  if (!expected || expected !== nonce) {
    return createErrorResponse('Invalid or expired nonce', 'NONCE_INVALID', 400);
  }
  
  // Verify signature
  const ok = await verifyScoreSignature({ 
    address: address as `0x${string}`, 
    payload:{ address, score, ts, nonce }, 
    signature:sig as `0x${string}`
  }); 
  if (!ok) {
    return createErrorResponse('Invalid signature', 'SIG_INVALID', 400);
  }
  
  // Check timestamp freshness
  const now = Date.now(); 
  if (Math.abs(now - Number(ts)) > WINDOW_MS) {
    return createErrorResponse('Request timestamp is stale', 'STALE_TIMESTAMP', 400);
  }
  
  // Enhanced anti-cheat checks using the enhanced anti-cheat system
  const gameId = payload?.gameId || 'unknown';
  
  // Record action for analysis
  await enhancedAntiCheat.recordAction(
    addressLower,
    'score_submit',
    { score, gameDuration, actionsCount },
    gameId,
    deviceId,
    ipAddress,
    userAgent
  );
  
  if (typeof gameDuration === 'number' && gameDuration > 0) {
    const scoreCheck = await enhancedAntiCheat.validateScore(
      addressLower, 
      score, 
      gameDuration, 
      actionsCount || 0, 
      gameId,
      deviceId,
      ipAddress
    );
    if (scoreCheck.suspicious || scoreCheck.blocked) {
      logger.warn('Anti-cheat: suspicious score detected', { 
        address: addressLower, 
        reason: scoreCheck.reason || 'suspicious_score', 
        confidence: scoreCheck.confidence,
        deviceId,
        ipAddress
      }, 'game/score/submit');
      return createErrorResponse(
        scoreCheck.reason || 'Suspicious score detected',
        'SUSPICIOUS_SCORE',
        400
      );
    }

    // Additional checks for extra security
    // Check 1: Score too high relative to game duration
    const scorePerSecond = score / gameDuration;
    if (scorePerSecond > MAX_SCORE_PER_SECOND) {
      logger.warn('Anti-cheat: score too high per second', { 
        address: addressLower, 
        scorePerSecond: scorePerSecond.toFixed(2) 
      }, 'game/score/submit');
      return createErrorResponse('Score rate too high', 'SUSPICIOUS_SCORE_RATE', 400);
    }

    // Check 2: High score with suspiciously short duration
    if (score > HIGH_SCORE_THRESHOLD && gameDuration < MIN_GAME_DURATION_FOR_HIGH_SCORE) {
      logger.warn('Anti-cheat: high score in short duration', { 
        address: addressLower, 
        score, 
        gameDuration 
      }, 'game/score/submit');
      return createErrorResponse('High score with suspiciously short duration', 'SUSPICIOUS_SCORE_DURATION', 400);
    }
  }

  // Check 3: Score too high relative to actions
  if (typeof actionsCount === 'number' && actionsCount > 0) {
    const scorePerAction = score / actionsCount;
    if (scorePerAction > MAX_SCORE_PER_ACTION) {
      logger.warn('Anti-cheat: score per action too high', { 
        address: addressLower, 
        scorePerAction: scorePerAction.toFixed(2) 
      }, 'game/score/submit');
      return createErrorResponse('Score per action too high', 'SUSPICIOUS_SCORE_PER_ACTION', 400);
    }
  }
  
  // Check 4: Energy check and score cap
  const energies = readJSON<Record<string,{energy:number;max:number;day:string}>>('energies',{}); 
  const today = new Date().toISOString().slice(0,10);
  if (!energies[addressLower] || energies[addressLower].day !== today) { 
    const freePerDay = Number(process.env.GAME_ENERGY_FREE_PER_DAY ?? 5); 
    energies[addressLower] = {energy:freePerDay,max:freePerDay,day:today}; 
  }
  if (energies[addressLower].energy <= 0) {
    return createErrorResponse('No energy remaining', 'NO_ENERGY', 400);
  }
  energies[addressLower].energy -= 1; 
  writeJSON('energies',energies);
  
  // Apply score cap
  const capped = Math.max(0, Math.min(score, 100000)); 
  const period = today;
  const scores = readJSON<any[]>('scores',[]); 
  scores.push({address:addressLower,score:capped,period,ts:Date.now()}); 
  writeJSON('scores',scores);
  const board = readJSON<Record<string,Record<string,number>>>('leaderboards',{}); 
  if (!board[period]) board[period] = {}; 
  board[period][addressLower] = (board[period][addressLower] || 0) + capped; 
  writeJSON('leaderboards',board);
  delete nonces[addressLower]; 
  writeJSON('nonces',nonces);
  
  logger.success('Score submitted successfully', {
    address: addressLower,
    score: capped,
    newEnergy: energies[addressLower].energy
  }, 'game/score/submit');
  
  return createSuccessResponse({
    ok: true,
    newEnergy: energies[addressLower].energy,
    score: capped
  });
}, 'game/score/submit');
