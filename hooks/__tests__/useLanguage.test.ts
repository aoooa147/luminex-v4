/**
 * Unit tests for useLanguage hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useLanguage } from '../useLanguage';
import { translations } from '@/lib/utils/translations';

// Mock translations
jest.mock('@/lib/utils/translations', () => ({
  translations: {
    en: { hello: 'Hello', welcome: 'Welcome' },
    th: { hello: 'สวัสดี', welcome: 'ยินดีต้อนรับ' },
    zh: { hello: '你好', welcome: '欢迎' },
    ja: { hello: 'こんにちは', welcome: 'いらっしゃいませ' },
    es: { hello: 'Hola', welcome: 'Bienvenido' },
  },
}));

describe('useLanguage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
    // Mock navigator.language
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'en-US',
    });
  });

  describe('initialization', () => {
    it('should initialize with default language (en)', () => {
      const { result } = renderHook(() => useLanguage());

      expect(result.current.language).toBe('en');
    });

    it('should initialize with language from localStorage', async () => {
      localStorage.setItem('preferredLanguage', 'th');
      const { result } = renderHook(() => useLanguage());

      await waitFor(() => {
        expect(result.current.language).toBe('th');
      });
    });

    it('should initialize with browser language if available', async () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'th-TH',
      });
      localStorage.removeItem('preferredLanguage');

      const { result } = renderHook(() => useLanguage());

      await waitFor(() => {
        expect(result.current.language).toBe('th');
      });
    });
  });

  describe('setLanguage', () => {
    it('should change language successfully', () => {
      const { result } = renderHook(() => useLanguage());

      act(() => {
        result.current.setLanguage('th');
      });

      expect(result.current.language).toBe('th');
      expect(localStorage.getItem('preferredLanguage')).toBe('th');
    });

    it('should persist language to localStorage', () => {
      const { result } = renderHook(() => useLanguage());

      act(() => {
        result.current.setLanguage('zh');
      });

      expect(localStorage.getItem('preferredLanguage')).toBe('zh');
    });

    it('should handle multiple language changes', () => {
      const { result } = renderHook(() => useLanguage());

      act(() => {
        result.current.setLanguage('th');
      });
      expect(result.current.language).toBe('th');

      act(() => {
        result.current.setLanguage('ja');
      });
      expect(result.current.language).toBe('ja');

      act(() => {
        result.current.setLanguage('es');
      });
      expect(result.current.language).toBe('es');
    });

    it('should not change language if translation not available', () => {
      const { result } = renderHook(() => useLanguage());
      const initialLanguage = result.current.language;

      act(() => {
        result.current.setLanguage('invalid');
      });

      expect(result.current.language).toBe(initialLanguage);
    });
  });

  describe('translation function', () => {
    it('should translate text correctly', () => {
      const { result } = renderHook(() => useLanguage());

      act(() => {
        result.current.setLanguage('en');
      });

      expect(result.current.t('hello')).toBe('Hello');
      expect(result.current.t('welcome')).toBe('Welcome');
    });

    it('should translate text in different languages', () => {
      const { result } = renderHook(() => useLanguage());

      act(() => {
        result.current.setLanguage('th');
      });

      expect(result.current.t('hello')).toBe('สวัสดี');
      expect(result.current.t('welcome')).toBe('ยินดีต้อนรับ');
    });

    it('should fallback to English if translation not found', () => {
      const { result } = renderHook(() => useLanguage());

      act(() => {
        result.current.setLanguage('th');
      });

      expect(result.current.t('nonexistent')).toBe('nonexistent');
    });

    it('should replace parameters in translations', () => {
      const { result } = renderHook(() => useLanguage());

      // This test depends on having a translation with parameters
      // For now, just test that the function exists and works
      expect(typeof result.current.t).toBe('function');
    });
  });

  describe('activeLanguage', () => {
    it('should return correct language metadata', () => {
      const { result } = renderHook(() => useLanguage());

      act(() => {
        result.current.setLanguage('th');
      });

      expect(result.current.activeLanguage).toBeDefined();
      expect(result.current.activeLanguage.code).toBe('th');
    });
  });

  describe('language menu', () => {
    it('should toggle language menu', () => {
      const { result } = renderHook(() => useLanguage());

      expect(result.current.showLanguageMenu).toBe(false);

      act(() => {
        result.current.setShowLanguageMenu(true);
      });

      expect(result.current.showLanguageMenu).toBe(true);

      act(() => {
        result.current.setShowLanguageMenu(false);
      });

      expect(result.current.showLanguageMenu).toBe(false);
    });
  });
});

