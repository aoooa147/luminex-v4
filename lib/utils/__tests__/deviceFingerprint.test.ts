/**
 * Unit tests for deviceFingerprint utility
 * @jest-environment jsdom
 */

import {
  generateDeviceFingerprint,
  getDeviceFingerprint,
  getDeviceFingerprintMetadata,
  DeviceFingerprint,
} from '../deviceFingerprint';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe('deviceFingerprint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    // Mock navigator properties
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Test)',
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 8,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'deviceMemory', {
      value: 8,
      writable: true,
      configurable: true,
    });

    // Mock screen
    Object.defineProperty(window, 'screen', {
      value: {
        width: 1920,
        height: 1080,
      },
      writable: true,
      configurable: true,
    });

    // Mock Intl.DateTimeFormat
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: jest.fn(() => ({
        timeZone: 'America/New_York',
      })),
    } as any));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate device fingerprint', () => {
      const fingerprint = generateDeviceFingerprint();
      
      expect(fingerprint).toBeDefined();
      expect(fingerprint.userAgent).toBe('Mozilla/5.0 (Test)');
      expect(fingerprint.screenResolution).toBe('1920x1080');
      expect(fingerprint.timezone).toBe('America/New_York');
      expect(fingerprint.language).toBe('en-US');
      expect(fingerprint.platform).toBe('Win32');
      expect(fingerprint.fingerprint).toBeTruthy();
      expect(typeof fingerprint.fingerprint).toBe('string');
    });

    it('should generate unique fingerprints for different devices', () => {
      const fingerprint1 = generateDeviceFingerprint();
      
      // Change device characteristics
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Different)',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'screen', {
        value: { width: 1366, height: 768 },
        writable: true,
        configurable: true,
      });
      
      const fingerprint2 = generateDeviceFingerprint();
      
      expect(fingerprint1.fingerprint).not.toBe(fingerprint2.fingerprint);
    });
  });

  describe('getDeviceFingerprint', () => {
    it('should return cached fingerprint from localStorage', () => {
      const cachedFingerprint = 'cached-fingerprint-123';
      mockLocalStorage.getItem.mockReturnValue(cachedFingerprint);

      const fingerprint = getDeviceFingerprint();

      expect(fingerprint).toBe(cachedFingerprint);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('device_fingerprint');
    });

    it('should generate and cache fingerprint if not cached', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const fingerprint = getDeviceFingerprint();

      expect(fingerprint).toBeTruthy();
      expect(typeof fingerprint).toBe('string');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('device_fingerprint', fingerprint);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'device_fingerprint_data',
        expect.any(String)
      );
    });
  });

  describe('getDeviceFingerprintMetadata', () => {
    it('should return metadata from localStorage', () => {
      const metadata: DeviceFingerprint = {
        fingerprint: 'test-fingerprint',
        userAgent: 'Mozilla/5.0 (Test)',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        language: 'en-US',
        platform: 'Win32',
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(metadata));

      const result = getDeviceFingerprintMetadata();

      expect(result).toEqual(metadata);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('device_fingerprint_data');
    });

    it('should return null if no metadata cached', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = getDeviceFingerprintMetadata();

      expect(result).toBeNull();
    });

    it('should return null on JSON parse error', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = getDeviceFingerprintMetadata();

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});

