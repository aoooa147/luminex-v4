/**
 * Unit tests for StakeModal component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StakeModal from '../StakeModal';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loader2</div>,
}));

// Mock constants
jest.mock('@/lib/utils/constants', () => ({
  TOKEN_NAME: 'LUX',
}));

describe('StakeModal', () => {
  const mockProps = {
    showStakeModal: true,
    setShowStakeModal: jest.fn(),
    isShowInput: true,
    setIsShowInput: jest.fn(),
    stakeAmount: '100',
    setStakeAmount: jest.fn(),
    balance: 1000,
    isStaking: false,
    handleStake: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when showStakeModal is true', () => {
    render(<StakeModal {...mockProps} />);
    expect(screen.getByText('Stake LUX')).toBeInTheDocument();
  });

  it('should not render modal when showStakeModal is false', () => {
    render(<StakeModal {...mockProps} showStakeModal={false} />);
    expect(screen.queryByText('Stake LUX')).not.toBeInTheDocument();
  });

  it('should render input when isShowInput is true', () => {
    render(<StakeModal {...mockProps} isShowInput={true} />);
    const input = screen.getByPlaceholderText('0.00');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(100);
  });

  it('should not render input when isShowInput is false', () => {
    render(<StakeModal {...mockProps} isShowInput={false} />);
    expect(screen.queryByPlaceholderText('0.00')).not.toBeInTheDocument();
  });

  it('should call setStakeAmount when input changes', () => {
    render(<StakeModal {...mockProps} />);
    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '200' } });
    expect(mockProps.setStakeAmount).toHaveBeenCalledWith('200');
  });

  it('should call setStakeAmount with balance when MAX button is clicked', () => {
    render(<StakeModal {...mockProps} />);
    const maxButton = screen.getByText('MAX');
    fireEvent.click(maxButton);
    expect(mockProps.setStakeAmount).toHaveBeenCalledWith('1000');
  });

  it('should call handleStake when Confirm Stake button is clicked', () => {
    render(<StakeModal {...mockProps} />);
    const confirmButton = screen.getByText('Confirm Stake');
    fireEvent.click(confirmButton);
    expect(mockProps.handleStake).toHaveBeenCalled();
  });

  it('should call setShowStakeModal and setIsShowInput when Cancel button is clicked', () => {
    render(<StakeModal {...mockProps} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockProps.setShowStakeModal).toHaveBeenCalledWith(false);
    expect(mockProps.setIsShowInput).toHaveBeenCalledWith(false);
  });

  it('should show loading state when isStaking is true', () => {
    render(<StakeModal {...mockProps} isStaking={true} />);
    expect(screen.getByText('Staking...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('should disable Confirm Stake button when isStaking is true', () => {
    render(<StakeModal {...mockProps} isStaking={true} />);
    const confirmButton = screen.getByText('Staking...').closest('button');
    expect(confirmButton).toBeDisabled();
  });

  it('should close modal when backdrop is clicked', () => {
    render(<StakeModal {...mockProps} />);
    const backdrop = screen.getByText('Stake LUX').closest('.fixed');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockProps.setShowStakeModal).toHaveBeenCalledWith(false);
      expect(mockProps.setIsShowInput).toHaveBeenCalledWith(false);
    }
  });

  it('should not close modal when modal content is clicked', () => {
    render(<StakeModal {...mockProps} />);
    const modalContent = screen.getByText('Stake LUX').closest('.bg-gradient-to-br');
    if (modalContent) {
      fireEvent.click(modalContent);
      // Should not call setShowStakeModal because of stopPropagation
      expect(mockProps.setShowStakeModal).not.toHaveBeenCalled();
    }
  });
});

