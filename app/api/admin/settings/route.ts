import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings, toggleMaintenanceMode, setBroadcastMessage } from '@/lib/admin/systemSettings';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

// Admin wallet address
const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || process.env.TREASURY_ADDRESS || '';

/**
 * Check if user is admin
 */
function isAdmin(userId: string | null): boolean {
  if (!userId || !ADMIN_WALLET_ADDRESS) return false;
  return userId.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase();
}

/**
 * GET /api/admin/settings
 * Get system settings
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');

  if (!isAdmin(userId || '')) {
    return createErrorResponse('Unauthorized: Admin access required', 'UNAUTHORIZED', 403);
  }

  try {
    const settings = await getSystemSettings();
    return createSuccessResponse(settings);
  } catch (error: any) {
    logger.error('Failed to get system settings', error, 'admin/settings');
    return createErrorResponse('Failed to get system settings', 'INTERNAL_ERROR', 500);
  }
}, 'admin/settings');

/**
 * PATCH /api/admin/settings
 * Update system settings
 */
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');

  if (!isAdmin(userId || '')) {
    return createErrorResponse('Unauthorized: Admin access required', 'UNAUTHORIZED', 403);
  }

  try {
    const body = await req.json();
    const { 
      maintenanceMode, 
      maintenanceMessage, 
      broadcastMessage, 
      broadcastEnabled,
      maxConcurrentUsers 
    } = body;

    const updates: any = {};

    if (typeof maintenanceMode === 'boolean') {
      await toggleMaintenanceMode(maintenanceMode, maintenanceMessage, userId || undefined);
      logger.success('Maintenance mode toggled', { 
        maintenanceMode, 
        maintenanceMessage,
        updatedBy: userId 
      }, 'admin/settings');
      const settings = await getSystemSettings();
      return createSuccessResponse(settings);
    }

    if (broadcastMessage !== undefined) {
      await setBroadcastMessage(
        broadcastMessage, 
        broadcastEnabled !== undefined ? broadcastEnabled : true,
        userId || undefined
      );
      logger.success('Broadcast message updated', { 
        broadcastMessage, 
        broadcastEnabled,
        updatedBy: userId 
      }, 'admin/settings');
      const settings = await getSystemSettings();
      return createSuccessResponse(settings);
    }

    if (maxConcurrentUsers !== undefined) {
      updates.maxConcurrentUsers = maxConcurrentUsers;
    }

    if (Object.keys(updates).length > 0) {
      const settings = await updateSystemSettings(updates, userId || undefined);
      return createSuccessResponse(settings);
    }

    return createErrorResponse('No valid updates provided', 'INVALID_REQUEST', 400);
  } catch (error: any) {
    logger.error('Failed to update system settings', error, 'admin/settings');
    return createErrorResponse('Failed to update system settings', 'INTERNAL_ERROR', 500);
  }
}, 'admin/settings');

