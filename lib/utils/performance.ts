/**
 * Performance Optimization Utilities
 * Prevents lag, flickering, and improves smooth animations
 */

// Debounce function to limit function calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function to limit function calls
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Request Animation Frame wrapper for smooth animations
export function raf(callback: () => void): number {
  return requestAnimationFrame(callback);
}

// Cancel Animation Frame wrapper
export function cancelRaf(id: number): void {
  cancelAnimationFrame(id);
}

// Smooth scroll with requestAnimationFrame
export function smoothScrollTo(element: HTMLElement, target: number, duration: number = 300): void {
  const start = element.scrollTop;
  const change = target - start;
  const startTime = performance.now();
  
  function animateScroll(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-in-out)
    const ease = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;
    
    element.scrollTop = start + change * ease;
    
    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }
  
  requestAnimationFrame(animateScroll);
}

// Prevent layout shift by pre-calculating dimensions
export function preventLayoutShift(element: HTMLElement): void {
  if (element) {
    const rect = element.getBoundingClientRect();
    element.style.minHeight = `${rect.height}px`;
    element.style.minWidth = `${rect.width}px`;
  }
}

// Use Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options,
  });
}

// Batch DOM updates
export function batchUpdates(updates: (() => void)[]): void {
  raf(() => {
    updates.forEach(update => update());
  });
}

// Check if device is low-end
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as any).deviceMemory || 4;
  
  return hardwareConcurrency < 4 || deviceMemory < 4;
}

// Reduce animation intensity for low-end devices
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion || isLowEndDevice();
}

// Optimize image loading
export function optimizeImage(img: HTMLImageElement): void {
  if (img) {
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'auto';
  }
}

