/**
 * Unit tests for GameButton component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameButton } from '../GameButton';

describe('GameButton', () => {
  it('should render button with children', () => {
    render(<GameButton>Click Me</GameButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<GameButton onClick={handleClick}>Click Me</GameButton>);
    
    const button = screen.getByText('Click Me');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<GameButton onClick={handleClick} disabled>Click Me</GameButton>);
    
    const button = screen.getByText('Click Me');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply primary variant by default', () => {
    render(<GameButton>Click Me</GameButton>);
    const button = screen.getByText('Click Me').closest('button');
    expect(button).toHaveClass('border-tron-red');
  });

  it('should apply secondary variant', () => {
    render(<GameButton variant="secondary">Click Me</GameButton>);
    const button = screen.getByText('Click Me').closest('button');
    expect(button).toHaveClass('border-tron-blue');
  });

  it('should apply danger variant', () => {
    render(<GameButton variant="danger">Click Me</GameButton>);
    const button = screen.getByText('Click Me').closest('button');
    expect(button).toHaveClass('border-tron-orange');
  });

  it('should apply success variant', () => {
    render(<GameButton variant="success">Click Me</GameButton>);
    const button = screen.getByText('Click Me').closest('button');
    expect(button).toHaveClass('border-tron-purple');
  });

  it('should apply size classes', () => {
    const { rerender } = render(<GameButton size="sm">Small</GameButton>);
    let button = screen.getByText('Small').closest('button');
    expect(button).toHaveClass('px-4', 'py-2', 'text-sm');

    rerender(<GameButton size="md">Medium</GameButton>);
    button = screen.getByText('Medium').closest('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');

    rerender(<GameButton size="lg">Large</GameButton>);
    button = screen.getByText('Large').closest('button');
    expect(button).toHaveClass('px-8', 'py-4', 'text-lg');
  });

  it('should apply custom className', () => {
    render(<GameButton className="custom-class">Click Me</GameButton>);
    const button = screen.getByText('Click Me').closest('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<GameButton disabled>Click Me</GameButton>);
    const button = screen.getByText('Click Me').closest('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });
});

