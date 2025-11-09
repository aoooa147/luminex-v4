/**
 * Integration tests for Referral Flow
 * Tests: /api/referral/stats -> /api/referral/process
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET as getReferralStats } from '../../referral/stats/route';
import { POST as processReferral } from '../../referral/process/route';
import * as referralStorage from '@/lib/referral/storage';
import * as referralAntiCheat from '@/lib/referral/anticheat';

// Mock dependencies
jest.mock('@/lib/referral/storage', () => ({
  getReferralStats: jest.fn(),
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

describe('Referral Flow Integration', () => {
  const referrerAddress = '0x1234567890123456789012345678901234567890';
  const newUserAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  beforeEach(() => {
    jest.clearAllMocks();
    (referralAntiCheat.referralAntiCheat.validateReferral as jest.Mock).mockReturnValue({
      valid: true,
      blocked: false,
    });
    (referralStorage.hasBeenReferred as jest.Mock).mockReturnValue(false);
    (referralStorage.addReferral as jest.Mock).mockReturnValue(true);
  });

  it('should complete full referral flow: stats -> process', async () => {
    // Step 1: Get referral stats
    (referralStorage.getReferralStats as jest.Mock).mockReturnValue({
      totalReferrals: 5,
      totalEarnings: 25,
    });

    const statsReq = new NextRequest(`http://localhost:3000/api/referral/stats?address=${referrerAddress}`);
    const statsResponse = await getReferralStats(statsReq);
    expect(statsResponse.status).toBe(200);

    const statsText = await statsResponse.text();
    const statsData = JSON.parse(statsText);
    expect(statsData.success).toBe(true);
    expect(statsData).toHaveProperty('stats');
    expect(statsData.stats).toHaveProperty('totalReferrals', 5);
    expect(statsData.stats).toHaveProperty('totalEarnings', 25);

    // Step 2: Process referral
    const processReq = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const processResponse = await processReferral(processReq);
    expect(processResponse.status).toBe(200);

    const processText = await processResponse.text();
    const processData = JSON.parse(processText);
    expect(processData.success).toBe(true);
    expect(processData).toHaveProperty('referrerReward', 5);
    expect(processData).toHaveProperty('message');

    expect(referralStorage.addReferral).toHaveBeenCalledWith(
      referrerAddress,
      newUserAddress,
      5
    );
  });

  it('should prevent self-referral', async () => {
    const statsReq = new NextRequest(`http://localhost:3000/api/referral/stats?address=${referrerAddress}`);
    await getReferralStats(statsReq);

    const processReq = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress: referrerAddress, // Same address
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const processResponse = await processReferral(processReq);
    expect(processResponse.status).toBe(400);

    const processText = await processResponse.text();
    const processData = JSON.parse(processText);
    expect(processData.success).toBe(false);
  });

  it('should prevent duplicate referrals', async () => {
    // First referral
    (referralStorage.hasBeenReferred as jest.Mock).mockReturnValueOnce(false);
    const processReq1 = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    await processReferral(processReq1);

    // Second referral (should fail)
    (referralStorage.hasBeenReferred as jest.Mock).mockReturnValueOnce(true);
    const processReq2 = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const processResponse2 = await processReferral(processReq2);
    expect(processResponse2.status).toBe(400);

    const processText2 = await processResponse2.text();
    const processData2 = JSON.parse(processText2);
    expect(processData2.success).toBe(false);
    expect(processData2.error).toBe('already_referred');
  });

  it('should handle anti-cheat blocking', async () => {
    (referralAntiCheat.referralAntiCheat.validateReferral as jest.Mock).mockReturnValue({
      valid: false,
      blocked: true,
      reason: 'ip_blocked',
    });

    const processReq = new NextRequest('http://localhost:3000/api/referral/process', {
      method: 'POST',
      body: JSON.stringify({
        newUserAddress,
        referrerAddress,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const processResponse = await processReferral(processReq);
    expect(processResponse.status).toBe(403);

    const processText = await processResponse.text();
    const processData = JSON.parse(processText);
    expect(processData.success).toBe(false);
    expect(processData.blocked).toBe(true);
  });
});

