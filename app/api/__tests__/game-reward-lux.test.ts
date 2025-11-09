/**
 * Unit tests for /api/game/reward/lux route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../game/reward/lux/route';
import * as gameStorage from '@/lib/game/storage';
import * as enhancedAntiCheat from '@/lib/game/anticheatEnhanced';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
  writeJSON: jest.fn(),
}));

jest.mock('@/lib/game/anticheatEnhanced', () => ({
  enhancedAntiCheat: {
    registerIP: jest.fn(),
    registerDevice: jest.fn(),
    recordAction: jest.fn(),
  },
}));

jest.mock('@/lib/utils/ipTracking', () => ({
  getClientIP: jest.fn(() => '127.0.0.1'),
  checkIPRisk: jest.fn().mockResolvedValue({
    ip: '127.0.0.1',
    riskLevel: 'low',
    isVPN: false,
    isProxy: false,
    isTor: false,
  }),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
}));

describe('/api/game/reward/lux', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';
  const addressLower = validAddress.toLowerCase();
  const gameId = 'test-game';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset IP risk check mock to low risk by default
    const { checkIPRisk } = require('@/lib/utils/ipTracking');
    (checkIPRisk as jest.Mock).mockResolvedValue({
      ip: '127.0.0.1',
      riskLevel: 'low',
      isVPN: false,
      isProxy: false,
      isTor: false,
    });
    const today = new Date().toISOString().slice(0, 10);
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'game_rewards') return {};
      if (key === 'game_cooldowns') return {};
      return {};
    });
    (gameStorage.writeJSON as jest.Mock).mockResolvedValue(undefined);
    (enhancedAntiCheat.enhancedAntiCheat.registerIP as jest.Mock).mockResolvedValue(undefined);
    (enhancedAntiCheat.enhancedAntiCheat.registerDevice as jest.Mock).mockResolvedValue(undefined);
    (enhancedAntiCheat.enhancedAntiCheat.recordAction as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return error when address is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        score: 1000,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_FIELDS');
  });

  it('should return error when gameId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        score: 1000,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_FIELDS');
  });

  it('should return error when score is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_FIELDS');
  });

  it('should return error for invalid address format', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: 'invalid',
        gameId,
        score: 1000,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_ADDRESS');
  });

  it('should return error when on cooldown', async () => {
    const lastPlayTime = Date.now() - 1000; // 1 second ago (within 24 hours)
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'game_rewards') return {};
      if (key === 'game_cooldowns') {
        // Return cooldown data with lastPlayTime for this gameId
        return {
          [addressLower]: {
            [gameId]: lastPlayTime,
          },
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId,
        score: 1000,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('COOLDOWN_ACTIVE');
  });

  it('should calculate and return LUX reward successfully', async () => {
    // Mock cooldown expired (25 hours ago) or no cooldown
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'game_rewards') return {};
      if (key === 'game_cooldowns') return {}; // No cooldown
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId,
        score: 5000,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('luxReward');
    expect(data).toHaveProperty('score', 5000);
    expect(data).toHaveProperty('gameId', gameId);
    expect(typeof data.luxReward).toBe('number');
    expect(data.luxReward).toBeGreaterThanOrEqual(0);
    expect(data.luxReward).toBeLessThanOrEqual(5);
  });

  it('should handle high risk IP', async () => {
    const { checkIPRisk } = require('@/lib/utils/ipTracking');
    (checkIPRisk as jest.Mock).mockResolvedValue({
      ip: '127.0.0.1',
      riskLevel: 'high',
      isVPN: true,
      isProxy: false,
      isTor: false,
    });

    const req = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId,
        score: 1000,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('HIGH_RISK_IP');
  });

  it('should record reward in storage', async () => {
    // Mock no cooldown - cooldown either expired (25+ hours ago) or never set (0)
    // When lastPlayTime is 0, timeSinceLastPlay will be > COOLDOWN_MS, so no cooldown
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'game_rewards') {
        // Return empty rewards object
        return {};
      }
      if (key === 'game_cooldowns') {
        // Return empty cooldowns or cooldown with 0 (never played) or very old timestamp
        return {};
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/game/reward/lux', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId,
        score: 3000,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    
    // Check response
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('luxReward');
    expect(typeof data.luxReward).toBe('number');

    // Verify that writeJSON was called to store the reward
    expect(gameStorage.writeJSON).toHaveBeenCalled();
    const writeCalls = (gameStorage.writeJSON as jest.Mock).mock.calls;
    const rewardWriteCall = writeCalls.find((call) => call[0] === 'game_rewards');
    expect(rewardWriteCall).toBeDefined();
    if (rewardWriteCall) {
      expect(rewardWriteCall[1]).toHaveProperty(addressLower);
      expect(rewardWriteCall[1][addressLower]).toHaveProperty(gameId);
      expect(rewardWriteCall[1][addressLower][gameId]).toHaveProperty('amount');
      expect(rewardWriteCall[1][addressLower][gameId]).toHaveProperty('timestamp');
    }
  });
});
