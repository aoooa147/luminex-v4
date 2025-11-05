import { NextRequest, NextResponse } from 'next/server';
import { readJSON } from '@/lib/game/storage';
import { TREASURY_ADDRESS } from '@/lib/utils/constants';

export const runtime = 'nodejs';

/**
 * Admin Stats API
 * Returns real statistics from storage files
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authorization (optional - can be enhanced with JWT/session)
    const adminAddress = req.headers.get('x-admin-address');
    const expectedAdmin = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || TREASURY_ADDRESS;
    
    // Optional: verify admin (comment out if not needed)
    // if (adminAddress?.toLowerCase() !== expectedAdmin.toLowerCase()) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // 1. Total Users: Count unique addresses from referrals and games
    // Read referral data from file
    const referralFileData = readJSON<{
      referralData?: Record<string, any>;
      referralRecords?: Record<string, any>;
    }>('referrals', {});
    
    const referralData = referralFileData.referralData || {};
    const referralRecords = referralFileData.referralRecords || {};
    
    const scores = readJSON<any[]>('scores', []);
    const leaderboards = readJSON<Record<string, Record<string, number>>>('leaderboards', {});
    
    // Get unique addresses from referrals
    const referralAddresses = new Set<string>();
    Object.values(referralRecords).forEach((record: any) => {
      if (record?.newUserAddress) referralAddresses.add(record.newUserAddress.toLowerCase());
      if (record?.referrerAddress) referralAddresses.add(record.referrerAddress.toLowerCase());
    });
    Object.keys(referralData).forEach((addr: string) => {
      referralAddresses.add(addr.toLowerCase());
    });
    
    // Get unique addresses from games/scores
    const gameAddresses = new Set<string>();
    scores.forEach((score: any) => {
      if (score.address) gameAddresses.add(score.address.toLowerCase());
    });
    Object.keys(leaderboards).forEach((period: string) => {
      Object.keys(leaderboards[period] || {}).forEach((addr: string) => {
        gameAddresses.add(addr.toLowerCase());
      });
    });
    
    // Combine unique addresses
    const allUniqueAddresses = new Set([...referralAddresses, ...gameAddresses]);
    const totalUsers = allUniqueAddresses.size;

    // 2. Total Staking: Sum all staked amounts from leaderboards
    let totalStaking = 0;
    Object.values(leaderboards).forEach((period: Record<string, number>) => {
      Object.values(period).forEach((amount: number) => {
        totalStaking += amount || 0;
      });
    });

    // 3. Total Revenue: Calculate from power license purchases
    let totalRevenue = 0;
    try {
      // Read power data from file storage
      const powerFileData = readJSON<{
        userPowers?: Record<string, any>;
        powerDrafts?: Record<string, any>;
      }>('powers', {});
      
      const userPowers = powerFileData.userPowers || {};
      const powerDrafts = powerFileData.powerDrafts || {};
      
      // Power prices in WLD
      const powerPrices: Record<string, number> = {
        'spark': 1,
        'nova': 5,
        'quasar': 10,
        'supernova': 50,
        'singularity': 200,
      };
      
      const WLD_TO_USD = 2.5; // Approximate conversion rate
      
      // Calculate from user powers
      Object.values(userPowers).forEach((userPower: any) => {
        if (userPower?.code) {
          const priceWLD = powerPrices[userPower.code.toLowerCase()] || 0;
          totalRevenue += priceWLD * WLD_TO_USD;
        }
      });
      
      // Also check power drafts (completed purchases)
      Object.values(powerDrafts).forEach((draft: any) => {
        if (draft?.status === 'used' && draft?.amountWLD) {
          const amountWLD = parseFloat(String(draft.amountWLD)) || 0;
          totalRevenue += amountWLD * WLD_TO_USD;
        }
      });
    } catch (error) {
      console.warn('Error calculating revenue from power licenses:', error);
    }

    // 4. Total Referrals: Count all successful referrals
    // Use referralRecords as primary source (each record = one referral)
    let totalReferrals = 0;
    Object.values(referralRecords).forEach((record: any) => {
      // Count if reward was given (default to true if not specified)
      if (record?.rewardGiven !== false) {
        totalReferrals++;
      }
    });
    
    // If referralRecords is empty, try counting from referralData
    if (totalReferrals === 0) {
      Object.values(referralData).forEach((data: any) => {
        if (data?.referrals && Array.isArray(data.referrals)) {
          totalReferrals += data.referrals.length;
        }
      });
    }

    // Return stats
    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalStaking: Math.round(totalStaking), // Round to avoid decimals
        totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimals
        totalReferrals,
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[admin/stats] Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to fetch admin stats',
      stats: {
        totalUsers: 0,
        totalStaking: 0,
        totalRevenue: 0,
        totalReferrals: 0,
      },
    }, { status: 500 });
  }
}
