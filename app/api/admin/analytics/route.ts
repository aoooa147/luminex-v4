import { NextRequest, NextResponse } from 'next/server';
import { readJSON } from '@/lib/game/storage';
import { TREASURY_ADDRESS } from '@/lib/utils/constants';

export const runtime = 'nodejs';

/**
 * Admin Analytics API
 * Returns detailed analytics data
 */
export async function GET(req: NextRequest) {
  try {
    // Get stats from storage
    const referralFileData = readJSON<{
      referralData?: Record<string, any>;
      referralRecords?: Record<string, any>;
    }>('referrals', {});
    
    const referralData = referralFileData.referralData || {};
    const referralRecords = referralFileData.referralRecords || {};
    
    const scores = readJSON<any[]>('scores', []);
    const leaderboards = readJSON<Record<string, Record<string, number>>>('leaderboards', {});
    
    const powerFileData = readJSON<{
      userPowers?: Record<string, any>;
      powerDrafts?: Record<string, any>;
    }>('powers', {});
    
    const userPowers = powerFileData.userPowers || {};
    
    // Calculate analytics
    const analytics = {
      users: {
        total: 0,
        active: 0,
        newThisMonth: 0,
      },
      staking: {
        total: 0,
        average: 0,
        pools: {} as Record<number, number>,
      },
      revenue: {
        total: 0,
        thisMonth: 0,
        byPower: {} as Record<string, number>,
      },
      memberships: {
        paid: 0,
        free: 0,
        total: 0,
      },
      referrals: {
        total: 0,
        thisMonth: 0,
        topReferrers: [] as Array<{ address: string; count: number }>,
      },
      games: {
        totalPlays: scores.length,
        uniquePlayers: new Set(scores.map((s: any) => s.address?.toLowerCase()).filter(Boolean)).size,
        averageScore: 0,
      },
    };
    
    // Users
    const allAddresses = new Set<string>();
    Object.values(referralRecords).forEach((record: any) => {
      if (record?.newUserAddress) allAddresses.add(record.newUserAddress.toLowerCase());
      if (record?.referrerAddress) allAddresses.add(record.referrerAddress.toLowerCase());
    });
    Object.keys(referralData).forEach((addr: string) => allAddresses.add(addr.toLowerCase()));
    scores.forEach((score: any) => {
      if (score.address) allAddresses.add(score.address.toLowerCase());
    });
    analytics.users.total = allAddresses.size;
    
    // Active users (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeAddresses = new Set<string>();
    scores.forEach((score: any) => {
      const scoreTime = score.timestamp || score.time || 0;
      if (scoreTime > thirtyDaysAgo && score.address) {
        activeAddresses.add(score.address.toLowerCase());
      }
    });
    analytics.users.active = activeAddresses.size;
    
    // Staking
    let totalStaking = 0;
    Object.values(leaderboards).forEach((period: Record<string, number>) => {
      Object.values(period).forEach((amount: number) => {
        totalStaking += amount || 0;
      });
    });
    analytics.staking.total = totalStaking;
    analytics.staking.average = analytics.users.total > 0 ? totalStaking / analytics.users.total : 0;
    
    // Revenue
    const powerPrices: Record<string, number> = {
      'spark': 1,
      'nova': 5,
      'quasar': 10,
      'supernova': 50,
      'singularity': 200,
    };
    const WLD_TO_USD = 2.5;
    
    Object.values(userPowers).forEach((userPower: any) => {
      if (userPower?.code) {
        const code = userPower.code.toLowerCase();
        const isPaid = userPower.isPaid !== false; // Default to true for backward compatibility
        
        if (isPaid) {
          const priceWLD = powerPrices[code] || 0;
          const revenue = priceWLD * WLD_TO_USD;
          analytics.revenue.total += revenue;
          analytics.revenue.byPower[code] = (analytics.revenue.byPower[code] || 0) + revenue;
          analytics.memberships.paid++;
        } else {
          analytics.memberships.free++;
        }
        analytics.memberships.total++;
      }
    });
    
    // Referrals
    analytics.referrals.total = Object.keys(referralRecords).length;
    
    // Top referrers
    const referrerCounts: Record<string, number> = {};
    Object.values(referralData).forEach((data: any) => {
      if (data?.referrals && Array.isArray(data.referrals)) {
        referrerCounts[data.referrerAddress?.toLowerCase() || ''] = data.referrals.length;
      }
    });
    
    analytics.referrals.topReferrers = Object.entries(referrerCounts)
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Games
    const validScores = scores.filter((s: any) => s.score && typeof s.score === 'number');
    const totalScore = validScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
    analytics.games.averageScore = validScores.length > 0 ? totalScore / validScores.length : 0;
    
    return NextResponse.json({
      success: true,
      analytics,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[admin/analytics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to fetch analytics',
      analytics: null,
    }, { status: 500 });
  }
}

