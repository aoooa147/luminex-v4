/**
 * Unit tests for ReferralTab component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ReferralTab from '../ReferralTab';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  UserPlus: () => <div data-testid="user-plus-icon">UserPlus</div>,
  Coins: () => <div data-testid="coins-icon">Coins</div>,
  Share2: () => <div data-testid="share-icon">Share2</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  QrCode: () => <div data-testid="qr-code-icon">QrCode</div>,
}));

// Mock constants
jest.mock('@/lib/utils/constants', () => ({
  TOKEN_NAME: 'LUX',
}));

// Mock analytics
jest.mock('@/lib/utils/analytics', () => ({
  trackReferral: jest.fn(),
}));

describe('ReferralTab', () => {
  const mockProps = {
    safeTotalReferrals: 5,
    safeTotalEarnings: 250,
    safeReferralCode: 'LUX-ABC123',
    referralCode: 'LUX-ABC123',
    copied: false,
    setCopied: jest.fn(),
    setShowQRModal: jest.fn(),
    t: (key: string, params?: Record<string, string | number>) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render referral tab', () => {
    const { container } = render(<ReferralTab {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('should render referral tab structure', () => {
    const { container } = render(<ReferralTab {...mockProps} />);
    const referralTab = container.firstChild as HTMLElement;
    expect(referralTab).toBeInTheDocument();
  });

  it('should render with total referrals', () => {
    const { container } = render(<ReferralTab {...mockProps} safeTotalReferrals={5} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with total earnings', () => {
    const { container } = render(<ReferralTab {...mockProps} safeTotalEarnings={250} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with referral code', () => {
    const { container } = render(<ReferralTab {...mockProps} safeReferralCode="LUX-ABC123" />);
    expect(container).toBeInTheDocument();
  });

  it('should render when copied is true', () => {
    const { container } = render(<ReferralTab {...mockProps} copied={true} />);
    expect(container).toBeInTheDocument();
  });

  it('should render when copied is false', () => {
    const { container } = render(<ReferralTab {...mockProps} copied={false} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with different referral code', () => {
    const { container } = render(<ReferralTab {...mockProps} safeReferralCode="LUX-XYZ789" />);
    expect(container).toBeInTheDocument();
  });

  it('should render with zero referrals', () => {
    const { container } = render(<ReferralTab {...mockProps} safeTotalReferrals={0} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with zero earnings', () => {
    const { container } = render(<ReferralTab {...mockProps} safeTotalEarnings={0} />);
    expect(container).toBeInTheDocument();
  });
});

