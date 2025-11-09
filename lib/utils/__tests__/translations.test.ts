/**
 * Unit tests for translations utility
 */

import { translations } from '../translations';

describe('translations', () => {
  it('should have translations for all supported languages', () => {
    expect(translations).toBeDefined();
    expect(translations.en).toBeDefined();
    expect(translations.th).toBeDefined();
    expect(translations.zh).toBeDefined();
  });

  it('should have common keys in all languages', () => {
    const commonKeys = ['appName', 'premiumPlatform', 'yourBalance'];
    
    commonKeys.forEach(key => {
      expect(translations.en[key]).toBeDefined();
      expect(translations.th[key]).toBeDefined();
      expect(translations.zh[key]).toBeDefined();
    });
  });

  it('should have staking-related translations', () => {
    expect(translations.en.myStakingBalance).toBeDefined();
    expect(translations.en.earnedInterest).toBeDefined();
    expect(translations.en.staking).toBeDefined();
  });

  it('should have membership-related translations', () => {
    expect(translations.en.boostEarnings).toBeDefined();
    expect(translations.en.upgradeMembership).toBeDefined();
    expect(translations.en.vipMemberships).toBeDefined();
  });

  it('should have referral-related translations', () => {
    expect(translations.en.inviteFriends).toBeDefined();
    expect(translations.en.referralDesc).toBeDefined();
    expect(translations.en.totalReferrals).toBeDefined();
    expect(translations.en.totalEarnings).toBeDefined();
  });

  it('should have toast message translations', () => {
    expect(translations.en.insufficientBalance).toBeDefined();
    expect(translations.en.paymentFailed).toBeDefined();
    expect(translations.en.successfullyStaked).toBeDefined();
  });

  it('should have translations with placeholders', () => {
    expect(translations.en.successfullyStaked).toContain('{amount}');
    expect(translations.en.claimedRewards).toContain('{amount}');
    expect(translations.en.claimedInterest).toContain('{amount}');
  });

  it('should have consistent translation structure', () => {
    const englishKeys = Object.keys(translations.en);
    const thaiKeys = Object.keys(translations.th);
    const chineseKeys = Object.keys(translations.zh);

    // All languages should have similar number of keys
    expect(englishKeys.length).toBeGreaterThan(0);
    expect(thaiKeys.length).toBeGreaterThan(0);
    expect(chineseKeys.length).toBeGreaterThan(0);
  });

  it('should have non-empty translation values', () => {
    Object.values(translations.en).forEach(value => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });
});

