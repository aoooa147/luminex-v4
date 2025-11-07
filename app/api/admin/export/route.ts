import { NextRequest, NextResponse } from 'next/server';
import { readJSON } from '@/lib/game/storage';
import { TREASURY_ADDRESS } from '@/lib/utils/constants';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * Admin Export API
 * Exports all data as JSON
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const format = req.nextUrl.searchParams.get('format') || 'json';
    
    // Get all data
    const referralFileData = readJSON<{
      referralData?: Record<string, any>;
      referralRecords?: Record<string, any>;
      referralCodeMap?: Record<string, string>;
    }>('referrals', {});
    
    const powerFileData = readJSON<{
      userPowers?: Record<string, any>;
      powerDrafts?: Record<string, any>;
    }>('powers', {});
    
    const scores = readJSON<any[]>('scores', []);
    const leaderboards = readJSON<Record<string, Record<string, number>>>('leaderboards', {});
    
    const exportData = {
      exportDate: new Date().toISOString(),
      referrals: referralFileData,
      powers: powerFileData,
      games: {
        scores,
        leaderboards,
      },
    };
    
    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvLines: string[] = [];
      csvLines.push('Type,Address,Data,Timestamp');
      
      // Referrals
      Object.entries(referralFileData.referralRecords || {}).forEach(([address, record]: [string, any]) => {
        csvLines.push(`Referral,${address},${JSON.stringify(record)},${record.timestamp || ''}`);
      });
      
      // Powers
      Object.entries(powerFileData.userPowers || {}).forEach(([userId, power]: [string, any]) => {
        csvLines.push(`Power,${userId},${JSON.stringify(power)},${power.acquiredAt || ''}`);
      });
      
      // Games
      scores.forEach((score: any) => {
        csvLines.push(`Game,${score.address || ''},${score.score || 0},${score.timestamp || score.time || ''}`);
      });
      
      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="luminex-export-${Date.now()}.csv"`,
        },
      });
    }
    
  // JSON format
  logger.info('Data exported', { format, exportDate: exportData.exportDate }, 'admin/export');

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="luminex-export-${Date.now()}.json"`,
    },
  });
}, 'admin/export');

