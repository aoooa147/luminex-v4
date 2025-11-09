/**
 * Unit tests for GameLauncherCard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import GameLauncherCard from '../GameLauncherCard';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('GameLauncherCard', () => {
  it('should render game launcher card', () => {
    render(<GameLauncherCard />);
    expect(screen.getByText('🎮 Play Games')).toBeInTheDocument();
    expect(screen.getByText(/Play games and earn rewards!/)).toBeInTheDocument();
  });

  it('should render all games', () => {
    render(<GameLauncherCard />);
    expect(screen.getByText('🪙 Coin Flip Challenge')).toBeInTheDocument();
    expect(screen.getByText('🧠 Color Memory Challenge')).toBeInTheDocument();
    expect(screen.getByText('⚡ Speed Reaction')).toBeInTheDocument();
    expect(screen.getByText('🎨 Color Tap')).toBeInTheDocument();
    expect(screen.getByText('📝 Word Builder')).toBeInTheDocument();
    expect(screen.getByText('🧮 Pattern Puzzle')).toBeInTheDocument();
  });

  it('should render game descriptions', () => {
    render(<GameLauncherCard />);
    expect(screen.getByText(/Flip a coin and guess the result!/)).toBeInTheDocument();
    expect(screen.getByText(/Test your memory by matching colors/)).toBeInTheDocument();
    expect(screen.getByText(/React quickly to numbers/)).toBeInTheDocument();
  });

  it('should render play now buttons', () => {
    render(<GameLauncherCard />);
    const playButtons = screen.getAllByText('Play Now');
    expect(playButtons.length).toBe(6); // 6 games
  });

  it('should have correct links for games', () => {
    const { container } = render(<GameLauncherCard />);
    const links = container.querySelectorAll('a');
    const hrefs = Array.from(links).map(link => link.getAttribute('href'));
    expect(hrefs).toContain('/game/coin-flip');
    expect(hrefs).toContain('/game/memory-match');
    expect(hrefs).toContain('/game/number-rush');
    expect(hrefs).toContain('/game/color-tap');
    expect(hrefs).toContain('/game/word-builder');
    expect(hrefs).toContain('/game/math-quiz');
  });

  it('should render game cards with correct structure', () => {
    const { container } = render(<GameLauncherCard />);
    const gameCards = container.querySelectorAll('[class*="rounded-2xl"]');
    expect(gameCards.length).toBeGreaterThan(0);
  });
});

