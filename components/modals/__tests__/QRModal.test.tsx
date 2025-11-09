/**
 * Unit tests for QRModal component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QRModal from '../QRModal';

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
  Copy: () => <div data-testid="copy-icon">Copy</div>,
}));

// Mock react-qr-code
jest.mock('react-qr-code', () => {
  return function QRCodeSVG({ value }: { value: string }) {
    return <div data-testid="qr-code">{value}</div>;
  };
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://test.example.com',
  },
  writable: true,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

describe('QRModal', () => {
  const mockProps = {
    showQRModal: true,
    setShowQRModal: jest.fn(),
    safeReferralCode: 'LUX-ABC123',
    showToast: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_WORLD_APP_ID = 'test-app-id';
  });

  it('should render modal when showQRModal is true', () => {
    render(<QRModal {...mockProps} />);
    expect(screen.getByText('QR Code')).toBeInTheDocument();
  });

  it('should not render modal when showQRModal is false', () => {
    render(<QRModal {...mockProps} showQRModal={false} />);
    expect(screen.queryByText('QR Code')).not.toBeInTheDocument();
  });

  it('should render referral code', () => {
    render(<QRModal {...mockProps} />);
    expect(screen.getByText('LUX-ABC123')).toBeInTheDocument();
  });

  it('should render QR code with correct value', () => {
    render(<QRModal {...mockProps} />);
    const qrCode = screen.getByTestId('qr-code');
    expect(qrCode).toBeInTheDocument();
    expect(qrCode.textContent).toContain('/invite?ref=LUX-ABC123');
  });

  it('should call setShowQRModal when close button is clicked', () => {
    render(<QRModal {...mockProps} />);
    const closeButton = screen.getByLabelText('Close QR code modal');
    fireEvent.click(closeButton);
    expect(mockProps.setShowQRModal).toHaveBeenCalledWith(false);
  });

  it('should call setShowQRModal when backdrop is clicked', () => {
    render(<QRModal {...mockProps} />);
    const backdrop = screen.getByText('QR Code').closest('.fixed');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockProps.setShowQRModal).toHaveBeenCalledWith(false);
    }
  });

  it('should copy link and show toast when Copy Link button is clicked', async () => {
    render(<QRModal {...mockProps} />);
    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(mockProps.showToast).toHaveBeenCalledWith('Link copied to clipboard!', 'success');
  });

  it('should render scan message', () => {
    render(<QRModal {...mockProps} />);
    expect(screen.getByText('Scan this QR code to join Luminex!')).toBeInTheDocument();
  });

  it('should not render QR code when safeReferralCode is empty', () => {
    render(<QRModal {...mockProps} safeReferralCode="" />);
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  it('should not close modal when modal content is clicked', () => {
    render(<QRModal {...mockProps} />);
    const modalContent = screen.getByText('QR Code').closest('.bg-gradient-to-br');
    if (modalContent) {
      fireEvent.click(modalContent);
      // Should not call setShowQRModal because of stopPropagation
      expect(mockProps.setShowQRModal).not.toHaveBeenCalled();
    }
  });
});

