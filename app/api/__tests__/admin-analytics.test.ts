/**
 * Unit tests for /api/admin/analytics route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../admin/analytics/route';
import * as gameStorage from '@/lib/game/storage';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
}));

describe('/api/admin/analytics', () => {
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
              priceWLD: '1.0',
              acquiredAt: new Date().toISOString(),
            },
          },
        };
      }
      return {};
    });
  });

  it('should return analytics data', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(req);

    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.success).toBe(true);
    expect(data).toHaveProperty('analytics');
    expect(data.analytics).toHaveProperty('users');
    expect(data.analytics).toHaveProperty('staking');
    expect(data.analytics).toHaveProperty('revenue');
    expect(data.analytics).toHaveProperty('memberships');
    expect(data.analytics).toHaveProperty('referrals');
    expect(data.analytics).toHaveProperty('games');
  });

  it('should calculate user statistics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.analytics.users).toHaveProperty('total');
    expect(data.analytics.users).toHaveProperty('active');
    expect(data.analytics.users).toHaveProperty('newThisMonth');
  });

  it('should calculate staking statistics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.analytics.staking).toHaveProperty('total');
    expect(data.analytics.staking).toHaveProperty('average');
  });

  it('should calculate revenue statistics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.analytics.revenue).toHaveProperty('total');
    expect(data.analytics.revenue).toHaveProperty('thisMonth');
  });

  it('should calculate membership statistics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.analytics.memberships).toHaveProperty('paid');
    expect(data.analytics.memberships).toHaveProperty('free');
    expect(data.analytics.memberships).toHaveProperty('total');
  });

  it('should calculate referral statistics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.analytics.referrals).toHaveProperty('total');
    expect(data.analytics.referrals).toHaveProperty('thisMonth');
    expect(data.analytics.referrals).toHaveProperty('topReferrers');
  });

  it('should calculate game statistics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.analytics.games).toHaveProperty('totalPlays');
    expect(data.analytics.games).toHaveProperty('uniquePlayers');
    expect(data.analytics.games).toHaveProperty('averageScore');
  });
});
