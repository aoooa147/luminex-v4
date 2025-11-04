import fs from 'node:fs';
import path from 'node:path';
import type { PowerCode } from '@/lib/utils/powerConfig';

// Check if we're in a serverless environment
const isServerless = () => {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV
  );
};

export type UserPower = {
  userId: string; // wallet address
  code: PowerCode; // Current power level
  txId: string; // Transaction ID from latest purchase/upgrade
  reference: string; // MiniKit reference used for this tx
  acquiredAt: string; // ISO datetime
};

export type PowerDraft = {
  reference: string;
  userId: string;
  targetCode: PowerCode;
  amountWLD: string; // Amount to pay (full or difference)
  createdAt: string;
  status: 'pending' | 'used' | 'cancelled';
};

// In-memory storage for serverless environments
const userPowers: Map<string, UserPower> = new Map(); // userId -> UserPower
const powerDrafts: Map<string, PowerDraft> = new Map(); // reference -> PowerDraft

// File-based storage for local development
const root = process.cwd();
const dir = path.join(root, 'tmp_data');
const powerFile = path.join(dir, 'powers.json');

function ensureDir() {
  if (isServerless()) return;
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e: any) {
    console.warn('[power/storage] Cannot create directory, using in-memory storage:', e?.message);
  }
}

function loadFromFile() {
  if (isServerless()) return;
  ensureDir();
  try {
    if (fs.existsSync(powerFile)) {
      const data = JSON.parse(fs.readFileSync(powerFile, 'utf-8'));
      // Load userPowers
      if (data.userPowers) {
        Object.entries(data.userPowers).forEach(([key, value]) => {
          userPowers.set(key, value as UserPower);
        });
      }
      // Load powerDrafts
      if (data.powerDrafts) {
        Object.entries(data.powerDrafts).forEach(([key, value]) => {
          powerDrafts.set(key, value as PowerDraft);
        });
      }
    }
  } catch (e: any) {
    console.warn('[power/storage] Failed to load from file:', e?.message);
  }
}

function saveToFile() {
  if (isServerless()) return;
  ensureDir();
  try {
    const data = {
      userPowers: Object.fromEntries(userPowers),
      powerDrafts: Object.fromEntries(powerDrafts),
    };
    fs.writeFileSync(powerFile, JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.warn('[power/storage] Failed to save to file:', e?.message);
  }
}

// Initialize on module load
loadFromFile();

export function getUserPower(userId: string): UserPower | null {
  return userPowers.get(userId.toLowerCase()) || null;
}

export function setUserPower(userId: string, code: PowerCode, txId: string, reference: string): UserPower {
  const key = userId.toLowerCase();
  const now = new Date().toISOString();
  
  const userPower: UserPower = {
    userId: key,
    code,
    txId,
    reference,
    acquiredAt: now,
  };
  
  userPowers.set(key, userPower);
  saveToFile();
  return userPower;
}

export function createPowerDraft(reference: string, userId: string, targetCode: PowerCode, amountWLD: string): PowerDraft {
  const draft: PowerDraft = {
    reference,
    userId: userId.toLowerCase(),
    targetCode,
    amountWLD,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  
  powerDrafts.set(reference, draft);
  saveToFile();
  return draft;
}

export function getPowerDraft(reference: string): PowerDraft | null {
  return powerDrafts.get(reference) || null;
}

export function markDraftAsUsed(reference: string): boolean {
  const draft = powerDrafts.get(reference);
  if (!draft) return false;
  
  draft.status = 'used';
  saveToFile();
  return true;
}

export function markDraftAsCancelled(reference: string): boolean {
  const draft = powerDrafts.get(reference);
  if (!draft) return false;
  
  draft.status = 'cancelled';
  saveToFile();
  return true;
}
