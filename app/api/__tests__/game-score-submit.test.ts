/**
 * Unit tests for /api/game/score/submit route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../game/score/submit/route';
import * as gameStorage from '@/lib/game/storage';
import * as gameVerify from '@/lib/game/verify';
import * as enhancedAntiCheat from '@/lib/game/anticheatEnhanced';
import * as rateLimiters from '@/lib/cache/rateLimiter';

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

jest.mock('@/lib/cache/rateLimiter', () => ({
  rateLimiters: {
    gameAction: jest.fn(),
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

describe('/api/game/score/submit', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';
  const addressLower = validAddress.toLowerCase();
  const nonce = 'test-nonce';
  const signature = '0xtest-signature';

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimiters.rateLimiters.gameAction as jest.Mock).mockResolvedValue({ allowed: true });
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nonces') return { [addressLower]: nonce };
      if (key === 'energies') return { [addressLower]: { energy: 5, max: 5, day: new Date().toISOString().slice(0, 10) } };
      if (key === 'scores') return [];
      if (key === 'leaderboards') return {};
      return {};
    });
    (gameStorage.writeJSON as jest.Mock).mockResolvedValue(undefined);
    (gameVerify.verifyScoreSignature as jest.Mock).mockResolvedValue(true);
    (enhancedAntiCheat.enhancedAntiCheat.validateScore as jest.Mock).mockResolvedValue({
      suspicious: false,
      blocked: false,
    });
    (enhancedAntiCheat.enhancedAntiCheat.registerIP as jest.Mock).mockResolvedValue(undefined);
    (enhancedAntiCheat.enhancedAntiCheat.registerDevice as jest.Mock).mockResolvedValue(undefined);
    (enhancedAntiCheat.enhancedAntiCheat.recordAction as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return error when address is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        payload: { score: 1000, ts: Date.now(), nonce },
        sig: signature,
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

  it('should return error when nonce is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: { score: 1000, ts: Date.now() },
        sig: signature,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error for invalid address format', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: 'invalid',
        payload: { score: 1000, ts: Date.now(), nonce },
        sig: signature,
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

  it('should return error when nonce is invalid', async () => {
    (gameStorage.readJSON as jest.Mock).mockReturnValue({ [addressLower]: 'different-nonce' });

    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: { score: 1000, ts: Date.now(), nonce },
        sig: signature,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('NONCE_INVALID');
  });

  it('should return error when signature is invalid', async () => {
    (gameVerify.verifyScoreSignature as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: { score: 1000, ts: Date.now(), nonce },
        sig: signature,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('SIG_INVALID');
  });

  it('should return error when timestamp is stale', async () => {
    const staleTimestamp = Date.now() - 120000; // 2 minutes ago

    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: { score: 1000, ts: staleTimestamp, nonce },
        sig: signature,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('STALE_TIMESTAMP');
  });

  it('should return error when no energy remaining', async () => {
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nonces') return { [addressLower]: nonce };
      if (key === 'energies') return { [addressLower]: { energy: 0, max: 5, day: new Date().toISOString().slice(0, 10) } };
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: { score: 1000, ts: Date.now(), nonce },
        sig: signature,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('NO_ENERGY');
  });

  it('should submit score successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: { score: 1000, ts: Date.now(), nonce, gameDuration: 30, actionsCount: 10 },
        sig: signature,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('score');
    expect(data).toHaveProperty('newEnergy');
  });

  it('should cap score at 100000', async () => {
    // Mock validateScore to allow high score for this test
    (enhancedAntiCheat.enhancedAntiCheat.validateScore as jest.Mock).mockResolvedValue({
      suspicious: false,
      blocked: false,
    });

    const req = new NextRequest('http://localhost:3000/api/game/score/submit', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        payload: { score: 200000, ts: Date.now(), nonce, gameDuration: 120, actionsCount: 100 },
        sig: signature,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.score).toBe(100000);
  });
});

