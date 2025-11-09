/**
 * Integration tests for /api/nonce route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../nonce/route';

// Mock next/headers
const mockCookies = {
  set: jest.fn(),
  get: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => mockCookies),
}));

describe('/api/nonce', () => {
  it('should generate a nonce', async () => {
    const url = 'http://localhost:3000/api/nonce';
    const req = new NextRequest(url);
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    
    // NextResponse.json() creates a Response with ReadableStream body
    const text = await response.text();
    const data = JSON.parse(text);
    
    expect(data.success).toBe(true);
    // createSuccessResponse spreads { nonce: '...' } directly, so nonce is at root level
    expect(data).toHaveProperty('nonce');
    expect(typeof data.nonce).toBe('string');
    expect(data.nonce.length).toBeGreaterThan(0);
    // Nonce should be alphanumeric (UUID without dashes = 32 hex characters)
    expect(data.nonce).toMatch(/^[a-f0-9]{32}$/i);
  });
});
