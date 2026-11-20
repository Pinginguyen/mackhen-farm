import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSiteAsset } = vi.hoisted(() => ({ getSiteAsset: vi.fn() }));

vi.mock('@/lib/site-assets', () => ({ getSiteAsset }));

import { GET } from './route';

describe('/api/public/site-assets', () => {
  beforeEach(() => getSiteAsset.mockReset().mockResolvedValue('https://blob.example/banner.webp'));

  it('returns a whitelisted public banner URL through the cache helper', async () => {
    const response = await GET(new Request('https://mackhen.example/api/public/site-assets?key=B2B_HERO_BANNER'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://blob.example/banner.webp' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getSiteAsset).toHaveBeenCalledWith('B2B_HERO_BANNER', '/products/combo.jpg');
  });

  it('uses the local notification badge when no uploaded BCT badge is available', async () => {
    const response = await GET(new Request('https://mackhen.example/api/public/site-assets?key=BADGE_BCT'));

    expect(response.status).toBe(200);
    expect(getSiteAsset).toHaveBeenCalledWith('BADGE_BCT', '/badge-bct.svg');
  });

  it('serves configurable feature badge slots', async () => {
    const response = await GET(new Request('https://mackhen.example/api/public/site-assets?key=BADGE_FEATURE_1'));

    expect(response.status).toBe(200);
    expect(getSiteAsset).toHaveBeenCalledWith('BADGE_FEATURE_1', '/products/soy-pulp.svg');
  });

  it('rejects unknown asset keys', async () => {
    const response = await GET(new Request('https://mackhen.example/api/public/site-assets?key=BADGE_FEATURE_4'));

    expect(response.status).toBe(400);
    expect(getSiteAsset).not.toHaveBeenCalled();
  });
});