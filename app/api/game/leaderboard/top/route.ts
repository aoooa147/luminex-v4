import { NextRequest, NextResponse } from 'next/server';
import { readJSON } from '@/lib/game/storage';
import { withErrorHandler, createSuccessResponse } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const period = req.nextUrl.searchParams.get('period') || new Date().toISOString().slice(0, 10);
  const limit = Number(req.nextUrl.searchParams.get('limit') || 20);

  const board = readJSON<Record<string, Record<string, number>>>('leaderboards', {});
  const row = Object.entries(board[period] || {}).map(([address, total]) => ({ address, total }));
  row.sort((a, b) => b.total - a.total);

  logger.debug('Leaderboard fetched', { period, limit, count: row.length }, 'game/leaderboard/top');

  return NextResponse.json({ ok: true, period, top: row.slice(0, limit) });
}, 'game/leaderboard/top');
