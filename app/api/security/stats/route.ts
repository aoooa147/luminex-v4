import { NextRequest, NextResponse } from 'next/server';
import { getSecurityStats } from '@/lib/security/monitoring';
import { withErrorHandler, createSuccessResponse } from '@/lib/utils/apiHandler';

/**
 * GET /api/security/stats
 * Get security monitoring statistics (admin only)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  // TODO: Add admin authentication check
  // For now, we'll return stats (in production, this should be protected)
  
  const stats = getSecurityStats();
  
  return createSuccessResponse({
    stats,
    timestamp: new Date().toISOString(),
  });
});

