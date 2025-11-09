/**
 * Unit tests for AppHeader component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppHeader from '../AppHeader';

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

const mockT = (key: string) => key;

describe('AppHeader', () => {
  const defaultProps = {
    actualAddress: '0x1234567890123456789012345678901234567890',
    userInfo: null,
    formattedBalance: '100.00',
    formattedWldBalance: '50.00',
    isLoadingBalance: false,
    language: 'en',
    showLanguageMenu: false,
    setShowLanguageMenu: jest.fn(),
    setLanguage: jest.fn(),
    t: mockT,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render header with logo and title', () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByText('Luminex Staking')).toBeInTheDocument();
  });

  it('should display user address when available', () => {
    const { container } = render(<AppHeader {...defaultProps} />);
    // The component displays address in format: @0x123456...567890
    // Check if the text contains the address pattern
    const addressPattern = /@0x123456/;
    expect(container.textContent).toMatch(addressPattern);
  });

  it('should display user name when available', () => {
    render(<AppHeader {...defaultProps} userInfo={{ name: 'Test User' }} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should display balance when address is connected', () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByText('100.00 LUX')).toBeInTheDocument();
    expect(screen.getByText('50.00 WLD')).toBeInTheDocument();
  });

  it('should show loading state when balance is loading', () => {
    render(<AppHeader {...defaultProps} isLoadingBalance={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show connect wallet when address is not available', () => {
    render(<AppHeader {...defaultProps} actualAddress={null} />);
    expect(screen.getByText('Connect wallet')).toBeInTheDocument();
  });

  it('should toggle language menu when language button is clicked', () => {
    const setShowLanguageMenu = jest.fn();
    render(<AppHeader {...defaultProps} setShowLanguageMenu={setShowLanguageMenu} />);
    
    const languageButton = screen.getByText('EN EN');
    fireEvent.click(languageButton);
    
    expect(setShowLanguageMenu).toHaveBeenCalledWith(true);
  });

  it('should change language when language option is clicked', () => {
    const setLanguage = jest.fn();
    const setShowLanguageMenu = jest.fn();
    render(
      <AppHeader
        {...defaultProps}
        setLanguage={setLanguage}
        setShowLanguageMenu={setShowLanguageMenu}
        showLanguageMenu={true}
      />
    );
    
    const thaiOption = screen.getByText('ไทย');
    fireEvent.click(thaiOption);
    
    expect(setLanguage).toHaveBeenCalled();
    expect(setShowLanguageMenu).toHaveBeenCalledWith(false);
  });
});

