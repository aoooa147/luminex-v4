/**
 * Unit tests for ipTracking.ts
 */

import { getClientIP, calculateRiskLevel, type IPInfo } from '../ipTracking';

// Mock fetch
global.fetch = jest.fn();

describe('ipTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientIP', () => {
    it('should get IP from x-forwarded-for header', () => {
      const req = {
        headers: {
          get: (key: string) => {
            if (key === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
            return null;
          },
        },
      };

      const ip = getClientIP(req as any);
      expect(ip).toBe('192.168.1.1');
    });

    it('should get IP from x-real-ip header', () => {
      const req = {
        headers: {
          get: (key: string) => {
            if (key === 'x-real-ip') return '192.168.1.1';
            return null;
          },
        },
      };

      const ip = getClientIP(req as any);
      expect(ip).toBe('192.168.1.1');
    });

    it('should get IP from cf-connecting-ip header', () => {
      const req = {
        headers: {
          get: (key: string) => {
            if (key === 'cf-connecting-ip') return '192.168.1.1';
            return null;
          },
        },
      };

      const ip = getClientIP(req as any);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return unknown when no headers present', () => {
      const req = {
        headers: {
          get: (key: string) => null,
        },
      };

      const ip = getClientIP(req as any);
      expect(ip).toBe('unknown');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const req = {
        headers: {
          get: (key: string) => {
            if (key === 'x-forwarded-for') return '192.168.1.1';
            if (key === 'x-real-ip') return '10.0.0.1';
            if (key === 'cf-connecting-ip') return '172.16.0.1';
            return null;
          },
        },
      };

      const ip = getClientIP(req as any);
      expect(ip).toBe('192.168.1.1');
    });

    it('should trim whitespace from IP', () => {
      const req = {
        headers: {
          get: (key: string) => {
            if (key === 'x-real-ip') return '  192.168.1.1  ';
            return null;
          },
        },
      };

      const ip = getClientIP(req as any);
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return high risk for VPN', () => {
      const ipInfo: IPInfo = {
        ip: '1.2.3.4',
        riskLevel: 'low',
        isVPN: true,
        isProxy: false,
        isTor: false,
      };

      expect(calculateRiskLevel(ipInfo)).toBe('high');
    });

    it('should return high risk for proxy', () => {
      const ipInfo: IPInfo = {
        ip: '1.2.3.4',
        riskLevel: 'low',
        isVPN: false,
        isProxy: true,
        isTor: false,
      };

      expect(calculateRiskLevel(ipInfo)).toBe('high');
    });

    it('should return high risk for Tor', () => {
      const ipInfo: IPInfo = {
        ip: '1.2.3.4',
        riskLevel: 'low',
        isVPN: false,
        isProxy: false,
        isTor: true,
      };

      expect(calculateRiskLevel(ipInfo)).toBe('high');
    });

    it('should return medium risk for hosting', () => {
      const ipInfo: IPInfo = {
        ip: '1.2.3.4',
        riskLevel: 'low',
        isVPN: false,
        isProxy: false,
        isTor: false,
        org: 'Amazon Hosting',
      };

      expect(calculateRiskLevel(ipInfo)).toBe('medium');
    });

    it('should return low risk for normal IP', () => {
      const ipInfo: IPInfo = {
        ip: '1.2.3.4',
        riskLevel: 'low',
        isVPN: false,
        isProxy: false,
        isTor: false,
        org: 'Normal ISP',
      };

      expect(calculateRiskLevel(ipInfo)).toBe('low');
    });
  });

  describe('checkIPRisk', () => {
    it('should return low risk for localhost', async () => {
      const { checkIPRisk } = require('../ipTracking');
      const result = await checkIPRisk('127.0.0.1');
      expect(result.riskLevel).toBe('low');
      expect(result.isVPN).toBe(false);
      expect(result.isProxy).toBe(false);
    });

    it('should return low risk for private IPs', async () => {
      const { checkIPRisk } = require('../ipTracking');
      const result = await checkIPRisk('192.168.1.1');
      expect(result.riskLevel).toBe('low');
    });

    it('should return low risk for unknown IP', async () => {
      const { checkIPRisk } = require('../ipTracking');
      const result = await checkIPRisk('unknown');
      expect(result.riskLevel).toBe('low');
    });
  });
});

