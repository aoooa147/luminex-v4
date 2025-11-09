/**
 * Unit tests for /api/game/score/nonce route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../game/score/nonce/route';
import * as gameStorage from '@/lib/game/storage';

// Mock dependencies
jest.mock('@/lib/game/storage', () => ({
  readJSON: jest.fn(),
  writeJSON: jest.fn(),
}));

jest.mock('@/lib/utils/validation', () => ({
  isValidAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
}));

describe('/api/game/score/nonce', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    (gameStorage.readJSON as jest.Mock).mockReturnValue({});
    (gameStorage.writeJSON as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return error when address is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/score/nonce', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_ADDRESS');
  });

  it('should return error for invalid address format', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/score/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('MISSING_ADDRESS');
  });

  it('should generate nonce for valid address', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/score/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: validAddress }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('nonce');
    expect(typeof data.nonce).toBe('string');
    expect(data.nonce.length).toBeGreaterThan(0);

    expect(gameStorage.writeJSON).toHaveBeenCalledWith('nonces', expect.any(Object));
  });

  it('should store nonce in storage', async () => {
    const req = new NextRequest('http://localhost:3000/api/game/score/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: validAddress }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    const nonce = data.nonce;

    expect(gameStorage.writeJSON).toHaveBeenCalledWith(
      'nonces',
      expect.objectContaining({
        [validAddress.toLowerCase()]: nonce,
      })
    );
  });

  it('should generate different nonces for different addresses', async () => {
    const address1 = '0x1234567890123456789012345678901234567890';
    const address2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    const req1 = new NextRequest('http://localhost:3000/api/game/score/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: address1 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const req2 = new NextRequest('http://localhost:3000/api/game/score/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: address2 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response1 = await POST(req1);
    const response2 = await POST(req2);

    const text1 = await response1.text();
    const text2 = await response2.text();
    const data1 = JSON.parse(text1);
    const data2 = JSON.parse(text2);

    expect(data1.nonce).not.toBe(data2.nonce);
  });
});

