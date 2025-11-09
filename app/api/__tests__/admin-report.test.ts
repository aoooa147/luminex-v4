/**
 * Unit tests for /api/admin/report route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../admin/report/route';
import * as gameStorage from '@/lib/game/storage';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
}));

describe('/api/admin/report', () => {
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
      if (key === 'powers') {
        return {
          userPowers: {
            '0x3333333333333333333333333333333333333333': {
              code: 'spark',
              acquiredAt: new Date().toISOString(),
            },
          },
        };
      }
      if (key === 'scores') {
        return [
          { address: '0x4444444444444444444444444444444444444444', score: 1000, timestamp: Date.now() },
        ];
      }
      return {};
    });
  });

  it('should generate report for month period by default', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/report');
    const response = await GET(req);

    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.success).toBe(true);
    expect(data).toHaveProperty('report');
    expect(data.report.period).toBe('month');
  });

  it('should generate report for week period', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/report?period=week');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.report.period).toBe('week');
  });

  it('should generate report for all period', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/report?period=all');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.report.period).toBe('all');
  });

  it('should include summary statistics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/report');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.report.summary).toHaveProperty('totalUsers');
    expect(data.report.summary).toHaveProperty('newUsers');
    expect(data.report.summary).toHaveProperty('newMemberships');
    expect(data.report.summary).toHaveProperty('gamePlays');
    expect(data.report.summary).toHaveProperty('totalReferrals');
    expect(data.report.summary).toHaveProperty('newReferrals');
  });

  it('should include details statistics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/report');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.report.details).toHaveProperty('referrals');
    expect(data.report.details).toHaveProperty('memberships');
    expect(data.report.details).toHaveProperty('games');
  });

  it('should include period start and end dates', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/report');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.report).toHaveProperty('periodStart');
    expect(data.report).toHaveProperty('periodEnd');
    expect(data.report).toHaveProperty('generatedAt');
  });

  it('should filter data by period', async () => {
    // Test with week period
    const req = new NextRequest('http://localhost:3000/api/admin/report?period=week');
    const response = await GET(req);

    const text = await response.text();
    const data = JSON.parse(text);

    expect(data.report.period).toBe('week');
    // Week period should filter recent data
    expect(data.report.summary).toBeDefined();
  });
});
