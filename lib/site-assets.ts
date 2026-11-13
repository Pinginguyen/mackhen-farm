import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/prisma';
import defaults from '@/lib/site-asset-defaults.json';

export const SITE_ASSET_DEFAULTS = defaults;

export async function ensureSiteAssets() {
  await Promise.all(SITE_ASSET_DEFAULTS.map((asset) => prisma.siteAsset.upsert({
    where: { key: asset.key },
    update: {},
    create: asset,
  })));
}

export async function getSiteAsset(key: string, fallbackUrl: string): Promise<string> {
  const getCachedAsset = unstable_cache(
    () => prisma.siteAsset.findUnique({ where: { key }, select: { imageUrl: true } }),
    ['site-asset', key],
    { revalidate: 300, tags: [`site-asset:${key}`] },
  );

  try {
    return (await getCachedAsset())?.imageUrl || fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}