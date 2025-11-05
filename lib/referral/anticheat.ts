/**
 * Referral Anti-Cheat System
 * Prevents fraudulent referral activities including:
 * - Same IP self-referrals
 * - Multiple referrals from same IP
 * - Rapid-fire referral attempts
 * - Pattern-based fraud detection
 */

import { readJSON, writeJSON } from '@/lib/game/storage';

export interface ReferralAttempt {
  ip: string;
  referrerAddress: string;
  newUserAddress: string;
  timestamp: number;
  success: boolean;
  reason?: string;
}

export interface IPActivity {
  attempts: ReferralAttempt[];
  lastAttempt: number;
  uniqueAddresses: Set<string>;
  suspiciousCount: number;
  lastSuspiciousTime: number;
}

interface ReferralIPRecord {
  ip: string;
  addresses: string[]; // Addresses that used this IP
  firstSeen: number;
  lastSeen: number;
  referralCount: number;
}

// Configuration
const MIN_TIME_BETWEEN_REFERRALS_MS = 60000; // 1 minute minimum between referrals from same IP
const MAX_REFERRALS_PER_IP_PER_HOUR = 3; // Max 3 referrals per IP per hour
const MAX_REFERRALS_PER_IP_PER_DAY = 10; // Max 10 referrals per IP per day
const SUSPICIOUS_PATTERN_THRESHOLD = 3; // After 3 suspicious attempts, block IP temporarily
const IP_BLOCK_DURATION_MS = 3600000; // 1 hour block after suspicious activity
const MIN_TIME_BETWEEN_SAME_IP_REFERRALS_MS = 300000; // 5 minutes between referrals from same IP (referrer and new user)

class ReferralAntiCheat {
  private ipActivity: Map<string, IPActivity> = new Map();
  private ipRecords: Map<string, ReferralIPRecord> = new Map();
  private blockedIPs: Map<string, number> = new Map(); // IP -> unblock timestamp

  /**
   * Get client IP from request
   */
  getClientIP(req: { headers: Headers | { get: (key: string) => string | null } }): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');

    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }
    if (realIP) return realIP.trim();
    if (cfConnectingIP) return cfConnectingIP.trim();
    return 'unknown';
  }

  /**
   * Check if IP is currently blocked
   */
  isIPBlocked(ip: string): boolean {
    const blockedUntil = this.blockedIPs.get(ip);
    if (!blockedUntil) return false;

    if (Date.now() < blockedUntil) {
      return true; // Still blocked
    }

    // Block expired, remove it
    this.blockedIPs.delete(ip);
    return false;
  }

  /**
   * Block an IP for a specified duration
   */
  blockIP(ip: string, durationMs: number = IP_BLOCK_DURATION_MS): void {
    this.blockedIPs.set(ip, Date.now() + durationMs);
    console.warn(`[referral-anticheat] Blocked IP ${ip} for ${durationMs / 1000 / 60} minutes`);
  }

  /**
   * Record a referral attempt
   */
  recordAttempt(ip: string, referrerAddress: string, newUserAddress: string, success: boolean, reason?: string): void {
    const attempt: ReferralAttempt = {
      ip,
      referrerAddress: referrerAddress.toLowerCase(),
      newUserAddress: newUserAddress.toLowerCase(),
      timestamp: Date.now(),
      success,
      reason,
    };

    // Update IP activity
    if (!this.ipActivity.has(ip)) {
      this.ipActivity.set(ip, {
        attempts: [],
        lastAttempt: 0,
        uniqueAddresses: new Set(),
        suspiciousCount: 0,
        lastSuspiciousTime: 0,
      });
    }

    const activity = this.ipActivity.get(ip)!;
    activity.attempts.push(attempt);
    activity.lastAttempt = Date.now();
    activity.uniqueAddresses.add(referrerAddress.toLowerCase());
    activity.uniqueAddresses.add(newUserAddress.toLowerCase());

    // Keep only recent attempts (last 24 hours)
    const oneDayAgo = Date.now() - 86400000;
    activity.attempts = activity.attempts.filter(a => a.timestamp > oneDayAgo);

    // Update IP record
    if (!this.ipRecords.has(ip)) {
      this.ipRecords.set(ip, {
        ip,
        addresses: [],
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        referralCount: 0,
      });
    }

    const record = this.ipRecords.get(ip)!;
    if (!record.addresses.includes(referrerAddress.toLowerCase())) {
      record.addresses.push(referrerAddress.toLowerCase());
    }
    if (!record.addresses.includes(newUserAddress.toLowerCase())) {
      record.addresses.push(newUserAddress.toLowerCase());
    }
    record.lastSeen = Date.now();
    if (success) {
      record.referralCount++;
    }

    // Persist to file storage
    this.saveToStorage();
  }

  /**
   * Validate referral attempt with comprehensive anti-cheat checks
   */
  validateReferral(
    ip: string,
    referrerAddress: string,
    newUserAddress: string,
    referrerIP?: string // Optional: IP of the referrer (if available)
  ): { valid: boolean; reason?: string; blocked?: boolean } {
    const now = Date.now();
    const referrerLower = referrerAddress.toLowerCase();
    const newUserLower = newUserAddress.toLowerCase();

    // Check 1: IP is blocked
    if (this.isIPBlocked(ip)) {
      return {
        valid: false,
        reason: 'ip_blocked',
        blocked: true,
      };
    }

    // Check 2: Self-referral (already handled in main route, but double-check)
    if (referrerLower === newUserLower) {
      this.recordAttempt(ip, referrerAddress, newUserAddress, false, 'self_referral');
      return {
        valid: false,
        reason: 'self_referral',
        blocked: false,
      };
    }

    // Check 3: Same IP cannot be used for both referrer and new user
    // If referrerIP is provided and matches the current IP, it's suspicious
    if (referrerIP && referrerIP === ip) {
      this.recordAttempt(ip, referrerAddress, newUserAddress, false, 'same_ip_referral');
      
      const activity = this.ipActivity.get(ip);
      if (activity) {
        activity.suspiciousCount++;
        activity.lastSuspiciousTime = now;
        if (activity.suspiciousCount >= SUSPICIOUS_PATTERN_THRESHOLD) {
          this.blockIP(ip);
          return {
            valid: false,
            reason: 'suspicious_pattern',
            blocked: true,
          };
        }
      }

      return {
        valid: false,
        reason: 'same_ip_referral',
        blocked: false,
      };
    }

    // Check 4: Rate limiting - too many referrals from same IP
    const activity = this.ipActivity.get(ip);
    if (activity) {
      // Check per-hour limit
      const oneHourAgo = now - 3600000;
      const recentAttempts = activity.attempts.filter(a => a.timestamp > oneHourAgo && a.success);
      if (recentAttempts.length >= MAX_REFERRALS_PER_IP_PER_HOUR) {
        this.recordAttempt(ip, referrerAddress, newUserAddress, false, 'rate_limit_hour');
        return {
          valid: false,
          reason: 'rate_limit_exceeded',
          blocked: false,
        };
      }

      // Check per-day limit
      const oneDayAgo = now - 86400000;
      const dailyAttempts = activity.attempts.filter(a => a.timestamp > oneDayAgo && a.success);
      if (dailyAttempts.length >= MAX_REFERRALS_PER_IP_PER_DAY) {
        this.recordAttempt(ip, referrerAddress, newUserAddress, false, 'rate_limit_day');
        return {
          valid: false,
          reason: 'rate_limit_exceeded',
          blocked: false,
        };
      }

      // Check minimum time between referrals
      if (activity.lastAttempt > 0) {
        const timeSinceLastAttempt = now - activity.lastAttempt;
        if (timeSinceLastAttempt < MIN_TIME_BETWEEN_REFERRALS_MS) {
          this.recordAttempt(ip, referrerAddress, newUserAddress, false, 'too_soon');
          activity.suspiciousCount++;
          activity.lastSuspiciousTime = now;
          
          if (activity.suspiciousCount >= SUSPICIOUS_PATTERN_THRESHOLD) {
            this.blockIP(ip);
            return {
              valid: false,
              reason: 'suspicious_pattern',
              blocked: true,
            };
          }

          return {
            valid: false,
            reason: 'too_soon',
            blocked: false,
          };
        }
      }
    }

    // Check 5: Pattern detection - too many unique addresses from same IP
    const record = this.ipRecords.get(ip);
    if (record) {
      // If IP has been used by many different addresses in short time, it's suspicious
      const timeSinceFirstSeen = now - record.firstSeen;
      if (timeSinceFirstSeen < 3600000 && record.addresses.length > 5) {
        // More than 5 addresses in less than 1 hour from same IP
        this.recordAttempt(ip, referrerAddress, newUserAddress, false, 'too_many_addresses');
        
        if (activity) {
          activity.suspiciousCount++;
          activity.lastSuspiciousTime = now;
          if (activity.suspiciousCount >= SUSPICIOUS_PATTERN_THRESHOLD) {
            this.blockIP(ip);
            return {
              valid: false,
              reason: 'suspicious_pattern',
              blocked: true,
            };
          }
        }

        return {
          valid: false,
          reason: 'too_many_addresses',
          blocked: false,
        };
      }
    }

    // Check 6: Check if referrer address was recently referred from same IP
    // (Prevents chain referrals from same IP)
    if (activity) {
      const recentReferrals = activity.attempts.filter(
        a => a.timestamp > now - MIN_TIME_BETWEEN_SAME_IP_REFERRALS_MS && a.success
      );
      const recentReferrer = recentReferrals.find(a => a.newUserAddress === referrerLower);
      if (recentReferrer) {
        // This referrer was just referred from the same IP, blocking chain referrals
        this.recordAttempt(ip, referrerAddress, newUserAddress, false, 'chain_referral_same_ip');
        
        activity.suspiciousCount++;
        activity.lastSuspiciousTime = now;
        if (activity.suspiciousCount >= SUSPICIOUS_PATTERN_THRESHOLD) {
          this.blockIP(ip);
          return {
            valid: false,
            reason: 'chain_referral_same_ip',
            blocked: true,
          };
        }

        return {
          valid: false,
          reason: 'chain_referral_same_ip',
          blocked: false,
        };
      }
    }

    // All checks passed
    return { valid: true };
  }

  /**
   * Load data from storage
   */
  loadFromStorage(): void {
    try {
      const ipData = readJSON<Record<string, any>>('referral_anticheat_ips', {});
      const blockedData = readJSON<Record<string, number>>('referral_anticheat_blocked', {});

      // Restore IP records
      Object.entries(ipData).forEach(([ip, data]: [string, any]) => {
        this.ipRecords.set(ip, {
          ip,
          addresses: data.addresses || [],
          firstSeen: data.firstSeen || Date.now(),
          lastSeen: data.lastSeen || Date.now(),
          referralCount: data.referralCount || 0,
        });
      });

      // Restore blocked IPs (only if block hasn't expired)
      const now = Date.now();
      Object.entries(blockedData).forEach(([ip, unblockTime]: [string, number]) => {
        if (unblockTime > now) {
          this.blockedIPs.set(ip, unblockTime);
        }
      });
    } catch (e: any) {
      console.warn('[referral-anticheat] Failed to load from storage:', e?.message);
    }
  }

  /**
   * Save data to storage
   */
  private saveToStorage(): void {
    try {
      const ipData: Record<string, any> = {};
      this.ipRecords.forEach((record, ip) => {
        ipData[ip] = {
          addresses: record.addresses,
          firstSeen: record.firstSeen,
          lastSeen: record.lastSeen,
          referralCount: record.referralCount,
        };
      });

      const blockedData: Record<string, number> = {};
      this.blockedIPs.forEach((unblockTime, ip) => {
        blockedData[ip] = unblockTime;
      });

      writeJSON('referral_anticheat_ips', ipData);
      writeJSON('referral_anticheat_blocked', blockedData);
    } catch (e: any) {
      console.warn('[referral-anticheat] Failed to save to storage:', e?.message);
    }
  }

  /**
   * Get statistics for an IP
   */
  getIPStats(ip: string): {
    totalAttempts: number;
    successfulReferrals: number;
    uniqueAddresses: number;
    suspiciousCount: number;
    isBlocked: boolean;
  } {
    const activity = this.ipActivity.get(ip);
    const record = this.ipRecords.get(ip);
    const isBlocked = this.isIPBlocked(ip);

    return {
      totalAttempts: activity?.attempts.length || 0,
      successfulReferrals: activity?.attempts.filter(a => a.success).length || 0,
      uniqueAddresses: record?.addresses.length || 0,
      suspiciousCount: activity?.suspiciousCount || 0,
      isBlocked,
    };
  }

  /**
   * Reset suspicious count for an IP (admin function)
   */
  resetSuspiciousCount(ip: string): void {
    const activity = this.ipActivity.get(ip);
    if (activity) {
      activity.suspiciousCount = 0;
      activity.lastSuspiciousTime = 0;
    }
    this.blockedIPs.delete(ip);
    this.saveToStorage();
  }
}

// Export singleton instance
export const referralAntiCheat = new ReferralAntiCheat();

// Load data on module initialization
if (typeof window === 'undefined') {
  referralAntiCheat.loadFromStorage();
}
