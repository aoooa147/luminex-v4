/**
 * Unit tests for performance utility
 */

import {
  debounce,
  throttle,
  raf,
  cancelRaf,
  smoothScrollTo,
  preventLayoutShift,
  createIntersectionObserver,
  batchUpdates,
  isLowEndDevice,
  shouldReduceMotion,
  optimizeImage,
} from '../performance';

describe('performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should call function with correct arguments', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2');

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should reset timer on each call', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn();
      jest.advanceTimersByTime(50);

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);

      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should call function with correct arguments', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('arg1', 'arg2');

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('raf', () => {
    it('should call requestAnimationFrame', () => {
      const mockCallback = jest.fn();
      const mockRaf = jest.fn((cb) => setTimeout(cb, 16));
      
      global.requestAnimationFrame = mockRaf;

      raf(mockCallback);

      expect(mockRaf).toHaveBeenCalledWith(mockCallback);
    });
  });

  describe('cancelRaf', () => {
    it('should call cancelAnimationFrame', () => {
      const mockCancelRaf = jest.fn();
      global.cancelAnimationFrame = mockCancelRaf;

      cancelRaf(123);

      expect(mockCancelRaf).toHaveBeenCalledWith(123);
    });
  });

  describe('smoothScrollTo', () => {
    it('should scroll element smoothly', () => {
      const mockElement = {
        scrollTop: 0,
        getBoundingClientRect: jest.fn(),
      } as any;

      let callCount = 0;
      const mockRaf = jest.fn((cb: (time: number) => void) => {
        callCount++;
        if (callCount < 10) {
          // Simulate animation loop
          setTimeout(() => cb(1000 + callCount * 16), 0);
        }
        return callCount;
      });
      global.requestAnimationFrame = mockRaf;
      
      const mockNow = jest.fn(() => 1000);
      global.performance = {
        now: mockNow,
      } as any;

      smoothScrollTo(mockElement, 100, 300);

      expect(mockRaf).toHaveBeenCalled();
    });
  });

  describe('preventLayoutShift', () => {
    it('should set minHeight and minWidth on element', () => {
      const mockElement = {
        getBoundingClientRect: jest.fn(() => ({
          height: 100,
          width: 200,
        })),
        style: {},
      } as any;

      preventLayoutShift(mockElement);

      expect(mockElement.style.minHeight).toBe('100px');
      expect(mockElement.style.minWidth).toBe('200px');
    });

    it('should handle null element', () => {
      expect(() => preventLayoutShift(null as any)).not.toThrow();
    });
  });

  describe('createIntersectionObserver', () => {
    it('should create IntersectionObserver with default options', () => {
      const mockCallback = jest.fn();
      const mockObserver = {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };

      global.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver) as any;

      const observer = createIntersectionObserver(mockCallback);

      expect(global.IntersectionObserver).toHaveBeenCalledWith(mockCallback, {
        rootMargin: '50px',
        threshold: 0.01,
      });
      expect(observer).toBe(mockObserver);
    });

    it('should create IntersectionObserver with custom options', () => {
      const mockCallback = jest.fn();
      const customOptions = { rootMargin: '100px', threshold: 0.5 };
      const mockObserver = {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };

      global.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver) as any;

      const observer = createIntersectionObserver(mockCallback, customOptions);

      expect(global.IntersectionObserver).toHaveBeenCalledWith(mockCallback, customOptions);
      expect(observer).toBe(mockObserver);
    });
  });

  describe('batchUpdates', () => {
    it('should batch updates using requestAnimationFrame', () => {
      const mockUpdate1 = jest.fn();
      const mockUpdate2 = jest.fn();
      const mockUpdate3 = jest.fn();

      const mockRaf = jest.fn((cb) => {
        cb();
        return 1;
      });
      global.requestAnimationFrame = mockRaf;

      batchUpdates([mockUpdate1, mockUpdate2, mockUpdate3]);

      expect(mockRaf).toHaveBeenCalled();
      expect(mockUpdate1).toHaveBeenCalled();
      expect(mockUpdate2).toHaveBeenCalled();
      expect(mockUpdate3).toHaveBeenCalled();
    });
  });

  describe('isLowEndDevice', () => {
    it('should return true for low-end device', () => {
      const mockNavigator = {
        hardwareConcurrency: 2,
        deviceMemory: 2,
      };
      Object.defineProperty(global, 'window', {
        value: { navigator: mockNavigator },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      expect(isLowEndDevice()).toBe(true);
    });

    it('should return false for high-end device', () => {
      const mockNavigator = {
        hardwareConcurrency: 8,
        deviceMemory: 8,
      };
      Object.defineProperty(global, 'window', {
        value: { navigator: mockNavigator },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      expect(isLowEndDevice()).toBe(false);
    });

    it('should return false in non-browser environment', () => {
      delete (global as any).window;

      expect(isLowEndDevice()).toBe(false);
    });
  });

  describe('shouldReduceMotion', () => {
    it('should return true if prefers reduced motion', () => {
      const mockMatchMedia = jest.fn(() => ({
        matches: true,
      }));
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: mockMatchMedia,
          navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
        },
        writable: true,
        configurable: true,
      });

      expect(shouldReduceMotion()).toBe(true);
    });

    it('should return true for low-end device', () => {
      const mockMatchMedia = jest.fn(() => ({
        matches: false,
      }));
      const mockNavigator = {
        hardwareConcurrency: 2,
        deviceMemory: 2,
      };
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: mockMatchMedia,
          navigator: mockNavigator,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      expect(shouldReduceMotion()).toBe(true);
    });

    it('should return false in non-browser environment', () => {
      delete (global as any).window;

      expect(shouldReduceMotion()).toBe(false);
    });
  });

  describe('optimizeImage', () => {
    it('should set image optimization properties', () => {
      const mockImage = {
        loading: '',
        decoding: '',
        fetchPriority: '',
      } as any;

      optimizeImage(mockImage);

      expect(mockImage.loading).toBe('lazy');
      expect(mockImage.decoding).toBe('async');
      expect(mockImage.fetchPriority).toBe('auto');
    });

    it('should handle null image', () => {
      expect(() => optimizeImage(null as any)).not.toThrow();
    });
  });
});

