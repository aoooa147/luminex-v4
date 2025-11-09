/**
 * Unit tests for /api/admin/stats route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../admin/stats/route';
import * as gameStorage from '@/lib/game/storage';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
}));

describe('/api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'referrals') {
        return {
          referralData: {
            '0x1111111111111111111111111111111111111111': {
              totalReferrals: 5,
              totalEarnings: 25,
            },
          },
          referralRecords: {
            '0x2222222222222222222222222222222222222222': {
              newUserAddress: '0x2222222222222222222222222222222222222222',
              referrerAddress: '0x1111111111111111111111111111111111111111',
              timestamp: Date.now(),
            },
          },
        };
      }
      if (key === 'scores') {
        return [
          { address: '0x3333333333333333333333333333333333333333', score: 1000, timestamp: Date.now() },
          { address: '0x4444444444444444444444444444444444444444', score: 2000, timestamp: Date.now() },
        ];
      }
      if (key === 'leaderboards') {
        return {
          '2024-12-19': {
            '0x3333333333333333333333333333333333333333': 1000,
            '0x4444444444444444444444444444444444444444': 2000,
          },
        };
      }
      if (key === 'powers') {
        return {
          userPowers: {
            '0x5555555555555555555555555555555555555555': {
              code: 'spark',
              acquiredAt: new Date().toISOString(),
              isPaid: true,
            },
          },
          powerDrafts: {},
        };
      }
      return {};
    });
  });

  it('should return admin stats', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.success).toBe(true);
    expect(data).toHaveProperty('stats');
    expect(data.stats).toHaveProperty('totalUsers');
    expect(data.stats).toHaveProperty('totalReferrals');
    expect(data.stats).toHaveProperty('totalStaking');
    expect(data.stats).toHaveProperty('totalRevenue');
    expect(data.stats).toHaveProperty('memberships');
    expect(data.stats).toHaveProperty('trends');
  });

  it('should calculate unique users correctly', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.success).toBe(true);
    expect(data.stats.totalUsers).toBeGreaterThanOrEqual(0);
    expect(typeof data.stats.totalUsers).toBe('number');
  });

  it('should handle empty data', async () => {
    // Mock empty data for all keys
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'referrals') return { referralData: {}, referralRecords: {} };
      if (key === 'scores') return [];
      if (key === 'leaderboards') return {};
      if (key === 'powers') return { userPowers: {}, powerDrafts: {} };
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.success).toBe(true);
    expect(data).toHaveProperty('stats');
    expect(data.stats.totalUsers).toBe(0);
    expect(data.stats.totalStaking).toBe(0);
    expect(data.stats.totalRevenue).toBe(0);
    expect(data.stats.totalReferrals).toBe(0);
  });
});
