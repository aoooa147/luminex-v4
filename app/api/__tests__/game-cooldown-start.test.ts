/**
 * Unit tests for /api/game/cooldown/start route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../game/cooldown/start/route';
import * as gameStorage from '@/lib/game/storage';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
  writeJSON: jest.fn(),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
}));

describe('/api/game/cooldown/start', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';
  const addressLower = validAddress.toLowerCase();

  beforeEach(() => {
    jest.clearAllMocks();
    (gameStorage.readJSON as jest.Mock).mockReturnValue({});
    (gameStorage.writeJSON as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return error when address is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/cooldown/start', {
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
    const req = new NextRequest('http://localhost:3000/api/game/cooldown/start', {
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
    const req = new NextRequest('http://localhost:3000/api/game/cooldown/start', {
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

  it('should start cooldown successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/cooldown/start', {
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
    expect(data.ok).toBe(true);
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('lastPlayTime');
    expect(data.gameId).toBe('all'); // Global cooldown

    expect(gameStorage.writeJSON).toHaveBeenCalledWith(
      'game_cooldowns_global',
      expect.objectContaining({
        [addressLower]: expect.any(Number),
      })
    );
  });

  it('should update existing cooldown', async () => {
    const existingCooldown = Date.now() - 1000;
    (gameStorage.readJSON as jest.Mock).mockReturnValue({
      [addressLower]: existingCooldown,
    });

    const req = new NextRequest('http://localhost:3000/api/game/cooldown/start', {
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
    expect(data.lastPlayTime).toBeGreaterThan(existingCooldown);
  });
});

