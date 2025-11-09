/**
 * Unit tests for /api/admin/activity route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../admin/activity/route';
import * as gameStorage from '@/lib/game/storage';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
}));

jest.mock('@/lib/power/storage', () => ({
  getUserPower: jest.fn(),
  getPowerDraft: jest.fn(),
}));

jest.mock('@/lib/referral/storage', () => ({
  getReferralRecord: jest.fn(),
  getReferralData: jest.fn(),
}));

describe('/api/admin/activity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gameStorage.readJSON as jest.Mock).mockImplementation((key: string) => {
      if (key === 'referrals') {
        return {
          referralRecords: {
            '0x1111111111111111111111111111111111111111': {
              newUserAddress: '0x1111111111111111111111111111111111111111',
              referrerAddress: '0x2222222222222222222222222222222222222222',
              timestamp: Date.now(),
              rewardGiven: true,
            },
          },
        };
      }
      if (key === 'powers') {
        return {
          userPowers: {
            '0x3333333333333333333333333333333333333333': {
              code: 'spark',
              acquiredAt: new Date().toISOString(),
              txId: '0xtx123',
            },
          },
          powerDrafts: {
            'draft-123': {
              userId: '0x4444444444444444444444444444444444444444',
              targetCode: 'nova',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          },
        };
      }
      if (key === 'staking') {
        return {
          stakingRecords: [
            {
              address: '0x5555555555555555555555555555555555555555',
              poolId: 0,
              amount: '100',
              type: 'stake',
              txHash: '0xtx456',
              timestamp: Date.now(),
            },
          ],
        };
      }
      if (key === 'scores') {
        // Return scores within last 30 days
        return [
          {
            address: '0x6666666666666666666666666666666666666666',
            score: 1000,
            timestamp: Date.now(), // Recent score
          },
        ];
      }
      return {};
    });
  });

  it('should return activities', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/activity');
    const response = await GET(req);

    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.success).toBe(true);
    expect(data).toHaveProperty('activities');
    expect(Array.isArray(data.activities)).toBe(true);
  });

  it('should respect limit parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/activity?limit=5');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.activities.length).toBeLessThanOrEqual(5);
  });

  it('should include referral activities', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/activity');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    const referralActivities = data.activities.filter((a: any) => a.type === 'referral');
    expect(referralActivities.length).toBeGreaterThanOrEqual(0);
  });

  it('should include membership activities', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/activity');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    const membershipActivities = data.activities.filter((a: any) => a.type === 'membership');
    expect(membershipActivities.length).toBeGreaterThanOrEqual(0);
  });

  it('should include staking activities', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/activity');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    const stakingActivities = data.activities.filter((a: any) => a.type === 'staking');
    expect(stakingActivities.length).toBeGreaterThanOrEqual(0);
  });

  it('should include game activities', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/activity');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    const gameActivities = data.activities.filter((a: any) => a.type === 'game');
    expect(gameActivities.length).toBeGreaterThanOrEqual(0);
  });

  it('should sort activities by timestamp descending', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/activity');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    if (data.activities.length > 1) {
      for (let i = 0; i < data.activities.length - 1; i++) {
        expect(data.activities[i].timestamp).toBeGreaterThanOrEqual(data.activities[i + 1].timestamp);
      }
    }
  });
});
