/**
 * Unit tests for /api/process-referral route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../process-referral/route';
import * as referralStorage from '@/lib/referral/storage';

// Mock referral anti-cheat first (before jest.mock)
const mockValidateReferral = jest.fn();
const mockRecordAttempt = jest.fn();
const mockGetClientIP = jest.fn(() => '127.0.0.1');

// Mock dependencies
jest.mock('@/lib/referral/storage', () => ({
  getReferrerAddressFromCode: jest.fn(),
  addReferral: jest.fn(),
  hasBeenReferred: jest.fn(),
}));

jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
  isValidReferralCode: jest.fn((code) => /^LUX[a-fA-F0-9]{6}$/i.test(code)),
}));

jest.mock('@/lib/referral/anticheat', () => ({
  referralAntiCheat: {
    getClientIP: (...args: any[]) => mockGetClientIP(...args),
    validateReferral: (...args: any[]) => mockValidateReferral(...args),
    recordAttempt: (...args: any[]) => mockRecordAttempt(...args),
  },
}));

describe('/api/process-referral', () => {
  const newUserAddress = '0x1234567890123456789012345678901234567890';
  const referrerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const referralCode = 'LUX123456';

  beforeEach(() => {
    jest.clearAllMocks();
    (referralStorage.getReferrerAddressFromCode as jest.Mock).mockReturnValue(referrerAddress);
    (referralStorage.hasBeenReferred as jest.Mock).mockReturnValue(false);
    (referralStorage.addReferral as jest.Mock).mockReturnValue(true);
    
    mockValidateReferral.mockReturnValue({
      valid: true,
      blocked: false,
    });
    mockRecordAttempt.mockReturnValue(undefined);
    mockGetClientIP.mockReturnValue('127.0.0.1');
  });

  it('should return error when newUserId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/process-referral', {
      method: 'POST',
      body: JSON.stringify({
        referrerCode: referralCode,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when referrerCode is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/process-referral', {
      method: 'POST',
      body: JSON.stringify({
        newUserId: newUserAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error for invalid referral code format', async () => {
    const req = new NextRequest('http://localhost:3000/api/process-referral', {
      method: 'POST',
      body: JSON.stringify({
        newUserId: newUserAddress,
        referrerCode: 'INVALID',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });

  it('should return error when referrer not found', async () => {
    (referralStorage.getReferrerAddressFromCode as jest.Mock).mockReturnValue(null);

    const req = new NextRequest('http://localhost:3000/api/process-referral', {
      method: 'POST',
      body: JSON.stringify({
        newUserId: newUserAddress,
        referrerCode: referralCode,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('REFERRER_NOT_FOUND');
  });

  it('should process referral successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/process-referral', {
      method: 'POST',
      body: JSON.stringify({
        newUserId: newUserAddress,
        referrerCode: referralCode,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('referrerReward', 5);

    expect(referralStorage.addReferral).toHaveBeenCalledWith(
      referrerAddress,
      newUserAddress,
      5
    );
  });

  it('should prevent duplicate referrals', async () => {
    (referralStorage.hasBeenReferred as jest.Mock).mockReturnValue(true);

    const req = new NextRequest('http://localhost:3000/api/process-referral', {
      method: 'POST',
      body: JSON.stringify({
        newUserId: newUserAddress,
        referrerCode: referralCode,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('ALREADY_REFERRED');
  });

  it('should prevent self-referral', async () => {
    (referralStorage.getReferrerAddressFromCode as jest.Mock).mockReturnValue(newUserAddress);

    const req = new NextRequest('http://localhost:3000/api/process-referral', {
      method: 'POST',
      body: JSON.stringify({
        newUserId: newUserAddress,
        referrerCode: referralCode,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('SELF_REFERRAL');
  });

  it('should handle anti-cheat validation failure', async () => {
    mockValidateReferral.mockReturnValue({
      valid: false,
      blocked: false,
      reason: 'same_ip_referral',
    });

    const req = new NextRequest('http://localhost:3000/api/process-referral', {
      method: 'POST',
      body: JSON.stringify({
        newUserId: newUserAddress,
        referrerCode: referralCode,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
  });
});
