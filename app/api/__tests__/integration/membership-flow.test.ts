/**
 * Integration tests for Membership Purchase Flow
 * Tests: /api/membership/purchase (POST -> GET)
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../../membership/purchase/route';

// Mock dependencies
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
}));

describe('Membership Purchase Flow Integration', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full membership purchase flow: purchase -> get', async () => {
    // Step 1: Purchase membership
    const purchaseReq = new NextRequest('http://localhost:3000/api/membership/purchase', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        tier: 'gold',
        transactionHash: '0xabc123',
        amount: '10.0',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const purchaseResponse = await POST(purchaseReq);
    expect(purchaseResponse.status).toBe(200);

    const purchaseText = await purchaseResponse.text();
    const purchaseData = JSON.parse(purchaseText);
    expect(purchaseData.success).toBe(true);
    expect(purchaseData).toHaveProperty('membership');
    expect(purchaseData.membership.tier).toBe('gold');
    expect(purchaseData.membership).toHaveProperty('purchaseDate');
    expect(purchaseData.membership.txHash).toBe('0xabc123');

    // Step 2: Get membership status
    const getReq = new NextRequest(`http://localhost:3000/api/membership/purchase?address=${validAddress}`);
    const getResponse = await GET(getReq);
    expect(getResponse.status).toBe(200);

    const getText = await getResponse.text();
    const getData = JSON.parse(getText);
    expect(getData.success).toBe(true);
    expect(getData.membership).not.toBeNull();
    expect(getData.membership.tier).toBe('gold');
    expect(getData.membership.txHash).toBe('0xabc123');
  });

  it('should handle membership upgrade', async () => {
    // Step 1: Purchase bronze membership
    const purchaseReq1 = new NextRequest('http://localhost:3000/api/membership/purchase', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        tier: 'bronze',
        transactionHash: '0xabc123',
        amount: '5.0',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(purchaseReq1);

    // Step 2: Upgrade to gold membership
    const purchaseReq2 = new NextRequest('http://localhost:3000/api/membership/purchase', {
      method: 'POST',
      body: JSON.stringify({
        address: validAddress,
        tier: 'gold',
        transactionHash: '0xdef456',
        amount: '10.0',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const purchaseResponse2 = await POST(purchaseReq2);
    expect(purchaseResponse2.status).toBe(200);

    const purchaseText2 = await purchaseResponse2.text();
    const purchaseData2 = JSON.parse(purchaseText2);
    expect(purchaseData2.membership.tier).toBe('gold');
    expect(purchaseData2.membership.txHash).toBe('0xdef456');

    // Step 3: Verify membership is upgraded
    const getReq = new NextRequest(`http://localhost:3000/api/membership/purchase?address=${validAddress}`);
    const getResponse = await GET(getReq);
    expect(getResponse.status).toBe(200);

    const getText = await getResponse.text();
    const getData = JSON.parse(getText);
    expect(getData.membership.tier).toBe('gold');
  });

  it('should return null when membership not found', async () => {
    const newAddress = '0x0000000000000000000000000000000000000000';
    const getReq = new NextRequest(`http://localhost:3000/api/membership/purchase?address=${newAddress}`);
    const getResponse = await GET(getReq);
    expect(getResponse.status).toBe(200);

    const getText = await getResponse.text();
    const getData = JSON.parse(getText);
    expect(getData.success).toBe(true);
    expect(getData.membership).toBeNull();
  });
});

