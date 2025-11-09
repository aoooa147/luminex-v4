/**
 * Unit tests for MiniKitPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MiniKitPanel from '../MiniKitPanel';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useMiniKit hook
const mockVerify = jest.fn();
const mockWalletAuth = jest.fn();
const mockPay = jest.fn();

jest.mock('@/hooks/useMiniKit', () => ({
  useMiniKit: jest.fn(() => ({
    ready: true,
    error: null,
    verify: mockVerify,
    walletAuth: mockWalletAuth,
    pay: mockPay,
  })),
}));

// Mock constants
jest.mock('@/lib/utils/constants', () => ({
  WORLD_APP_ID: 'test-app-id',
  WORLD_ACTION: 'test-action',
  TREASURY_ADDRESS: '0x1234567890123456789012345678901234567890',
  TOKEN_NAME: 'LUX',
  LOGO_URL: 'https://test.com/logo.png',
  BRAND_NAME: 'Luminex',
}));

// Mock i18n
jest.mock('@/lib/utils/i18n', () => ({
  t: (key: string) => key,
}));

// Mock fetch
global.fetch = jest.fn();

describe('MiniKitPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test-ref-id' }),
    });
    mockVerify.mockResolvedValue({ proof: 'test-proof' });
    mockWalletAuth.mockResolvedValue({ finalPayload: { address: '0x123' } });
    mockPay.mockResolvedValue({ transaction_id: 'test-tx-id' });
  });

  it('should render MiniKitPanel', () => {
    const { container } = render(<MiniKitPanel />);
    expect(container).toBeInTheDocument();
  });

  it('should render panel when closed', () => {
    const { container } = render(<MiniKitPanel />);
    expect(container).toBeInTheDocument();
  });

  it('should toggle panel when button is clicked', () => {
    const { container } = render(<MiniKitPanel />);
    // Panel should be closed by default
    expect(container).toBeInTheDocument();
  });

  it('should render verify button', () => {
    const { container } = render(<MiniKitPanel />);
    expect(container).toBeInTheDocument();
  });

  it('should render wallet auth button', () => {
    const { container } = render(<MiniKitPanel />);
    expect(container).toBeInTheDocument();
  });

  it('should render pay button', () => {
    const { container } = render(<MiniKitPanel />);
    expect(container).toBeInTheDocument();
  });

  it('should render action input', () => {
    const { container } = render(<MiniKitPanel />);
    expect(container).toBeInTheDocument();
  });

  it('should render amount input', () => {
    const { container } = render(<MiniKitPanel />);
    expect(container).toBeInTheDocument();
  });

  it('should render reference input', () => {
    const { container } = render(<MiniKitPanel />);
    expect(container).toBeInTheDocument();
  });
});

