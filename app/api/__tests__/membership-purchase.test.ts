/**
 * Unit tests for /api/membership/purchase route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../membership/purchase/route';

// Mock dependencies
jest.mock('@/lib/utils/rateLimit', () => ({
  takeToken: jest.fn(() => true),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
}));

describe('/api/membership/purchase', () => {
  // Use unique addresses for each test to avoid state pollution
  const getUniqueAddress = (suffix: number) => {
    const hex = suffix.toString(16).padStart(40, '0');
    return `0x${hex}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return error when address is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          tier: 'gold',
          transactionHash: '0xabc123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(false);
    });

    it('should return error when tier is missing', async () => {
      const address = getUniqueAddress(1);
      const req = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          address,
          transactionHash: '0xabc123',
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
      const req = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          address: 'invalid',
          tier: 'gold',
          transactionHash: '0xabc123',
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

    it('should return error for invalid tier', async () => {
      const address = getUniqueAddress(2);
      const req = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          address,
          tier: 'invalid',
          transactionHash: '0xabc123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(false);
      expect(data.error).toBe('INVALID_TIER');
    });

    it('should purchase membership successfully', async () => {
      const address = getUniqueAddress(3);
      const req = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          address,
          tier: 'gold',
          transactionHash: '0xabc123',
          amount: '10.0',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('membership');
      expect(data.membership.tier).toBe('gold');
      expect(data.membership).toHaveProperty('purchaseDate');
      expect(data.membership.txHash).toBe('0xabc123');
    });

    it('should handle all valid tiers', async () => {
      const validTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

      for (let i = 0; i < validTiers.length; i++) {
        const tier = validTiers[i];
        const address = getUniqueAddress(i + 10);
        const req = new NextRequest('http://localhost:3000/api/membership/purchase', {
          method: 'POST',
          body: JSON.stringify({
            address,
            tier,
            transactionHash: `0x${tier}123`,
            amount: '10.0',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(req);
        expect(response.status).toBe(200);

        const text = await response.text();
        const data = JSON.parse(text);
        expect(data.success).toBe(true);
        expect(data.membership.tier).toBe(tier.toLowerCase());
      }
    });
  });

  describe('GET', () => {
    it('should return error when address is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/membership/purchase');
      const response = await GET(req);
      expect(response.status).toBe(400);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(false);
      expect(data.error).toBe('MISSING_ADDRESS');
    });

    it('should return error for invalid address format', async () => {
      const req = new NextRequest('http://localhost:3000/api/membership/purchase?address=invalid');
      const response = await GET(req);
      expect(response.status).toBe(400);

      const text = await response.text();
      const data = JSON.parse(text);
      expect(data.success).toBe(false);
      expect(data.error).toBe('INVALID_ADDRESS');
    });

    it('should return null when membership not found', async () => {
      // Use a completely unique address that hasn't been used
      const newAddress = getUniqueAddress(999);
      const getReq = new NextRequest(`http://localhost:3000/api/membership/purchase?address=${newAddress}`);
      const getResponse = await GET(getReq);
      expect(getResponse.status).toBe(200);

      const getText = await getResponse.text();
      const getData = JSON.parse(getText);
      expect(getData.success).toBe(true);
      // The route returns null when membership is not found
      expect(getData.membership).toBeNull();
    });

    it('should return membership when found', async () => {
      // First, purchase a membership with a unique address
      const address = getUniqueAddress(888);
      const postReq = new NextRequest('http://localhost:3000/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({
          address,
          tier: 'gold',
          transactionHash: '0xabc123',
          amount: '10.0',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      await POST(postReq);

      // Then, get the membership
      const getReq = new NextRequest(`http://localhost:3000/api/membership/purchase?address=${address}`);
      const getResponse = await GET(getReq);
      expect(getResponse.status).toBe(200);

      const getText = await getResponse.text();
      const getData = JSON.parse(getText);
      expect(getData.success).toBe(true);
      expect(getData.membership).not.toBeNull();
      expect(getData.membership.tier).toBe('gold');
    });
  });
});
