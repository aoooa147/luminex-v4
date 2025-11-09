/**
 * Integration tests for Power Purchase Flow
 * Tests: /api/power/init -> /api/power/confirm
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST as initPower } from '../../power/init/route';
import { POST as confirmPower } from '../../power/confirm/route';
import * as powerStorage from '@/lib/power/storage';
import * as powerConfig from '@/lib/utils/powerConfig';

// Mock dependencies
jest.mock('@/lib/power/storage', () => ({
  createPowerDraft: jest.fn(),
  getPowerDraft: jest.fn(),
  markDraftAsUsed: jest.fn(),
  setUserPower: jest.fn(),
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
  WORLD_API_KEY: 'test-api-key',
  WORLD_APP_ID: 'test-app-id',
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
  isValidPowerCode: jest.fn((code) => ['spark', 'nova'].includes(code)),
}));

// Mock fetch for Worldcoin API
global.fetch = jest.fn();

describe('Power Purchase Flow Integration', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full power purchase flow: init -> confirm (first purchase)', async () => {
    // Step 1: Init power purchase
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue(null); // No current power
    (powerConfig.getPowerByCode as jest.Mock).mockReturnValue({
      code: 'spark',
      name: 'Spark',
      priceWLD: '1.0',
      totalAPY: 25,
    });
    (powerStorage.createPowerDraft as jest.Mock).mockResolvedValue(undefined);

    const initReq = new NextRequest('http://localhost:3000/api/power/init', {
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

    const initResponse = await initPower(initReq);
    expect(initResponse.status).toBe(200);

    const initText = await initResponse.text();
    const initData = JSON.parse(initText);
    expect(initData.success).toBe(true);
    expect(initData).toHaveProperty('reference');
    expect(initData).toHaveProperty('amountWLD', '1.0');
    expect(initData).toHaveProperty('target');

    const reference = initData.reference;
    const transactionId = 'test-tx-123';

    // Step 2: Confirm power purchase
    (powerStorage.getPowerDraft as jest.Mock).mockResolvedValue({
      reference,
      userId: validAddress,
      targetCode: 'spark',
      amountWLD: '1.0',
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue(null);
    (powerStorage.setUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'spark',
      txId: transactionId,
      reference,
      acquiredAt: new Date().toISOString(),
      isPaid: true,
    });
    (powerStorage.markDraftAsUsed as jest.Mock).mockResolvedValue(undefined);
    (powerConfig.getPowerByCode as jest.Mock).mockReturnValue({
      code: 'spark',
      name: 'Spark',
      totalAPY: 25,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reference }),
    });

    const confirmReq = new NextRequest('http://localhost:3000/api/power/confirm', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: transactionId,
          reference,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const confirmResponse = await confirmPower(confirmReq);
    expect(confirmResponse.status).toBe(200);

    const confirmText = await confirmResponse.text();
    const confirmData = JSON.parse(confirmText);
    expect(confirmData.success).toBe(true);
    expect(confirmData).toHaveProperty('power');
    expect(confirmData.power.code).toBe('spark');

    // Verify draft was marked as used
    expect(powerStorage.markDraftAsUsed).toHaveBeenCalledWith(reference);
    // Verify power was set
    expect(powerStorage.setUserPower).toHaveBeenCalledWith(
      validAddress,
      'spark',
      transactionId,
      reference,
      true
    );
  });

  it('should complete power upgrade flow: init -> confirm (upgrade)', async () => {
    // Step 1: Init power upgrade (from spark to nova)
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

    const initReq = new NextRequest('http://localhost:3000/api/power/init', {
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

    const initResponse = await initPower(initReq);
    expect(initResponse.status).toBe(200);

    const initText = await initResponse.text();
    const initData = JSON.parse(initText);
    expect(initData.success).toBe(true);
    expect(initData).toHaveProperty('reference');
    expect(initData).toHaveProperty('amountWLD');
    // amountWLD could be "4" or "4.0" depending on how difference is calculated
    expect(parseFloat(initData.amountWLD)).toBe(4.0); // Difference: 5.0 - 1.0 = 4.0
    expect(initData.target.code).toBe('nova');

    const reference = initData.reference;
    const transactionId = 'test-tx-456';

    // Step 2: Confirm power upgrade
    (powerStorage.getPowerDraft as jest.Mock).mockResolvedValue({
      reference,
      userId: validAddress,
      targetCode: 'nova',
      amountWLD: '4.0',
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'spark',
      acquiredAt: new Date().toISOString(),
      isPaid: true,
    });
    (powerStorage.setUserPower as jest.Mock).mockResolvedValue({
      userId: validAddress,
      code: 'nova',
      txId: transactionId,
      reference,
      acquiredAt: new Date().toISOString(),
      isPaid: true,
    });
    (powerStorage.markDraftAsUsed as jest.Mock).mockResolvedValue(undefined);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reference }),
    });

    const confirmReq = new NextRequest('http://localhost:3000/api/power/confirm', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          transaction_id: transactionId,
          reference,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const confirmResponse = await confirmPower(confirmReq);
    expect(confirmResponse.status).toBe(200);

    const confirmText = await confirmResponse.text();
    const confirmData = JSON.parse(confirmText);
    expect(confirmData.success).toBe(true);
    expect(confirmData.power.code).toBe('nova');
  });

  it('should handle power purchase cancellation', async () => {
    // Step 1: Init power purchase
    (powerStorage.getUserPower as jest.Mock).mockResolvedValue(null);
    (powerConfig.getPowerByCode as jest.Mock).mockReturnValue({
      code: 'spark',
      name: 'Spark',
      priceWLD: '1.0',
      totalAPY: 25,
    });
    (powerStorage.createPowerDraft as jest.Mock).mockResolvedValue(undefined);

    const initReq = new NextRequest('http://localhost:3000/api/power/init', {
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

    const initResponse = await initPower(initReq);
    const initText = await initResponse.text();
    const initData = JSON.parse(initText);
    const reference = initData.reference;

    // Step 2: Confirm with cancellation (no transaction_id)
    const confirmReq = new NextRequest('http://localhost:3000/api/power/confirm', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          reference,
          // No transaction_id - user cancelled
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const confirmResponse = await confirmPower(confirmReq);
    expect(confirmResponse.status).toBe(400);

    const confirmText = await confirmResponse.text();
    const confirmData = JSON.parse(confirmText);
    expect(confirmData.success).toBe(false);
    expect(confirmData.error).toBe('USER_CANCELLED');
  });

  it('should prevent downgrade or same level purchase', async () => {
    // User already has nova power
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

    // Try to purchase spark (downgrade) or nova (same level)
    const initReq = new NextRequest('http://localhost:3000/api/power/init', {
      method: 'POST',
      body: JSON.stringify({
        targetCode: 'spark', // Trying to downgrade
        userId: validAddress,
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': validAddress,
      },
    });

    const initResponse = await initPower(initReq);
    expect(initResponse.status).toBe(400);

    const initText = await initResponse.text();
    const initData = JSON.parse(initText);
    expect(initData.success).toBe(false);
  });
});

