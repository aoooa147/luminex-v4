/**
 * Unit tests for MembershipTab component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import MembershipTab from '../MembershipTab';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Loader2: () => <div data-testid="loader-icon">Loader2</div>,
}));

// Mock powerConfig
jest.mock('@/lib/utils/powerConfig', () => ({
  POWERS: [
    { code: 'spark', name: 'Spark', priceWLD: '1.0', totalAPY: 15 },
    { code: 'nova', name: 'Nova', priceWLD: '5.0', totalAPY: 25 },
    { code: 'singularity', name: 'Singularity', priceWLD: '10.0', totalAPY: 50 },
  ],
  BASE_APY: 10,
  getPowerByCode: jest.fn((code: string) => {
    if (code === 'spark') return { code: 'spark', name: 'Spark', priceWLD: '1.0', totalAPY: 15 };
    if (code === 'nova') return { code: 'nova', name: 'Nova', priceWLD: '5.0', totalAPY: 25 };
    if (code === 'singularity') return { code: 'singularity', name: 'Singularity', priceWLD: '10.0', totalAPY: 50 };
    return null;
  }),
}));

describe('MembershipTab', () => {
  const mockProps = {
    currentPower: null,
    totalApy: 10,
    isPurchasingPower: false,
    handlePurchasePower: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render membership tab', () => {
    const { container } = render(<MembershipTab {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with current power', () => {
    const { container } = render(
      <MembershipTab
        {...mockProps}
        currentPower={{ code: 'spark', name: 'Spark', totalAPY: 15 }}
        totalApy={15}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('should render membership tab structure', () => {
    const { container } = render(<MembershipTab {...mockProps} />);
    const membershipTab = container.firstChild as HTMLElement;
    expect(membershipTab).toBeInTheDocument();
  });

  it('should render when purchasing power', () => {
    const { container } = render(<MembershipTab {...mockProps} isPurchasingPower={true} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with different total APY', () => {
    const { container } = render(<MembershipTab {...mockProps} totalApy={25} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with nova power', () => {
    const { container } = render(
      <MembershipTab
        {...mockProps}
        currentPower={{ code: 'nova', name: 'Nova', totalAPY: 25 }}
        totalApy={25}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('should render with singularity power', () => {
    const { container } = render(
      <MembershipTab
        {...mockProps}
        currentPower={{ code: 'singularity', name: 'Singularity', totalAPY: 50 }}
        totalApy={50}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('should render without current power', () => {
    const { container } = render(<MembershipTab {...mockProps} currentPower={null} />);
    expect(container).toBeInTheDocument();
  });
});

