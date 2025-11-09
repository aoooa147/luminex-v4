/**
 * Unit tests for StakingTab component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import StakingTab from '../StakingTab';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Coins: () => <div data-testid="coins-icon">Coins</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  TrendingDown: () => <div data-testid="trending-down-icon">TrendingDown</div>,
  BarChart3: () => <div data-testid="bar-chart-icon">BarChart3</div>,
  DollarSign: () => <div data-testid="dollar-icon">DollarSign</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Timer: () => <div data-testid="timer-icon">Timer</div>,
  Loader2: () => <div data-testid="loader-icon">Loader2</div>,
  Gift: () => <div data-testid="gift-icon">Gift</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
  Lock: () => <div data-testid="lock-icon">Lock</div>,
  Unlock: () => <div data-testid="unlock-icon">Unlock</div>,
}));

// Mock LoadingSpinner
jest.mock('@/components/common/LoadingStates', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock constants
jest.mock('@/lib/utils/constants', () => ({
  POOLS: [
    { id: 0, name: 'Pool 0', minStake: 0, maxStake: 1000 },
    { id: 1, name: 'Pool 1', minStake: 1000, maxStake: 5000 },
  ],
  TOKEN_NAME: 'LUX',
}));

// Mock powerConfig
jest.mock('@/lib/utils/powerConfig', () => ({
  BASE_APY: 10,
  getPowerBoost: jest.fn(() => 5),
}));

describe('StakingTab', () => {
  const mockProps = {
    selectedPool: 0,
    setSelectedPool: jest.fn(),
    currentPower: null,
    totalApy: 15,
    baseApy: 10,
    powerBoost: 5,
    actualAddress: '0x1234567890123456789012345678901234567890',
    STAKING_CONTRACT_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    formattedStakedAmount: '100.0',
    formattedPendingRewards: '10.0',
    timeElapsed: { days: 0, hours: 1, minutes: 30, seconds: 45 },
    setShowStakeModal: jest.fn(),
    handleClaimInterest: jest.fn(),
    handleWithdrawBalance: jest.fn(),
    setActiveTab: jest.fn(),
    isClaimingInterest: false,
    isWithdrawing: false,
    pendingRewards: 10,
    stakedAmount: 100,
    t: (key: string, params?: Record<string, string | number>) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render staking tab', () => {
    const { container } = render(<StakingTab {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('should render pool selection', () => {
    const { container } = render(<StakingTab {...mockProps} />);
    const poolButtons = container.querySelectorAll('button');
    expect(poolButtons.length).toBeGreaterThan(0);
  });

  it('should render staking tab structure', () => {
    const { container } = render(<StakingTab {...mockProps} />);
    const stakingTab = container.firstChild as HTMLElement;
    expect(stakingTab).toBeInTheDocument();
  });

  it('should render with current power', () => {
    const { container } = render(
      <StakingTab
        {...mockProps}
        currentPower={{ code: 'spark', name: 'Spark', totalAPY: 15 }}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('should render with selected pool', () => {
    const { container } = render(<StakingTab {...mockProps} selectedPool={1} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with staked amount', () => {
    const { container } = render(<StakingTab {...mockProps} stakedAmount={100} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with pending rewards', () => {
    const { container } = render(<StakingTab {...mockProps} pendingRewards={10} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with time elapsed', () => {
    const { container } = render(
      <StakingTab
        {...mockProps}
        timeElapsed={{ days: 1, hours: 2, minutes: 30, seconds: 45 }}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('should render when claiming interest', () => {
    const { container } = render(<StakingTab {...mockProps} isClaimingInterest={true} />);
    expect(container).toBeInTheDocument();
  });

  it('should render when withdrawing', () => {
    const { container } = render(<StakingTab {...mockProps} isWithdrawing={true} />);
    expect(container).toBeInTheDocument();
  });
});

