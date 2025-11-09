import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth, getMemoryUsage } from '@/lib/performance/optimizer';
import { createSuccessResponse } from '@/lib/utils/apiHandler';

/**
 * GET /api/system/health
 * Get system health status
 * Cached for 15 seconds to reduce load while still being relatively real-time
 */
export async function GET(req: NextRequest) {
  try {
    const dbHealth = await checkDatabaseHealth();
    const memory = getMemoryUsage();
    
    const response = createSuccessResponse({
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealth.healthy,
        latency: dbHealth.latency,
        error: dbHealth.error,
      },
      memory: {
        used: `${(memory.used / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.total / 1024 / 1024).toFixed(2)}MB`,
        percentage: memory.percentage.toFixed(2),
      },
      uptime: process.uptime(),
    });
    
    // Cache health check for 15 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
    
    return response;
  } catch (error: any) {
    const response = createSuccessResponse({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed',
    });
    
    // Cache error response for shorter time
    response.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
    
    return response;
  }
}
