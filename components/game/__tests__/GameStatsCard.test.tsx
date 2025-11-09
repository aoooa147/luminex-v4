/**
 * Unit tests for GameStatsCard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameStatsCard } from '../GameStatsCard';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('GameStatsCard', () => {
  it('should render with label and value', () => {
    render(<GameStatsCard label="Test Label" value="100" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should render with number value', () => {
    render(<GameStatsCard label="Score" value={1234} />);
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should render with icon', () => {
    render(<GameStatsCard label="Games" value="10" icon="🎮" />);
    expect(screen.getByText('🎮')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
  });

  it('should apply default red color', () => {
    const { container } = render(<GameStatsCard label="Test" value="100" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-tron-red');
  });

  it('should apply cyan color when specified', () => {
    const { container } = render(<GameStatsCard label="Test" value="100" color="cyan" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-tron-cyan');
  });

  it('should apply blue color when specified', () => {
    const { container } = render(<GameStatsCard label="Test" value="100" color="blue" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-tron-blue');
  });

  it('should apply orange color when specified', () => {
    const { container } = render(<GameStatsCard label="Test" value="100" color="orange" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-tron-orange');
  });

  it('should apply purple color when specified', () => {
    const { container } = render(<GameStatsCard label="Test" value="100" color="purple" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-tron-purple');
  });

  it('should apply yellow color when specified', () => {
    const { container } = render(<GameStatsCard label="Test" value="100" color="yellow" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-yellow-400');
  });

  it('should apply custom className', () => {
    const { container } = render(<GameStatsCard label="Test" value="100" className="custom-class" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-class');
  });

  it('should format large numbers with commas', () => {
    render(<GameStatsCard label="Total" value={1234567} />);
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});

