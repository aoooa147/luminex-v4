import { prisma, isDatabaseAvailable } from '@/lib/prisma/client';
import { getCache, setCache, deleteCache } from '@/lib/cache/redis';

export interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  broadcastMessage: string | null;
  broadcastEnabled: boolean;
  maxConcurrentUsers: number;
  systemVersion: string;
  lastMaintenance: Date | null;
  updatedAt: Date;
  updatedBy: string | null;
}

// In-memory fallback settings
const defaultSettings: SystemSettings = {
  id: 'main',
  maintenanceMode: false,
  maintenanceMessage: null,
  broadcastMessage: null,
  broadcastEnabled: false,
  maxConcurrentUsers: 100000,
  systemVersion: '4.0.0',
  lastMaintenance: null,
  updatedAt: new Date(),
  updatedBy: null,
};

const CACHE_KEY = 'system:settings';
const CACHE_TTL = 30; // 30 seconds

/**
 * Get system settings (with caching)
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  // Try cache first
  const cached = await getCache<SystemSettings>(CACHE_KEY, { ttl: CACHE_TTL });
  if (cached) {
    return cached;
  }

  // Check database availability
  if (await isDatabaseAvailable()) {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { id: 'main' },
      });

      if (settings) {
        const result = settings as SystemSettings;
        // Cache the result
        await setCache(CACHE_KEY, result, { ttl: CACHE_TTL });
        return result;
      }

      // Create default settings if not exists
      const newSettings = await prisma.systemSettings.create({
        data: defaultSettings,
      });
      const result = newSettings as SystemSettings;
      // Cache the result
      await setCache(CACHE_KEY, result, { ttl: CACHE_TTL });
      return result;
    } catch (error) {
      console.warn('[systemSettings] Database error, using default:', error);
    }
  }

  // Return default settings
  return defaultSettings;
}

/**
 * Update system settings (admin only)
 */
export async function updateSystemSettings(
  updates: Partial<Omit<SystemSettings, 'id' | 'updatedAt'>>,
  updatedBy?: string
): Promise<SystemSettings> {
  // Check database availability
  if (await isDatabaseAvailable()) {
    try {
      const settings = await prisma.systemSettings.upsert({
        where: { id: 'main' },
        update: {
          ...updates,
          updatedBy: updatedBy || null,
          updatedAt: new Date(),
        },
        create: {
          id: 'main',
          ...defaultSettings,
          ...updates,
          updatedBy: updatedBy || null,
        },
      });

      // Invalidate cache
      await deleteCache(CACHE_KEY);

      return settings as SystemSettings;
    } catch (error) {
      console.error('[systemSettings] Failed to update settings:', error);
      throw error;
    }
  }

  // In-memory fallback (not persisted)
  console.warn('[systemSettings] Database not available, using in-memory fallback');
  return { ...defaultSettings, ...updates, updatedBy: updatedBy || null };
}

/**
 * Check if system is in maintenance mode
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.maintenanceMode;
}

/**
 * Get maintenance message
 */
export async function getMaintenanceMessage(): Promise<string | null> {
  const settings = await getSystemSettings();
  return settings.maintenanceMessage;
}

/**
 * Toggle maintenance mode
 */
export async function toggleMaintenanceMode(
  enabled: boolean,
  message?: string,
  updatedBy?: string
): Promise<SystemSettings> {
  return await updateSystemSettings(
    {
      maintenanceMode: enabled,
      maintenanceMessage: message || null,
      lastMaintenance: enabled ? new Date() : null,
    },
    updatedBy
  );
}

/**
 * Set broadcast message
 */
export async function setBroadcastMessage(
  message: string | null,
  enabled: boolean = true,
  updatedBy?: string
): Promise<SystemSettings> {
  return await updateSystemSettings(
    {
      broadcastMessage: message,
      broadcastEnabled: enabled && !!message,
    },
    updatedBy
  );
}

/**
 * Invalidate settings cache (call after updates)
 */
export async function invalidateSettingsCache(): Promise<void> {
  await deleteCache(CACHE_KEY);
}

