import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';
import { runTask } from '@/lib/automation/scheduler';

/**
 * Get admin wallet address
 */
function getAdminWalletAddress(): string {
  return process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || process.env.TREASURY_ADDRESS || '';
}

/**
 * Check if user is admin
 */
function isAdmin(userId: string | null): boolean {
  if (!userId) return false;
  const adminAddress = getAdminWalletAddress();
  if (!adminAddress) return false;
  return userId.toLowerCase() === adminAddress.toLowerCase();
}

/**
 * POST /api/admin/tasks
 * Run a scheduled task manually
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');

  if (!isAdmin(userId || '')) {
    return createErrorResponse('Unauthorized: Admin access required', 'UNAUTHORIZED', 403);
  }

  try {
    const body = await req.json();
    const { taskId } = body;

    if (!taskId) {
      return createErrorResponse('Task ID is required', 'INVALID_REQUEST', 400);
    }

    await runTask(taskId);

    logger.success('Task executed manually', { taskId, executedBy: userId }, 'admin/tasks');

    return createSuccessResponse({
      success: true,
      taskId,
      message: 'Task executed successfully',
    });
  } catch (error: any) {
    logger.error('Failed to run task', error, 'admin/tasks');
    return createErrorResponse(
      error.message || 'Failed to run task',
      'INTERNAL_ERROR',
      500
    );
  }
}, 'admin/tasks');

