import { NextRequest, NextResponse } from 'next/server';
import { readJSON } from '@/lib/game/storage';
import { getUserPower, getPowerDraft } from '@/lib/power/storage';
import { getReferralRecord, getReferralData } from '@/lib/referral/storage';
import { TREASURY_ADDRESS } from '@/lib/utils/constants';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

interface Activity {
  id: string;
  type: 'staking' | 'membership' | 'referral' | 'withdrawal' | 'game';
  user: string;
  amount: string;
  time: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  txHash?: string;
  details?: string; // Additional details like pool name, tier name, etc.
}

/**
 * Admin Activity API
 * Returns recent activities from all sources (referrals, powers, games)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
    
    const activities: Activity[] = [];

    // 1. Get Referral Activities
    try {
      const referralFileData = readJSON<{
        referralData?: Record<string, any>;
        referralRecords?: Record<string, any>;
      }>('referrals', {});
      
      const referralRecords = referralFileData.referralRecords || {};
      
      Object.entries(referralRecords).forEach(([newUserAddress, record]: [string, any]) => {
        if (record?.referrerAddress && record?.timestamp) {
          activities.push({
            id: `referral-${newUserAddress}`,
            type: 'referral',
            user: record.referrerAddress,
            amount: 'New referral',
            time: formatTimeAgo(record.timestamp),
            timestamp: record.timestamp,
            status: record.rewardGiven !== false ? 'success' : 'pending',
          });
        }
      });
    } catch (error) {
      logger.warn('Error loading referrals', error, 'admin/activity');
    }

    // 2. Get Power/Membership Activities
    try {
      const powerFileData = readJSON<{
        userPowers?: Record<string, any>;
        powerDrafts?: Record<string, any>;
      }>('powers', {});
      
      const userPowers = powerFileData.userPowers || {};
      const powerDrafts = powerFileData.powerDrafts || {};
      
      // Get power purchases from userPowers
      Object.entries(userPowers).forEach(([userId, userPower]: [string, any]) => {
        if (userPower?.acquiredAt && userPower?.code) {
          const powerNames: Record<string, string> = {
            'spark': 'Spark',
            'nova': 'Nova',
            'quasar': 'Quasar',
            'supernova': 'Supernova',
            'singularity': 'Singularity',
          };
          
          const timestamp = new Date(userPower.acquiredAt).getTime();
          activities.push({
            id: `power-${userId}-${timestamp}`,
            type: 'membership',
            user: userId,
            amount: `${powerNames[userPower.code.toLowerCase()] || userPower.code} Tier`,
            time: formatTimeAgo(timestamp),
            timestamp,
            status: 'success',
            txHash: userPower.txId,
          });
        }
      });
      
      // Get pending power drafts
      Object.entries(powerDrafts).forEach(([reference, draft]: [string, any]) => {
        if (draft?.status === 'pending' && draft?.createdAt) {
          const timestamp = new Date(draft.createdAt).getTime();
          activities.push({
            id: `power-draft-${reference}`,
            type: 'membership',
            user: draft.userId,
            amount: `${draft.targetCode} (Pending)`,
            time: formatTimeAgo(timestamp),
            timestamp,
            status: 'pending',
          });
        }
      });
    } catch (error) {
      logger.warn('Error loading powers', error, 'admin/activity');
    }

    // 3. Get Staking Activities
    try {
      const stakingFileData = readJSON<{
        stakingRecords?: Array<{
          address: string;
          poolId: number;
          amount: string;
          type: 'stake' | 'withdraw' | 'claim';
          txHash?: string;
          timestamp: number;
        }>;
      }>('staking', {});
      
      const stakingRecords = stakingFileData.stakingRecords || [];
      
      stakingRecords.forEach((record: any) => {
        if (record?.address && record?.timestamp) {
          const poolNames: Record<number, string> = {
            0: 'Flexible',
            1: '30 Days',
            2: '90 Days',
            3: '180 Days',
            4: '365 Days',
          };
          
          const poolName = poolNames[record.poolId] || `Pool ${record.poolId}`;
          
          if (record.type === 'stake') {
            activities.push({
              id: `staking-${record.address}-${record.timestamp}`,
              type: 'staking',
              user: record.address,
              amount: `${parseFloat(record.amount || '0').toLocaleString()} LUX`,
              time: formatTimeAgo(record.timestamp),
              timestamp: record.timestamp,
              status: 'success',
              txHash: record.txHash,
            });
          } else if (record.type === 'withdraw') {
            activities.push({
              id: `withdrawal-${record.address}-${record.timestamp}`,
              type: 'withdrawal',
              user: record.address,
              amount: `${parseFloat(record.amount || '0').toLocaleString()} LUX`,
              time: formatTimeAgo(record.timestamp),
              timestamp: record.timestamp,
              status: 'success',
              txHash: record.txHash,
            });
          }
        }
      });
    } catch (error) {
      logger.warn('Error loading staking', error, 'admin/activity');
    }

    // 4. Get Game Activities (from scores)
    try {
      const scores = readJSON<any[]>('scores', []);
      
      // Get recent game scores (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      scores
        .filter((score: any) => {
          const scoreTime = score.timestamp || score.time || 0;
          return scoreTime > thirtyDaysAgo && score.address;
        })
        .forEach((score: any) => {
          const timestamp = score.timestamp || score.time || Date.now();
          activities.push({
            id: `game-${score.address}-${timestamp}`,
            type: 'game',
            user: score.address,
            amount: `Score: ${score.score || 0}`,
            time: formatTimeAgo(timestamp),
            timestamp,
            status: 'success',
          });
        });
    } catch (error) {
      logger.warn('Error loading games', error, 'admin/activity');
    }

  // Sort by timestamp (newest first) and limit
  activities.sort((a, b) => b.timestamp - a.timestamp);
  const limitedActivities = activities.slice(0, limit);

  logger.info('Activities fetched', { count: limitedActivities.length, total: activities.length }, 'admin/activity');

  return createSuccessResponse({
    activities: limitedActivities,
    total: activities.length,
  });
}, 'admin/activity');

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

