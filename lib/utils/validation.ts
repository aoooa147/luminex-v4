/**
 * Validation Utilities
 * Common validation functions for API routes
 */

import { ethers } from 'ethers';

/**
 * Validate Ethereum wallet address format
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return ethers.isAddress(address);
}

/**
 * Validate and normalize address (lowercase)
 */
export function normalizeAddress(address: string): string | null {
  if (!isValidAddress(address)) return null;
  return address.toLowerCase();
}

/**
 * Validate referral code format (LUX + 6 hex chars)
 */
export function isValidReferralCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return /^LUX[a-fA-F0-9]{6}$/i.test(code);
}

/**
 * Validate power code
 */
export function isValidPowerCode(code: string): boolean {
  const validCodes = ['spark', 'nova', 'quasar', 'supernova', 'singularity'];
  return validCodes.includes(code.toLowerCase());
}

/**
 * Validate membership tier
 */
export function isValidMembershipTier(tier: string): boolean {
  const validTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  return validTiers.includes(tier.toLowerCase());
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(txHash: string): boolean {
  if (!txHash || typeof txHash !== 'string') return false;
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Validate amount (positive number)
 */
export function isValidAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  return input.slice(0, maxLength).replace(/[<>]/g, '');
}

/**
 * Validate email format (if needed)
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

