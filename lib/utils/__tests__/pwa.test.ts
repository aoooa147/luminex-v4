/**
 * Unit tests for PWA utility
 * @jest-environment jsdom
 */

import {
  registerServiceWorker,
  installPWA,
  improveTouchInteractions,
} from '../pwa';

describe('pwa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerServiceWorker', () => {
    it('should register service worker in browser environment', () => {
      const mockUpdate = jest.fn();
      const mockRegister = jest.fn().mockResolvedValue({
        update: mockUpdate,
      });
      
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: mockRegister,
        },
        writable: true,
        configurable: true,
      });

      const mockAddEventListener = jest.spyOn(window, 'addEventListener');
      registerServiceWorker();

      expect(mockAddEventListener).toHaveBeenCalledWith('load', expect.any(Function));
      
      // Get the handler and call it to simulate load event
      const loadCall = mockAddEventListener.mock.calls.find(call => call[0] === 'load');
      if (loadCall && typeof loadCall[1] === 'function') {
        (loadCall[1] as () => void)();
      }

      expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      
      mockAddEventListener.mockRestore();
    });

    it('should not register when serviceWorker is not available', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => registerServiceWorker()).not.toThrow();
    });

    it('should handle service worker registration errors', () => {
      const mockRegister = jest.fn().mockRejectedValue(new Error('Registration failed'));
      
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: mockRegister,
        },
        writable: true,
        configurable: true,
      });

      const mockAddEventListener = jest.spyOn(window, 'addEventListener');
      registerServiceWorker();

      const loadHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'load')?.[1] as () => void;
      if (loadHandler) {
        expect(() => loadHandler()).not.toThrow();
      }

      mockAddEventListener.mockRestore();
    });
  });

  describe('installPWA', () => {
    it('should return true when BeforeInstallPromptEvent is available', async () => {
      (window as any).BeforeInstallPromptEvent = class {};

      const result = await installPWA();

      expect(result).toBe(true);
    });

    it('should return false when BeforeInstallPromptEvent is not available', async () => {
      delete (window as any).BeforeInstallPromptEvent;

      const result = await installPWA();

      expect(result).toBe(false);
    });
  });

  describe('improveTouchInteractions', () => {
    it('should add touch event listener and CSS styles', () => {
      const mockAddEventListener = jest.spyOn(document, 'addEventListener');
      const mockAppendChild = jest.spyOn(document.head, 'appendChild');

      improveTouchInteractions();

      expect(mockAddEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), false);
      expect(mockAppendChild).toHaveBeenCalled();
      
      const styleElement = mockAppendChild.mock.calls[0][0] as HTMLStyleElement;
      expect(styleElement.tagName).toBe('STYLE');
      expect(styleElement.textContent).toContain('min-height: 44px');
      expect(styleElement.textContent).toContain('min-width: 44px');
      expect(styleElement.textContent).toContain('touch-action: manipulation');
      
      mockAddEventListener.mockRestore();
      mockAppendChild.mockRestore();
    });
  });
});
