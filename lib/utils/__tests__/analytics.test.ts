/**
 * Unit tests for analytics utility
 * @jest-environment jsdom
 */

describe('analytics', () => {
  let mockGtag: jest.Mock;
  let mockDataLayer: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Set environment variable
    process.env.NEXT_PUBLIC_GA_ID = 'test-ga-id';
    
    mockGtag = jest.fn();
    mockDataLayer = [];
    
    // Mock window.gtag and dataLayer
    (window as any).gtag = mockGtag;
    (window as any).dataLayer = mockDataLayer;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_GA_ID;
    delete (window as any).gtag;
    delete (window as any).dataLayer;
    jest.resetModules();
  });

  describe('initGA', () => {
    it('should initialize Google Analytics when GA_TRACKING_ID is set', () => {
      const { initGA } = require('../analytics');
      initGA();

      expect((window as any).dataLayer).toBeDefined();
      expect((window as any).gtag).toBeDefined();
    });

    it('should create and append script element', () => {
      const { initGA } = require('../analytics');
      const mockAppendChild = jest.spyOn(document.head, 'appendChild');
      const mockCreateElement = jest.spyOn(document, 'createElement');

      initGA();

      expect(mockCreateElement).toHaveBeenCalledWith('script');
      expect(mockAppendChild).toHaveBeenCalled();
      
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
    });
  });

  describe('trackPageView', () => {
    it('should track page view', () => {
      const { trackPageView } = require('../analytics');
      trackPageView('/test-page');

      expect(mockGtag).toHaveBeenCalledWith('config', 'test-ga-id', {
        page_path: '/test-page',
      });
    });
  });

  describe('trackEvent', () => {
    it('should track event with category and label', () => {
      const { trackEvent } = require('../analytics');
      trackEvent('click', 'button', 'submit', 100);

      expect(mockGtag).toHaveBeenCalledWith('event', 'click', {
        event_category: 'button',
        event_label: 'submit',
        value: 100,
      });
    });

    it('should track event without label and value', () => {
      const { trackEvent } = require('../analytics');
      trackEvent('click', 'button');

      expect(mockGtag).toHaveBeenCalledWith('event', 'click', {
        event_category: 'button',
        event_label: undefined,
        value: undefined,
      });
    });
  });

  describe('trackCustomEvent', () => {
    it('should track custom event with params', () => {
      const { trackCustomEvent } = require('../analytics');
      trackCustomEvent('custom_event', { param1: 'value1', param2: 'value2' });

      expect(mockGtag).toHaveBeenCalledWith('event', 'custom_event', {
        param1: 'value1',
        param2: 'value2',
      });
    });

    it('should track custom event without params', () => {
      const { trackCustomEvent } = require('../analytics');
      trackCustomEvent('custom_event');

      expect(mockGtag).toHaveBeenCalledWith('event', 'custom_event', undefined);
    });
  });

  describe('trackUserAction', () => {
    it('should track user action', () => {
      const { trackUserAction } = require('../analytics');
      trackUserAction('button_click', { button_id: 'submit' });

      expect(mockGtag).toHaveBeenCalledWith('event', 'button_click', {
        button_id: 'submit',
        event_category: 'user_action',
      });
    });
  });

  describe('trackWalletConnect', () => {
    it('should track wallet connection', () => {
      const { trackWalletConnect } = require('../analytics');
      trackWalletConnect('0x123');

      expect(mockGtag).toHaveBeenCalledWith('event', 'wallet_connect', {
        event_category: 'wallet',
        event_label: '0x123',
        value: undefined,
      });
    });
  });

  describe('trackStaking', () => {
    it('should track staking action', () => {
      const { trackStaking } = require('../analytics');
      trackStaking('stake', 100, 1);

      expect(mockGtag).toHaveBeenCalledWith('event', 'stake', {
        event_category: 'staking',
        event_label: 'pool_1',
        value: 100,
      });
    });

    it('should track withdraw action', () => {
      const { trackStaking } = require('../analytics');
      trackStaking('withdraw', 50, 2);

      expect(mockGtag).toHaveBeenCalledWith('event', 'withdraw', {
        event_category: 'staking',
        event_label: 'pool_2',
        value: 50,
      });
    });
  });

  describe('trackPowerPurchase', () => {
    it('should track power purchase', () => {
      const { trackPowerPurchase } = require('../analytics');
      trackPowerPurchase('spark', 10);

      expect(mockGtag).toHaveBeenCalledWith('event', 'power_purchase', {
        event_category: 'membership',
        event_label: 'spark',
        value: 10,
      });
    });
  });

  describe('trackReferral', () => {
    it('should track referral action', () => {
      const { trackReferral } = require('../analytics');
      trackReferral('code_shared', 'LUX-ABC123');

      expect(mockGtag).toHaveBeenCalledWith('event', 'code_shared', {
        event_category: 'referral',
        event_label: 'LUX-ABC123',
        value: undefined,
      });
    });
  });

  describe('trackGame', () => {
    it('should track game action', () => {
      const { trackGame } = require('../analytics');
      trackGame('coin-flip', 'play', 1000);

      expect(mockGtag).toHaveBeenCalledWith('event', 'play', {
        event_category: 'game',
        event_label: 'coin-flip',
        value: 1000,
      });
    });
  });

  describe('setUserProperties', () => {
    it('should set user properties', () => {
      const { setUserProperties } = require('../analytics');
      setUserProperties({ plan: 'premium', tier: 'gold' });

      expect(mockGtag).toHaveBeenCalledWith('set', 'user_properties', {
        plan: 'premium',
        tier: 'gold',
      });
    });
  });

  describe('setUserId', () => {
    it('should set user ID', () => {
      const { setUserId } = require('../analytics');
      setUserId('user-123');

      expect(mockGtag).toHaveBeenCalledWith('set', { user_id: 'user-123' });
    });
  });
});
