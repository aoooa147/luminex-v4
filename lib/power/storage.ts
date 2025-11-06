import fs from 'node:fs';
import path from 'node:path';
import type { PowerCode } from '@/lib/utils/powerConfig';
import { prisma, isDatabaseAvailable } from '@/lib/prisma/client';

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
  txId: string; // Transaction ID from latest purchase/upgrade (or 'free' for free powers)
  reference: string; // MiniKit reference used for this tx (or 'free' for free powers)
  acquiredAt: string; // ISO datetime
  isPaid: boolean; // true = paid purchase, false = free/promotional
};

export type PowerDraft = {
  reference: string;
  userId: string;
  targetCode: PowerCode;
  amountWLD: string; // Amount to pay (full or difference)
  createdAt: string;
  status: 'pending' | 'used' | 'cancelled';
};

// In-memory storage for fallback
const userPowers: Map<string, UserPower> = new Map(); // userId -> UserPower
const powerDrafts: Map<string, PowerDraft> = new Map(); // reference -> PowerDraft

// File-based storage for local development (fallback)
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
      if (data.userPowers) {
        Object.entries(data.userPowers).forEach(([key, value]) => {
          userPowers.set(key, value as UserPower);
        });
      }
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

// Database functions
async function useDatabase(): Promise<boolean> {
  try {
    return await isDatabaseAvailable();
  } catch {
    return false;
  }
}

export async function getUserPower(userId: string): Promise<UserPower | null> {
  const key = userId.toLowerCase();
  
  if (await useDatabase()) {
    try {
      const userPower = await prisma.userPower.findUnique({
        where: { userId: key },
      });
      if (userPower) {
        return {
          userId: userPower.userId,
          code: userPower.code as PowerCode,
          txId: userPower.txId,
          reference: userPower.reference,
          acquiredAt: userPower.acquiredAt.toISOString(),
          isPaid: userPower.isPaid ?? true, // Default to true for backward compatibility
        };
      }
      return null;
    } catch (error) {
      console.warn('[power/storage] Database error, falling back to in-memory:', error);
    }
  }
  
  // Fallback to in-memory
  const power = userPowers.get(key);
  if (power) {
    return {
      ...power,
      isPaid: power.isPaid ?? true, // Default to true for backward compatibility
    };
  }
  return null;
}

export async function setUserPower(userId: string, code: PowerCode, txId: string, reference: string, isPaid: boolean = true): Promise<UserPower> {
  const key = userId.toLowerCase();
  const now = new Date().toISOString();
  
  const userPower: UserPower = {
    userId: key,
    code,
    txId,
    reference,
    acquiredAt: now,
    isPaid,
  };
  
  if (await useDatabase()) {
    try {
      await prisma.userPower.upsert({
        where: { userId: key },
        update: {
          code,
          txId,
          reference,
          acquiredAt: new Date(now),
          isPaid,
        },
        create: {
          userId: key,
          code,
          txId,
          reference,
          acquiredAt: new Date(now),
          isPaid,
        },
      });
      return userPower;
    } catch (error) {
      console.warn('[power/storage] Database error, falling back to in-memory:', error);
    }
  }
  
  // Fallback to in-memory
  userPowers.set(key, userPower);
  saveToFile();
  return userPower;
}

// Function to grant free power (for promotions, referrals, etc.)
export async function grantFreePower(userId: string, code: PowerCode): Promise<UserPower> {
  const reference = `free-${crypto.randomUUID()}`;
  return await setUserPower(userId, code, 'free', reference, false);
}

export async function createPowerDraft(reference: string, userId: string, targetCode: PowerCode, amountWLD: string): Promise<PowerDraft> {
  const draft: PowerDraft = {
    reference,
    userId: userId.toLowerCase(),
    targetCode,
    amountWLD,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  
  if (await useDatabase()) {
    try {
      await prisma.powerDraft.create({
        data: {
          reference,
          userId: userId.toLowerCase(),
          targetCode,
          amountWLD,
          status: 'pending',
        },
      });
      return draft;
    } catch (error) {
      console.warn('[power/storage] Database error, falling back to in-memory:', error);
    }
  }
  
  // Fallback to in-memory
  powerDrafts.set(reference, draft);
  saveToFile();
  return draft;
}

export async function getPowerDraft(reference: string): Promise<PowerDraft | null> {
  if (await useDatabase()) {
    try {
      const draft = await prisma.powerDraft.findUnique({
        where: { reference },
      });
      if (draft) {
        return {
          reference: draft.reference,
          userId: draft.userId,
          targetCode: draft.targetCode as PowerCode,
          amountWLD: draft.amountWLD,
          createdAt: draft.createdAt.toISOString(),
          status: draft.status as 'pending' | 'used' | 'cancelled',
        };
      }
      return null;
    } catch (error) {
      console.warn('[power/storage] Database error, falling back to in-memory:', error);
    }
  }
  
  // Fallback to in-memory
  return powerDrafts.get(reference) || null;
}

export async function markDraftAsUsed(reference: string): Promise<boolean> {
  if (await useDatabase()) {
    try {
      await prisma.powerDraft.update({
        where: { reference },
        data: { status: 'used' },
      });
      return true;
    } catch (error) {
      console.warn('[power/storage] Database error, falling back to in-memory:', error);
    }
  }
  
  // Fallback to in-memory
  const draft = powerDrafts.get(reference);
  if (!draft) return false;
  
  draft.status = 'used';
  saveToFile();
  return true;
}

export async function markDraftAsCancelled(reference: string): Promise<boolean> {
  if (await useDatabase()) {
    try {
      await prisma.powerDraft.update({
        where: { reference },
        data: { status: 'cancelled' },
      });
      return true;
    } catch (error) {
      console.warn('[power/storage] Database error, falling back to in-memory:', error);
    }
  }
  
  // Fallback to in-memory
  const draft = powerDrafts.get(reference);
  if (!draft) return false;
  
  draft.status = 'cancelled';
  saveToFile();
  return true;
}
