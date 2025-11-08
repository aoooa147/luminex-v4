import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/performance/optimizer';
import { getMemoryUsage } from '@/lib/performance/optimizer';
import { createSuccessResponse } from '@/lib/utils/apiHandler';

/**
 * GET /api/system/health
 * Get system health status
 */
export async function GET(req: NextRequest) {
  try {
    const dbHealth = await checkDatabaseHealth();
    const memory = getMemoryUsage();
    
    return createSuccessResponse({
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
  } catch (error: any) {
    return createSuccessResponse({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed',
    });
  }
}

