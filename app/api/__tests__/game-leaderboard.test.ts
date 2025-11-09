/**
 * Integration tests for /api/game/leaderboard/top route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../game/leaderboard/top/route';
import * as gameStorage from '@/lib/game/storage';

// Mock game storage
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
}));

describe('/api/game/leaderboard/top', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return top scores', async () => {
    const today = new Date().toISOString().slice(0, 10);
    
    (gameStorage.readJSON as jest.Mock).mockReturnValue({
      [today]: {
        '0x1234567890123456789012345678901234567890': 1000,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd': 2000,
      },
    });
    
    const url = 'http://localhost:3000/api/game/leaderboard/top';
    const req = new NextRequest(url);
    
    const response = await GET(req);
    expect(response.status).toBe(200);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('top');
    expect(Array.isArray(data.top)).toBe(true);
  });

  it('should return top scores with limit', async () => {
    const today = new Date().toISOString().slice(0, 10);
    
    (gameStorage.readJSON as jest.Mock).mockReturnValue({
      [today]: {
        '0x1234567890123456789012345678901234567890': 1000,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd': 2000,
      },
    });
    
    const url = 'http://localhost:3000/api/game/leaderboard/top?limit=10';
    const req = new NextRequest(url);
    
    const response = await GET(req);
    expect(response.status).toBe(200);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('top');
    expect(Array.isArray(data.top)).toBe(true);
  });
});

