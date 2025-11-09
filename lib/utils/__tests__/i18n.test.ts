/**
 * Unit tests for i18n utility
 */

import { t } from '../i18n';

describe('i18n', () => {
  describe('t function', () => {
    it('should return translation for Thai language', () => {
      expect(t('open_panel', 'th')).toBe('เปิด MiniKit');
      expect(t('close_panel', 'th')).toBe('ปิด MiniKit');
      expect(t('verify', 'th')).toBe('ยืนยันตัวตน');
    });

    it('should return translation for English language', () => {
      expect(t('open_panel', 'en')).toBe('Open MiniKit');
      expect(t('close_panel', 'en')).toBe('Close MiniKit');
      expect(t('verify', 'en')).toBe('Verify');
    });

    it('should default to Thai language', () => {
      expect(t('open_panel')).toBe('เปิด MiniKit');
      expect(t('close_panel')).toBe('ปิด MiniKit');
    });

    it('should return key if translation not found', () => {
      expect(t('non_existent_key', 'th')).toBe('non_existent_key');
      expect(t('non_existent_key', 'en')).toBe('non_existent_key');
    });

    it('should handle all available keys', () => {
      const keys = [
        'open_panel',
        'close_panel',
        'status_minikit',
        'world_app',
        'scan_qr',
        'logs',
        'result',
        'verify',
        'wallet_auth',
        'gen_ref',
        'pay_confirm',
        'polling',
        'confirmed',
        'not_confirmed',
      ];

      keys.forEach(key => {
        expect(t(key, 'th')).toBeTruthy();
        expect(t(key, 'en')).toBeTruthy();
      });
    });

    it('should return different translations for different languages', () => {
      expect(t('open_panel', 'th')).not.toBe(t('open_panel', 'en'));
      expect(t('verify', 'th')).not.toBe(t('verify', 'en'));
    });
  });
});

