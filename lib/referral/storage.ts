import fs from 'node:fs';
import path from 'node:path';

// Check if we're in a serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = () => {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV
  );
};

// In-memory storage for serverless environments
interface ReferralData {
  referrerAddress: string;
  referrals: string[]; // Array of referred user addresses
  totalEarnings: number; // Total LUX earned from referrals
}

interface ReferralRecord {
  newUserAddress: string;
  referrerCode: string;
  referrerAddress: string;
  timestamp: number;
  rewardGiven: boolean;
}

const referralData: Map<string, ReferralData> = new Map(); // address -> ReferralData
const referralRecords: Map<string, ReferralRecord> = new Map(); // newUserAddress -> ReferralRecord
const referralCodeMap: Map<string, string> = new Map(); // referralCode -> address

// File-based storage for local development
const root = process.cwd();
const dir = path.join(root, 'tmp_data');
const referralFile = path.join(dir, 'referrals.json');

function ensureDir() {
  if (isServerless()) return; // Skip in serverless
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e: any) {
    console.warn('[referral/storage] Cannot create directory, using in-memory storage:', e?.message);
  }
}

function loadFromFile() {
  if (isServerless()) return;
  ensureDir();
  try {
    if (fs.existsSync(referralFile)) {
      const data = JSON.parse(fs.readFileSync(referralFile, 'utf-8'));
      // Load referralData
      if (data.referralData) {
        Object.entries(data.referralData).forEach(([key, value]) => {
          referralData.set(key, value as ReferralData);
        });
      }
      // Load referralRecords
      if (data.referralRecords) {
        Object.entries(data.referralRecords).forEach(([key, value]) => {
          referralRecords.set(key, value as ReferralRecord);
        });
      }
      // Load referralCodeMap
      if (data.referralCodeMap) {
        Object.entries(data.referralCodeMap).forEach(([key, value]) => {
          referralCodeMap.set(key, value as string);
        });
      }
    }
  } catch (e: any) {
    console.warn('[referral/storage] Failed to load from file:', e?.message);
  }
}

function saveToFile() {
  if (isServerless()) return;
  ensureDir();
  try {
    const data = {
      referralData: Object.fromEntries(referralData),
      referralRecords: Object.fromEntries(referralRecords),
      referralCodeMap: Object.fromEntries(referralCodeMap),
    };
    fs.writeFileSync(referralFile, JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.warn('[referral/storage] Failed to save to file:', e?.message);
  }
}

// Initialize on module load
loadFromFile();

export function getReferralData(address: string): ReferralData | null {
  return referralData.get(address.toLowerCase()) || null;
}

export function getOrCreateReferralData(address: string): ReferralData {
  const key = address.toLowerCase();
  if (!referralData.has(key)) {
    referralData.set(key, {
      referrerAddress: address,
      referrals: [],
      totalEarnings: 0,
    });
    // Store referral code mapping
    const code = `LUX${address.slice(2, 8).toUpperCase()}`;
    referralCodeMap.set(code, address);
    saveToFile();
  }
  return referralData.get(key)!;
}

export function getReferrerAddressFromCode(referralCode: string): string | null {
  return referralCodeMap.get(referralCode) || null;
}

export function addReferral(referrerAddress: string, newUserAddress: string, reward: number = 50) {
  const referrerKey = referrerAddress.toLowerCase();
  const newUserKey = newUserAddress.toLowerCase();
  
  // Get or create referrer data
  const referrerData = getOrCreateReferralData(referrerAddress);
  
  // Check if already referred
  if (referrerData.referrals.includes(newUserAddress)) {
    return false; // Already referred
  }
  
  // Add referral
  referrerData.referrals.push(newUserAddress);
  referrerData.totalEarnings += reward;
  
  // Save referral record
  referralRecords.set(newUserKey, {
    newUserAddress,
    referrerCode: `LUX${referrerAddress.slice(2, 8).toUpperCase()}`,
    referrerAddress,
    timestamp: Date.now(),
    rewardGiven: true,
  });
  
  saveToFile();
  return true;
}

export function hasBeenReferred(userAddress: string): boolean {
  return referralRecords.has(userAddress.toLowerCase());
}

export function getReferralStats(address: string): { totalReferrals: number; totalEarnings: number } {
  const data = getReferralData(address);
  if (!data) {
    return { totalReferrals: 0, totalEarnings: 0 };
  }
  return {
    totalReferrals: data.referrals.length,
    totalEarnings: data.totalEarnings,
  };
}

export function getReferralRecord(userAddress: string): ReferralRecord | null {
  return referralRecords.get(userAddress.toLowerCase()) || null;
}
