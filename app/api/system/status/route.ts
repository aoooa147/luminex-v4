import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, isMaintenanceMode } from '@/lib/admin/systemSettings';
import { createSuccessResponse } from '@/lib/utils/apiHandler';

/**
 * GET /api/system/status
 * Get system status (public endpoint)
 * Cached for 30 seconds to reduce database load
 */
export async function GET(req: NextRequest) {
  try {
    const settings = await getSystemSettings();
    
    const response = createSuccessResponse({
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      broadcastEnabled: settings.broadcastEnabled,
      broadcastMessage: settings.broadcastMessage,
      systemVersion: settings.systemVersion,
      status: settings.maintenanceMode ? 'maintenance' : 'operational',
    });
    
    // Add caching headers - cache for 30 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return response;
  } catch (error: any) {
    // Return default operational status on error
    const response = createSuccessResponse({
      maintenanceMode: false,
      maintenanceMessage: null,
      broadcastEnabled: false,
      broadcastMessage: null,
      systemVersion: '4.0.0',
      status: 'operational',
    });
    
    // Cache error response for shorter time
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    
    return response;
  }
}

