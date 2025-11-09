/**
 * Unit tests for /api/admin/settings route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, PATCH } from '../admin/settings/route';
import * as systemSettings from '@/lib/admin/systemSettings';

// Mock dependencies
jest.mock('@/lib/admin/systemSettings', () => ({
  getSystemSettings: jest.fn(),
  updateSystemSettings: jest.fn(),
  toggleMaintenanceMode: jest.fn(),
  setBroadcastMessage: jest.fn(),
}));

const ADMIN_ADDRESS = '0xadminaddress123456789012345678901234567890';
const NON_ADMIN_ADDRESS = '0xnonadmin123456789012345678901234567890';

describe('/api/admin/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS = ADMIN_ADDRESS;
    (systemSettings.getSystemSettings as jest.Mock).mockResolvedValue({
      maintenanceMode: false,
      maintenanceMessage: null,
      broadcastEnabled: false,
      broadcastMessage: null,
      systemVersion: '4.0.0',
    });
  });

  describe('GET', () => {
    it('should return settings for admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/settings', {
        headers: {
          'x-user-id': ADMIN_ADDRESS,
        },
      });
      const response = await GET(req);

      expect(response.status).toBe(200);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('maintenanceMode');
    });

    it('should return error for non-admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/settings', {
        headers: {
          'x-user-id': NON_ADMIN_ADDRESS,
        },
      });
      const response = await GET(req);

      expect(response.status).toBe(403);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH', () => {
    it('should return error when user is not admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          maintenanceMode: true,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': NON_ADMIN_ADDRESS,
        },
      });

      const response = await PATCH(req);
      // Admin check requires admin address
      expect(response.status).toBe(403);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('should toggle maintenance mode', async () => {
      (systemSettings.toggleMaintenanceMode as jest.Mock).mockResolvedValue(undefined);
      (systemSettings.getSystemSettings as jest.Mock).mockResolvedValue({
        maintenanceMode: true,
        maintenanceMessage: 'System under maintenance',
        broadcastEnabled: false,
        broadcastMessage: null,
        systemVersion: '4.0.0',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          maintenanceMode: true,
          maintenanceMessage: 'System under maintenance',
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ADMIN_ADDRESS,
        },
      });

      const response = await PATCH(req);
      expect(response.status).toBe(200);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(true);
      expect(data.maintenanceMode).toBe(true);
    });

    it('should update broadcast message', async () => {
      (systemSettings.setBroadcastMessage as jest.Mock).mockResolvedValue(undefined);
      (systemSettings.getSystemSettings as jest.Mock).mockResolvedValue({
        maintenanceMode: false,
        maintenanceMessage: null,
        broadcastEnabled: true,
        broadcastMessage: 'New broadcast message',
        systemVersion: '4.0.0',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          broadcastMessage: 'New broadcast message',
          broadcastEnabled: true,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ADMIN_ADDRESS,
        },
      });

      const response = await PATCH(req);
      expect(response.status).toBe(200);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(true);
      expect(data.broadcastEnabled).toBe(true);
      expect(data.broadcastMessage).toBe('New broadcast message');
    });

    it('should return error when no valid updates provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ADMIN_ADDRESS,
        },
      });

      const response = await PATCH(req);
      expect(response.status).toBe(400);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(false);
      expect(data.error).toBe('INVALID_REQUEST');
    });
  });
});
