/**
 * Unit tests for BottomNav component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomNav from '../BottomNav';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('BottomNav', () => {
  const defaultProps = {
    activeTab: 'staking' as const,
    setActiveTab: jest.fn(),
    isAdmin: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.location
    delete (window as any).location;
    (window as any).location = { assign: jest.fn() };
  });

  it('should render all navigation tabs', () => {
    render(<BottomNav {...defaultProps} />);
    expect(screen.getByText('Staking')).toBeInTheDocument();
    expect(screen.getByText('Power')).toBeInTheDocument();
    expect(screen.getByText('Referral')).toBeInTheDocument();
    expect(screen.getByText('Game')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<BottomNav {...defaultProps} activeTab="staking" />);
    const stakingButton = screen.getByText('Staking').closest('button');
    expect(stakingButton).toHaveClass('text-white');
  });

  it('should call setActiveTab when tab is clicked', () => {
    const setActiveTab = jest.fn();
    render(<BottomNav {...defaultProps} setActiveTab={setActiveTab} />);
    
    const gameTab = screen.getByText('Game');
    fireEvent.click(gameTab);
    
    expect(setActiveTab).toHaveBeenCalledWith('game');
  });

  it('should show admin button when user is admin', () => {
    render(<BottomNav {...defaultProps} isAdmin={true} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should not show admin button when user is not admin', () => {
    render(<BottomNav {...defaultProps} isAdmin={false} />);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('should navigate to admin page when admin button is clicked', () => {
    render(<BottomNav {...defaultProps} isAdmin={true} />);
    
    const adminButton = screen.getByText('Admin');
    fireEvent.click(adminButton);
    
    expect(window.location.assign).toHaveBeenCalledWith('/admin');
  });

  it('should have correct aria labels', () => {
    render(<BottomNav {...defaultProps} />);
    expect(screen.getByLabelText('Staking tab')).toBeInTheDocument();
    expect(screen.getByLabelText('Power/Membership tab')).toBeInTheDocument();
    expect(screen.getByLabelText('Referral tab')).toBeInTheDocument();
    expect(screen.getByLabelText('Game tab')).toBeInTheDocument();
  });
});

