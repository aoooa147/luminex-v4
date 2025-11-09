/**
 * Integration tests for /api/system/health route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../system/health/route';

// Mock performance optimizer
jest.mock('@/lib/performance/optimizer', () => ({
  checkDatabaseHealth: jest.fn().mockResolvedValue({
    healthy: true,
    latency: 10,
    error: null,
  }),
  getMemoryUsage: jest.fn().mockReturnValue({
    used: 100 * 1024 * 1024,
    total: 1000 * 1024 * 1024,
    percentage: 10,
  }),
}));

describe('/api/system/health', () => {
  it('should return health status', async () => {
    const url = 'http://localhost:3000/api/system/health';
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data).toBeDefined();
    expect(data.status).toBeDefined();
    expect(['operational', 'degraded']).toContain(data.status);
  });
});
