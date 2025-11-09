/**
 * Unit tests for /api/referral/process route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../referral/process/route';
import * as referralStorage from '@/lib/referral/storage';
import * as referralAntiCheat from '@/lib/referral/anticheat';

// Mock dependencies
jest.mock('@/lib/referral/storage', () => ({
  addReferral: jest.fn(),
  hasBeenReferred: jest.fn(),
}));

jest.mock('@/lib/referral/anticheat', () => ({
  referralAntiCheat: {
    getClientIP: jest.fn(() => '127.0.0.1'),
    validateReferral: jest.fn(),
    recordAttempt: jest.fn(),
  },
}));

jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
}));

describe('/api/referral/process', () => {
  const newUserAddress = '0x1234567890123456789012345678901234567890';
  const referrerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  beforeEach(() => {
    jest.clearAllMocks();
    (referralAntiCheat.referralAntiCheat.validateReferral as jest.Mock).mockReturnValue({
      valid: true,
      blocked: false,
    });
    (referralStorage.hasBeenReferred as jest.Mock).mockReturnValue(false);
    (referralStorage.addReferral as jest.Mock).mockReturnValue(true);
  });

  it('should return error when newUserAddress is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when referrerAddress is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
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
    const req = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress: 'invalid',
        referrerAddress,
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

  it('should return error for self-referral', async () => {
    const req = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress: newUserAddress, // Same address
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when user already referred', async () => {
    (referralStorage.hasBeenReferred as jest.Mock).mockReturnValue(true);

    const req = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('already_referred');
  });

  it('should process referral successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('referrerReward', 5);
    expect(data).toHaveProperty('message');

    expect(referralStorage.addReferral).toHaveBeenCalledWith(
      referrerAddress,
      newUserAddress,
      5
    );
  });

  it('should return error when anti-cheat validation fails', async () => {
    (referralAntiCheat.referralAntiCheat.validateReferral as jest.Mock).mockReturnValue({
      valid: false,
      blocked: false,
      reason: 'same_ip_referral',
    });

    const req = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('same_ip_referral');
  });

  it('should return 403 when anti-cheat blocks request', async () => {
    (referralAntiCheat.referralAntiCheat.validateReferral as jest.Mock).mockReturnValue({
      valid: false,
      blocked: true,
      reason: 'ip_blocked',
    });

    const req = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(403);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.blocked).toBe(true);
  });
});

