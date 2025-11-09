'use client';

import React, { memo } from 'react';
import { Inbox, Coins, TrendingUp, Users, Gamepad2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = memo(({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      <div className="mb-4 text-6xl opacity-50">
        {icon || <Inbox className="w-16 h-16 mx-auto text-yellow-400/50" />}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-white/70 text-sm mb-4 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
});

EmptyState.displayName = 'EmptyState';

// Predefined empty states for common scenarios
interface EmptyStakingStateProps {
  action?: React.ReactNode;
  className?: string;
}

export const EmptyStakingState = memo(({ action, className = '' }: EmptyStakingStateProps = {}) => (
  <EmptyState
    icon={<Coins className="w-16 h-16 mx-auto text-yellow-400/50" />}
    title="No Staking Yet"
    description="Start staking your LUX tokens to earn rewards!"
    action={action}
    className={className}
  />
));

EmptyStakingState.displayName = 'EmptyStakingState';

interface EmptyRewardsStateProps {
  action?: React.ReactNode;
  className?: string;
}

export const EmptyRewardsState = memo(({ action, className }: EmptyRewardsStateProps = {}) => (
  <EmptyState
    icon={<TrendingUp className="w-12 h-12 mx-auto text-green-400/50" />}
    title="No Rewards Yet"
    description="Stake tokens to start earning rewards!"
    action={action}
    className={className}
  />
));

EmptyRewardsState.displayName = 'EmptyRewardsState';

interface EmptyReferralsStateProps {
  action?: React.ReactNode;
  className?: string;
}

export const EmptyReferralsState = memo(({ action, className = '' }: EmptyReferralsStateProps = {}) => (
  <EmptyState
    icon={<Users className="w-16 h-16 mx-auto text-blue-400/50" />}
    title="No Referrals Yet"
    description="Share your referral code with friends to earn rewards!"
    action={action}
    className={className}
  />
));

EmptyReferralsState.displayName = 'EmptyReferralsState';

export const EmptyGamesState = memo(() => (
  <EmptyState
    icon={<Gamepad2 className="w-16 h-16 mx-auto text-purple-400/50" />}
    title="No Games Played"
    description="Play games to earn rewards and climb the leaderboard!"
  />
));

EmptyGamesState.displayName = 'EmptyGamesState';

export const EmptyPowerState = memo(() => (
  <EmptyState
    icon={<Zap className="w-16 h-16 mx-auto text-yellow-400/50" />}
    title="No Power License"
    description="Purchase a Power License to boost your APY!"
  />
));

EmptyPowerState.displayName = 'EmptyPowerState';

