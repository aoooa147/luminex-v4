/**
 * Device Fingerprinting System
 * Generates a unique fingerprint for each device to detect multiple accounts
 */

export interface DeviceFingerprint {
  fingerprint: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
}

/**
 * Generate a device fingerprint from browser characteristics
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    throw new Error('Device fingerprinting requires browser environment');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint 🎯', 2, 2);
  }

  const fingerprint: DeviceFingerprint = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    fingerprint: '',
  };

  // Create fingerprint hash
  const fingerprintString = [
    fingerprint.userAgent,
    fingerprint.screenResolution,
    fingerprint.timezone,
    fingerprint.language,
    fingerprint.platform,
    canvas.toDataURL(),
    navigator.hardwareConcurrency?.toString() || '',
    navigator.deviceMemory?.toString() || '',
  ].join('|');

  // Generate hash (simple hash function)
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  fingerprint.fingerprint = Math.abs(hash).toString(36) + btoa(fingerprintString).substring(0, 16);

  return fingerprint;
}

/**
 * Get device fingerprint (cached in localStorage)
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const cached = localStorage.getItem('device_fingerprint');
  if (cached) {
    return cached;
  }

  try {
    const fingerprint = generateDeviceFingerprint();
    localStorage.setItem('device_fingerprint', fingerprint.fingerprint);
    localStorage.setItem('device_fingerprint_data', JSON.stringify(fingerprint));
    return fingerprint.fingerprint;
  } catch (error) {
    console.error('Failed to generate device fingerprint:', error);
    return 'unknown';
  }
}

/**
 * Get device fingerprint metadata
 */
export function getDeviceFingerprintMetadata(): DeviceFingerprint | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const data = localStorage.getItem('device_fingerprint_data');
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to get device fingerprint metadata:', error);
  }

  return null;
}

