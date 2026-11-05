import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_CONSENT_KEY, getStoredAffiliateCode, storeAffiliateCode } from './affiliate-attribution';

const values = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => values.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  removeItem: vi.fn((key: string) => values.delete(key)),
};

describe('affiliate attribution consent', () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal('window', { localStorage: localStorageMock } as unknown as Window);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('does not store or return an affiliate code before consent', () => {
    expect(storeAffiliateCode('koc-taybac')).toBeNull();
    expect(getStoredAffiliateCode()).toBeNull();
  });

  it('stores and returns an affiliate code after consent', () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');

    expect(storeAffiliateCode('koc-taybac')).toBe('KOC-TAYBAC');
    expect(getStoredAffiliateCode()).toBe('KOC-TAYBAC');
  });

  it('does not return an existing referral after consent is rejected', () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    storeAffiliateCode('koc-taybac');
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');

    expect(getStoredAffiliateCode()).toBeNull();
  });
});