/**
 * Unit tests for /api/power/init route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../power/init/route';
import * as powerStorage from '@/lib/power/storage';
import * as powerConfig from '@/lib/utils/powerConfig';

// Mock dependencies
jest.mock('@/lib/power/storage', () => ({
  createPowerDraft: jest.fn(),
  getUserPower: jest.fn(),
}));

jest.mock('@/lib/utils/powerConfig', () => ({
  getPowerByCode: jest.fn(),
  POWERS: [
    {
      code: 'spark',
      name: 'Spark',
      priceWLD: '1.0',
      totalAPY: 25,
    },
    {
      code: 'nova',
      name: 'Nova',
      priceWLD: '5.0',
      totalAPY: 50,
    },
  ],
}));

jest.mock('@/lib/utils/constants', () => ({
  TREASURY_ADDRESS: '0x1234567890123456789012345678901234567890',
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
  isValidPowerCode: jest.fn((code) => ['spark', 'nova'].includes(code)),
}));

describe('/api/power/init', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when targetCode is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/power/init', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': validAddress,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when userId is missing', async () => {
    (powerConfig.getPowerByCode as jest.Mock).mockReturnValue({
      code: 'spark',
      name: 'Spark',
      priceWLD: '1.0',
      totalAPY: 25,
    });

    const req = new NextRequest('http://localhost:3000/api/power/init', {
      method: 'POST',
      body: JSON.stringify({
        targetCode: 'spark',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(401);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_USER_ID');
  });

  it('should return error for invalid power code', async () => {
    const req = new NextRequest('http://localhost:3000/api/power/init', {
      method: 'POST',
      body: JSON.stringify({
        targetCode: 'invalid',
        userId: validAddress,
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': validAddress,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should initialize power purchase for first purchase', async () => {
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue(null);
    (powerConfig.getPowerByCode as jest.Mock).mockReturnValue({
      code: 'spark',
      name: 'Spark',
      priceWLD: '1.0',
      totalAPY: 25,
    });
    (powerStorage.createPowerDraft as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/power/init', {
      method: 'POST',
      body: JSON.stringify({
        targetCode: 'spark',
        userId: validAddress,
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': validAddress,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('reference');
    expect(data).toHaveProperty('amountWLD', '1.0');
    expect(data).toHaveProperty('target');
    expect(data.target.code).toBe('spark');

    expect(powerStorage.createPowerDraft).toHaveBeenCalled();
  });

  it('should initialize power upgrade (calculate difference)', async () => {
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'spark',
      acquiredAt: new Date().toISOString(),
      isPaid: true,
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
    (powerStorage.createPowerDraft as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/power/init', {
      method: 'POST',
      body: JSON.stringify({
        targetCode: 'nova',
        userId: validAddress,
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': validAddress,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('reference');
    expect(parseFloat(data.amountWLD)).toBe(4.0); // Difference: 5.0 - 1.0 = 4.0
    expect(data.target.code).toBe('nova');

    expect(powerStorage.createPowerDraft).toHaveBeenCalled();
  });

  it('should prevent downgrade or same level purchase', async () => {
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'nova',
      acquiredAt: new Date().toISOString(),
      isPaid: true,
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

    // Try to purchase spark (downgrade)
    const req = new NextRequest('http://localhost:3000/api/power/init', {
      method: 'POST',
      body: JSON.stringify({
        targetCode: 'spark',
        userId: validAddress,
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': validAddress,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });
});

