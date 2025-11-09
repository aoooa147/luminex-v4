/**
 * Unit tests for /api/power/grant-free route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../power/grant-free/route';
import * as powerStorage from '@/lib/power/storage';
import * as powerConfig from '@/lib/utils/powerConfig';

// Mock dependencies
jest.mock('@/lib/power/storage', () => ({
  grantFreePower: jest.fn(),
  getUserPower: jest.fn(),
}));

jest.mock('@/lib/utils/powerConfig', () => ({
  getPowerByCode: jest.fn(),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
  isValidPowerCode: jest.fn((code) => ['spark', 'nova'].includes(code)),
}));

describe('/api/power/grant-free', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when userId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/power/grant-free', {
      method: 'POST',
      body: JSON.stringify({
        code: 'spark',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when code is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/power/grant-free', {
      method: 'POST',
      body: JSON.stringify({
        userId: validAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error for invalid address format', async () => {
    const req = new NextRequest('http://localhost:3000/api/power/grant-free', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'invalid',
        code: 'spark',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_ADDRESS');
  });

  it('should return error for invalid power code', async () => {
    const req = new NextRequest('http://localhost:3000/api/power/grant-free', {
      method: 'POST',
      body: JSON.stringify({
        userId: validAddress,
        code: 'invalid',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should grant free power for first-time user', async () => {
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue(null);
    (powerConfig.getPowerByCode as jest.Mock).mockReturnValue({
      code: 'spark',
      name: 'Spark',
      priceWLD: '1.0',
      totalAPY: 25,
    });
    (powerStorage.grantFreePower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'spark',
      acquiredAt: new Date().toISOString(),
      isPaid: false,
    });

    const req = new NextRequest('http://localhost:3000/api/power/grant-free', {
      method: 'POST',
      body: JSON.stringify({
        userId: validAddress,
        code: 'spark',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('power');
    expect(data.power.code).toBe('spark');
    expect(data.power.isPaid).toBe(false);

    expect(powerStorage.grantFreePower).toHaveBeenCalledWith(validAddress, 'spark');
  });

  it('should allow upgrade to higher tier', async () => {
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'spark',
      acquiredAt: new Date().toISOString(),
      isPaid: false,
    });
    (powerConfig.getPowerByCode as jest.Mock).mockImplementation((code: string) => {
      if (code === 'spark') {
        return { code: 'spark', name: 'Spark', priceWLD: '1.0', totalAPY: 25 };
      }
      if (code === 'nova') {
        return { code: 'nova', name: 'Nova', priceWLD: '5.0', totalAPY: 50 };
      }
      return null;
    });
    (powerStorage.grantFreePower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'nova',
      acquiredAt: new Date().toISOString(),
      isPaid: false,
    });

    const req = new NextRequest('http://localhost:3000/api/power/grant-free', {
      method: 'POST',
      body: JSON.stringify({
        userId: validAddress,
        code: 'nova',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data.power.code).toBe('nova');

    expect(powerStorage.grantFreePower).toHaveBeenCalledWith(validAddress, 'nova');
  });

  it('should prevent downgrade or same level grant', async () => {
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'nova',
      acquiredAt: new Date().toISOString(),
      isPaid: false,
    });
    (powerConfig.getPowerByCode as jest.Mock).mockImplementation((code: string) => {
      if (code === 'spark') {
        return { code: 'spark', name: 'Spark', priceWLD: '1.0', totalAPY: 25 };
      }
      if (code === 'nova') {
        return { code: 'nova', name: 'Nova', priceWLD: '5.0', totalAPY: 50 };
      }
      return null;
    });

    // Try to grant spark (downgrade)
    const req = new NextRequest('http://localhost:3000/api/power/grant-free', {
      method: 'POST',
      body: JSON.stringify({
        userId: validAddress,
        code: 'spark',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_UPGRADE');
  });
});

