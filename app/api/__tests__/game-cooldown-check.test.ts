/**
 * Unit tests for /api/game/cooldown/check route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../game/cooldown/check/route';
import * as gameStorage from '@/lib/game/storage';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
  writeJSON: jest.fn(),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
}));

describe('/api/game/cooldown/check', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';
  const addressLower = validAddress.toLowerCase();

  beforeEach(() => {
    jest.clearAllMocks();
    (gameStorage.readJSON as jest.Mock).mockReturnValue({});
  });

  it('should return error when address is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/cooldown/check', {
      method: 'POST',
      body: JSON.stringify({
        gameId: 'test-game',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when gameId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/cooldown/check', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
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
    const req = new NextRequest('http://localhost:3000/api/game/cooldown/check', {
      method: 'POST',
      body: JSON.stringify({
        address: 'invalid',
        gameId: 'test-game',
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

  it('should return not on cooldown when user has not played', async () => {
    (gameStorage.readJSON as jest.Mock).mockReturnValue({});

    const req = new NextRequest('http://localhost:3000/api/game/cooldown/check', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId: 'test-game',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.isOnCooldown).toBe(false);
    expect(data.canPlay).toBe(true);
    expect(data.lastPlayTime).toBe(0);
  });

  it('should return on cooldown when user recently played', async () => {
    const lastPlayTime = Date.now() - 1000; // 1 second ago (within 24 hours)
    (gameStorage.readJSON as jest.Mock).mockReturnValue({
      [addressLower]: lastPlayTime,
    });

    const req = new NextRequest('http://localhost:3000/api/game/cooldown/check', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId: 'test-game',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.isOnCooldown).toBe(true);
    expect(data.canPlay).toBe(false);
    expect(data.lastPlayTime).toBe(lastPlayTime);
    expect(data.remainingMs).toBeGreaterThan(0);
    expect(data.remainingHours).toBeGreaterThanOrEqual(0);
  });

  it('should return not on cooldown when cooldown expired', async () => {
    const lastPlayTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago (cooldown expired)
    (gameStorage.readJSON as jest.Mock).mockReturnValue({
      [addressLower]: lastPlayTime,
    });

    const req = new NextRequest('http://localhost:3000/api/game/cooldown/check', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        gameId: 'test-game',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.isOnCooldown).toBe(false);
    expect(data.canPlay).toBe(true);
  });
});

