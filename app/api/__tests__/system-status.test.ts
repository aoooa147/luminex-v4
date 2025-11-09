/**
 * Integration tests for /api/system/status route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../system/status/route';

// Mock system settings
jest.mock('@/lib/admin/systemSettings', () => ({
  getSystemSettings: jest.fn().mockResolvedValue({
    maintenanceMode: false,
    maintenanceMessage: null,
    broadcastEnabled: false,
    broadcastMessage: null,
    systemVersion: '4.0.0',
  }),
  isMaintenanceMode: jest.fn().mockReturnValue(false),
}));

describe('/api/system/status', () => {
  it('should return system status', async () => {
    const url = 'http://localhost:3000/api/system/status';
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('maintenanceMode');
  });
});

