/**
 * Unit tests for GameTab component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import GameTab from '../GameTab';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock next/dynamic
jest.mock('next/dynamic', () => {
  return () => {
    const MockGameLauncherCard = () => <div data-testid="game-launcher-card">Game Launcher Card</div>;
    return MockGameLauncherCard;
  };
});

describe('GameTab', () => {
  it('should render game tab', () => {
    render(<GameTab />);
    expect(screen.getByText('🎮')).toBeInTheDocument();
    expect(screen.getByText('Play & Earn!')).toBeInTheDocument();
  });

  it('should render game description', () => {
    render(<GameTab />);
    expect(screen.getByText('Play games and earn rewards')).toBeInTheDocument();
  });

  it('should render game launcher card', () => {
    render(<GameTab />);
    expect(screen.getByTestId('game-launcher-card')).toBeInTheDocument();
  });

  it('should have correct structure', () => {
    const { container } = render(<GameTab />);
    const gameTab = container.firstChild as HTMLElement;
    expect(gameTab).toBeInTheDocument();
  });
});

