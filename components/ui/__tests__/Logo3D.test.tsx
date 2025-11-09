/**
 * Unit tests for Logo3D component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Logo3D from '../Logo3D';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useMotionValue: jest.fn(() => ({
    set: jest.fn(),
  })),
  useSpring: jest.fn((value) => value),
  useTransform: jest.fn((value) => value),
}));

describe('Logo3D', () => {
  it('should render logo', () => {
    const { container } = render(<Logo3D />);
    expect(container).toBeInTheDocument();
  });

  it('should render with default size', () => {
    const { container } = render(<Logo3D />);
    const logo = container.firstChild as HTMLElement;
    expect(logo).toBeInTheDocument();
  });

  it('should render with custom size', () => {
    const { container } = render(<Logo3D size={200} />);
    const logo = container.firstChild as HTMLElement;
    expect(logo).toBeInTheDocument();
  });

  it('should render with interactive mode', () => {
    const { container } = render(<Logo3D interactive={true} />);
    const logo = container.firstChild as HTMLElement;
    expect(logo).toBeInTheDocument();
  });

  it('should render with non-interactive mode', () => {
    const { container } = render(<Logo3D interactive={false} />);
    const logo = container.firstChild as HTMLElement;
    expect(logo).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    const { container } = render(<Logo3D className="custom-class" />);
    const logo = container.firstChild as HTMLElement;
    expect(logo).toHaveClass('custom-class');
  });

  it('should render L letter', () => {
    render(<Logo3D />);
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('should render LUMINEX text', () => {
    render(<Logo3D />);
    expect(screen.getByText('LUMINEX')).toBeInTheDocument();
  });

  it('should render logo structure', () => {
    const { container } = render(<Logo3D />);
    const logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toBeInTheDocument();
  });
});

