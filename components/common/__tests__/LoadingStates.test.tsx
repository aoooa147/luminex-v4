import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingSkeleton, SuspenseBoundary } from '../LoadingStates';

describe('LoadingStates Components', () => {
  describe('LoadingSpinner', () => {
    it('should render with default size', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render with text', () => {
      render(<LoadingSpinner text="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { container, rerender } = render(<LoadingSpinner size="sm" />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();

      rerender(<LoadingSpinner size="md" />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();

      rerender(<LoadingSpinner size="lg" />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('LoadingSkeleton', () => {
    it('should render single skeleton by default', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(1);
    });

    it('should render multiple skeletons', () => {
      const { container } = render(<LoadingSkeleton count={3} />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(3);
    });

    it('should apply custom className', () => {
      const { container } = render(<LoadingSkeleton className="custom-class" />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toHaveClass('custom-class');
    });
  });

  describe('SuspenseBoundary', () => {
    it('should render children', () => {
      render(
        <SuspenseBoundary>
          <div>Test Content</div>
        </SuspenseBoundary>
      );
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should use custom fallback', () => {
      render(
        <SuspenseBoundary fallback={<div>Custom Loading</div>}>
          <div>Test Content</div>
        </SuspenseBoundary>
      );
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });
});

