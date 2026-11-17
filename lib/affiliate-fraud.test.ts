import { afterEach, describe, expect, it, vi } from 'vitest';

import { getClientIpHash, isSelfReferral, normalizeAffiliatePhone } from './affiliate-fraud';

describe('affiliate fraud checks', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('normalizes international Vietnamese phones before comparing owners', () => {
    expect(normalizeAffiliatePhone('+84 762 793 244')).toBe('0762793244');
    expect(isSelfReferral({
      buyerUserId: 'buyer-2',
      buyerPhone: '0762-793-244',
      buyerIpHash: null,
      affiliateUserId: 'affiliate-1',
      affiliatePhone: '+84 762 793 244',
      affiliateIpHash: null,
    })).toBe(true);
  });

  it('compares matching buyer and affiliate IP fingerprints without retaining the raw IP', () => {
    vi.stubEnv('AFFILIATE_IP_HASH_SECRET', 'test-hmac-secret');
    const affiliateIpHash = getClientIpHash(new Request('https://mackhen.example', { headers: { 'x-real-ip': '192.0.2.10' } }));
    const buyerIpHash = getClientIpHash(new Request('https://mackhen.example', { headers: { 'x-forwarded-for': '192.0.2.10, 198.51.100.2' } }));

    expect(affiliateIpHash).toBeTruthy();
    expect(affiliateIpHash).not.toContain('192.0.2.10');
    expect(isSelfReferral({ buyerUserId: null, buyerPhone: '0762793244', buyerIpHash, affiliateUserId: 'affiliate-1', affiliatePhone: null, affiliateIpHash })).toBe(true);
  });

  it('does not match unrelated customer identity, phone, or IP', () => {
    expect(isSelfReferral({
      buyerUserId: 'buyer-2', buyerPhone: '0762793244', buyerIpHash: 'buyer-ip',
      affiliateUserId: 'affiliate-1', affiliatePhone: '0900000000', affiliateIpHash: 'affiliate-ip',
    })).toBe(false);
  });
});