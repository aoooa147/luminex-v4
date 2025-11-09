/**
 * Integration tests for Game Flow
 * Tests: /api/game/energy/get -> /api/game/score/nonce -> /api/game/score/submit -> /api/game/reward/lux
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET as getEnergy } from '../../game/energy/get/route';
import { POST as getNonce } from '../../game/score/nonce/route';
import { POST as submitScore } from '../../game/score/submit/route';
import { POST as claimReward } from '../../game/reward/lux/route';
import * as gameStorage from '@/lib/game/storage';
import * as gameVerify from '@/lib/game/verify';
import * as enhancedAntiCheat from '@/lib/game/anticheatEnhanced';
import * as ipTracking from '@/lib/utils/ipTracking';
import * as rateLimiter from '@/lib/cache/rateLimiter';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
  writeJSON: jest.fn(),
}));

jest.mock('@/lib/game/verify', () => ({
  verifyScoreSignature: jest.fn(),
}));

jest.mock('@/lib/game/anticheatEnhanced', () => ({
  enhancedAntiCheat: {
    registerIP: jest.fn(),
    registerDevice: jest.fn(),
    recordAction: jest.fn(),
    validateScore: jest.fn(),
  },
}));

jest.mock('@/lib/utils/ipTracking', () => ({
  getClientIP: jest.fn(() => '127.0.0.1'),
  checkIPRisk: jest.fn().mockResolvedValue({
    riskLevel: 'low',
    isVPN: false,
    isProxy: false,
    isTor: false,
  }),
}));

jest.mock('@/lib/cache/rateLimiter', () => ({
  rateLimiters: {
    gameAction: jest.fn().mockResolvedValue({ allowed: true }),
  },
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
}));

describe('Game Flow Integration', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';
  const addressLower = validAddress.toLowerCase();
  const gameId = 'test-game';
  const deviceId = 'test-device';
  const today = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GAME_ENERGY_FREE_PER_DAY = '5';
    
    // Mock default storage responses
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'energies') {
        return {
          [addressLower]: {
            energy: 5,
            max: 5,
            day: today,
          },
        };
      }
      if (key === 'nonces') {
        return {};
      }
      if (key === 'leaderboards') {
        return {};
      }
      if (key === 'scores') {
        return [];
      }
      if (key === 'game_rewards') {
        return {};
      }
      if (key === 'game_cooldowns') {
        return {};
      }
      return {};
    });
    (gameStorage.writeJSON as jest.Mock).mockResolvedValue(undefined);
    (gameVerify.verifyScoreSignature as jest.Mock).mockResolvedValue(true);
    (enhancedAntiCheat.enhancedAntiCheat.validateScore as jest.Mock).mockResolvedValue({
      suspicious: false,
      blocked: false,
    });
  });

  it('should complete full game flow: energy -> nonce -> submit -> reward', async () => {
    // Step 1: Get energy
    const energyReq = new NextRequest(`http://localhost:3000/api/game/energy/get?address=${validAddress}`);
    const energyResponse = await getEnergy(energyReq);
    expect(energyResponse.status).toBe(200);

    const energyText = await energyResponse.text();
    const energyData = JSON.parse(energyText);
    expect(energyData.success).toBe(true);
    expect(energyData).toHaveProperty('energy');
    expect(energyData.energy).toBeGreaterThan(0);

    // Step 2: Get nonce (POST request with body)
    let storedNonce: string = '';
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nonces') {
        return storedNonce ? { [addressLower]: storedNonce } : {};
      }
      return {};
    });
    (gameStorage.writeJSON as jest.Mock).mockImplementation((key: string, value: any) => {
      if (key === 'nonces') {
        // Store nonce for later use
        storedNonce = value[addressLower] || '';
      }
    });

    const nonceReq = new NextRequest('http://localhost:3000/api/game/score/nonce', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const nonceResponse = await getNonce(nonceReq);
    expect(nonceResponse.status).toBe(200);

    const nonceText = await nonceResponse.text();
    const nonceData = JSON.parse(nonceText);
    expect(nonceData.success).toBe(true);
    expect(nonceData).toHaveProperty('nonce');
    const nonce = nonceData.nonce;

    // Step 3: Submit score
    const score = 5000;
    const gameDuration = 60; // seconds
    const actionsCount = 50;
    const ts = Date.now();
    const sig = '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';

    // Update nonces storage to include the nonce we just got
    storedNonce = nonce;
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nonces') {
        return { [addressLower]: nonce };
      }
      if (key === 'energies') {
        return {
          [addressLower]: {
            energy: 5,
            max: 5,
            day: today,
          },
        };
      }
      if (key === 'leaderboards') {
        return {};
      }
      if (key === 'scores') {
        return [];
      }
      return {};
    });

    const submitReq = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: {
          score,
          ts,
          nonce,
          gameDuration,
          actionsCount,
          gameId,
        },
        sig,
        deviceId,
      }),
      headers: {
        'Content-Type': 'application/json',
        'user-agent': 'test-user-agent',
      },
    });

    const submitResponse = await submitScore(submitReq);
    expect(submitResponse.status).toBe(200);

    const submitText = await submitResponse.text();
    const submitData = JSON.parse(submitText);
    expect(submitData.success).toBe(true);
    expect(submitData).toHaveProperty('score');
    expect(submitData).toHaveProperty('newEnergy');
    expect(submitData.newEnergy).toBe(4); // Energy should decrease by 1

    // Step 4: Claim reward
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'game_rewards') {
        return {};
      }
      if (key === 'game_cooldowns') {
        return {}; // No cooldown
      }
      return {};
    });

    const rewardReq = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId,
        score,
        deviceId,
      }),
      headers: {
        'Content-Type': 'application/json',
        'user-agent': 'test-user-agent',
      },
    });

    const rewardResponse = await claimReward(rewardReq);
    expect(rewardResponse.status).toBe(200);

    const rewardText = await rewardResponse.text();
    const rewardData = JSON.parse(rewardText);
    expect(rewardData.success).toBe(true);
    expect(rewardData).toHaveProperty('luxReward');
    expect(rewardData).toHaveProperty('score', score);
    expect(rewardData).toHaveProperty('gameId', gameId);
  });

  it('should handle no energy scenario', async () => {
    // Set energy to 0
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'energies') {
        return {
          [addressLower]: {
            energy: 0,
            max: 5,
            day: today,
          },
        };
      }
      if (key === 'nonces') {
        return { [addressLower]: 'test-nonce' };
      }
      return {};
    });

    const score = 1000;
    const ts = Date.now();
    const nonce = 'test-nonce';
    const sig = '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';

    const submitReq = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: {
          score,
          ts,
          nonce,
          gameDuration: 60,
          actionsCount: 10,
          gameId,
        },
        sig,
        deviceId,
      }),
      headers: {
        'Content-Type': 'application/json',
        'user-agent': 'test-user-agent',
      },
    });

    const submitResponse = await submitScore(submitReq);
    expect(submitResponse.status).toBe(400);

    const submitText = await submitResponse.text();
    const submitData = JSON.parse(submitText);
    expect(submitData.success).toBe(false);
    expect(submitData.error).toBe('NO_ENERGY');
  });

  it('should handle invalid nonce', async () => {
    // Set different nonce in storage
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nonces') {
        return { [addressLower]: 'different-nonce' };
      }
      if (key === 'energies') {
        return {
          [addressLower]: {
            energy: 5,
            max: 5,
            day: today,
          },
        };
      }
      return {};
    });

    const score = 1000;
    const ts = Date.now();
    const nonce = 'wrong-nonce';
    const sig = '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';

    const submitReq = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: {
          score,
          ts,
          nonce,
          gameDuration: 60,
          actionsCount: 10,
          gameId,
        },
        sig,
        deviceId,
      }),
      headers: {
        'Content-Type': 'application/json',
        'user-agent': 'test-user-agent',
      },
    });

    const submitResponse = await submitScore(submitReq);
    expect(submitResponse.status).toBe(400);

    const submitText = await submitResponse.text();
    const submitData = JSON.parse(submitText);
    expect(submitData.success).toBe(false);
    expect(submitData.error).toBe('NONCE_INVALID');
  });

  it('should handle cooldown for reward claim', async () => {
    // Set cooldown (last play was less than 24 hours ago)
    const lastPlayTime = Date.now() - (12 * 60 * 60 * 1000); // 12 hours ago
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'game_rewards') {
        return {};
      }
      if (key === 'game_cooldowns') {
        return {
          [addressLower]: {
            [gameId]: lastPlayTime,
          },
        };
      }
      return {};
    });

    const rewardReq = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId,
        score: 5000,
        deviceId,
      }),
      headers: {
        'Content-Type': 'application/json',
        'user-agent': 'test-user-agent',
      },
    });

    const rewardResponse = await claimReward(rewardReq);
    expect(rewardResponse.status).toBe(400);

    const rewardText = await rewardResponse.text();
    const rewardData = JSON.parse(rewardText);
    expect(rewardData.success).toBe(false);
    expect(rewardData.error).toBe('COOLDOWN_ACTIVE');
  });

  it('should handle suspicious score detection', async () => {
    // Set up valid nonce and energy
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nonces') {
        return { [addressLower]: 'test-nonce' };
      }
      if (key === 'energies') {
        return {
          [addressLower]: {
            energy: 5,
            max: 5,
            day: today,
          },
        };
      }
      return {};
    });

    // Mock suspicious score detection
    (enhancedAntiCheat.enhancedAntiCheat.validateScore as jest.Mock).mockResolvedValue({
      suspicious: true,
      blocked: true,
      reason: 'Score too high for duration',
      confidence: 0.9,
    });

    const score = 100000; // Very high score
    const gameDuration = 1; // Very short duration (suspicious)
    const ts = Date.now();
    const nonce = 'test-nonce';
    const sig = '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';

    const submitReq = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: {
          score,
          ts,
          nonce,
          gameDuration,
          actionsCount: 1,
          gameId,
        },
        sig,
        deviceId,
      }),
      headers: {
        'Content-Type': 'application/json',
        'user-agent': 'test-user-agent',
      },
    });

    const submitResponse = await submitScore(submitReq);
    expect(submitResponse.status).toBe(400);

    const submitText = await submitResponse.text();
    const submitData = JSON.parse(submitText);
    expect(submitData.success).toBe(false);
    expect(submitData.error).toBe('SUSPICIOUS_SCORE');
  });
});

