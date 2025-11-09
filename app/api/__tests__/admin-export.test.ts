/**
 * Unit tests for /api/admin/export route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../admin/export/route';
import * as gameStorage from '@/lib/game/storage';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
}));

describe('/api/admin/export', () => {
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
          referralCodeMap: {
            'LUX123456': '0x1111111111111111111111111111111111111111',
          },
        };
      }
      if (key === 'powers') {
        return {
          userPowers: {
            '0x3333333333333333333333333333333333333333': {
              code: 'spark',
              acquiredAt: new Date().toISOString(),
            },
          },
          powerDrafts: {
            'draft-123': {
              userId: '0x4444444444444444444444444444444444444444',
              targetCode: 'nova',
              status: 'pending',
            },
          },
        };
      }
      if (key === 'scores') {
        return [
          { address: '0x5555555555555555555555555555555555555555', score: 1000, timestamp: Date.now() },
        ];
      }
      if (key === 'leaderboards') {
        return {
          '2024-12-19': {
            '0x5555555555555555555555555555555555555555': 1000,
          },
        };
      }
      return {};
    });
  });

  it('should export data as JSON by default', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/export');
    const response = await GET(req);

    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data).toHaveProperty('exportDate');
    expect(data).toHaveProperty('referrals');
    expect(data).toHaveProperty('powers');
    expect(data).toHaveProperty('games');
  });

  it('should export data as JSON when format is json', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/export?format=json');
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data).toHaveProperty('exportDate');
    expect(data).toHaveProperty('referrals');
    expect(data).toHaveProperty('powers');
    expect(data).toHaveProperty('games');
  });

  it('should export data as CSV when format is csv', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/export?format=csv');
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');

    const text = await response.text();
    expect(text).toContain('Type,Address,Data,Timestamp');
    expect(text).toContain('Referral');
    expect(text).toContain('Power');
    expect(text).toContain('Game');
  });

  it('should include export date in JSON format', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/export');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.exportDate).toBeDefined();
    expect(new Date(data.exportDate).getTime()).toBeGreaterThan(0);
  });

  it('should include all data types in export', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/export');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.referrals).toBeDefined();
    expect(data.powers).toBeDefined();
    expect(data.games).toBeDefined();
    expect(data.games.scores).toBeDefined();
    expect(data.games.leaderboards).toBeDefined();
  });
});
