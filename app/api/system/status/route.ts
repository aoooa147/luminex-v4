import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, isMaintenanceMode } from '@/lib/admin/systemSettings';
import { createSuccessResponse } from '@/lib/utils/apiHandler';

/**
 * GET /api/system/status
 * Get system status (public endpoint)
 */
export async function GET(req: NextRequest) {
  try {
    const settings = await getSystemSettings();
    
    return createSuccessResponse({
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      broadcastEnabled: settings.broadcastEnabled,
      broadcastMessage: settings.broadcastMessage,
      systemVersion: settings.systemVersion,
      status: settings.maintenanceMode ? 'maintenance' : 'operational',
    });
  } catch (error: any) {
    // Return default operational status on error
    return createSuccessResponse({
      maintenanceMode: false,
      maintenanceMessage: null,
      broadcastEnabled: false,
      broadcastMessage: null,
      systemVersion: '4.0.0',
      status: 'operational',
    });
  }
}

