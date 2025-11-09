/**
 * Integration tests for /api/game/energy/get route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../game/energy/get/route';
import * as gameStorage from '@/lib/game/storage';

// Mock game storage
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
  writeJSON: jest.fn(),
}));

describe('/api/game/energy/get', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GAME_ENERGY_FREE_PER_DAY = '5';
  });

  it('should return error when address is missing', async () => {
    const url = 'http://localhost:3000/api/game/energy/get';
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(400);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
  });

  it('should return error for invalid address format', async () => {
    const url = 'http://localhost:3000/api/game/energy/get?address=invalid';
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(400);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_ADDRESS');
  });

  it('should return energy for valid address', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const today = new Date().toISOString().slice(0, 10);
    
    (gameStorage.readJSON as jest.Mock).mockReturnValue({
      [validAddress]: {
        energy: 5,
        max: 5,
        day: today,
      },
    });
    
    const url = `http://localhost:3000/api/game/energy/get?address=${validAddress}`;
    const req = new NextRequest(url);
    
    const response = await GET(req);
    expect(response.status).toBe(200);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('energy');
    expect(data).toHaveProperty('max');
    expect(typeof data.energy).toBe('number');
  });
});

