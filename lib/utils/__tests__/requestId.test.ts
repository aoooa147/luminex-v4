/**
 * Unit tests for requestId.ts
 */

import { requestId } from '../requestId';

describe('requestId', () => {
  it('should generate a request ID', () => {
    const id = requestId();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique request IDs', () => {
    const id1 = requestId();
    const id2 = requestId();
    expect(id1).not.toBe(id2);
  });

  it('should generate multiple unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(requestId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate valid request ID format', () => {
    const id = requestId();
    // Should be either UUID format or random string
    expect(id).toMatch(/^[a-f0-9-]{36}$|^[a-z0-9]+$/i);
  });
});

