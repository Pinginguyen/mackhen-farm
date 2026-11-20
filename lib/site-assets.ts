import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/prisma';
import defaults from '@/lib/site-asset-defaults.json';

export const SITE_ASSET_DEFAULTS = defaults;

const legacyDefaultImages: Record<string, string> = {
  HERO_BANNER_MOBILE: '/products/xe-soi.jpg',
  STORY_SECTION_IMAGE: '/products/xe-soi.jpg',
  B2B_HERO_BANNER: '/products/xe-soi.jpg',
  OG_IMAGE: '/products/xe-soi.jpg',
};

export async function ensureSiteAssets() {
  await Promise.all([
    prisma.siteAsset.updateMany({ where: { key: 'HERO_BANNER_MOBILE', imageUrl: '/products/xe-soi.jpg' }, data: { imageUrl: '/products/hat-mac-khen.jpg' } }),
    prisma.siteAsset.updateMany({ where: { key: 'STORY_SECTION_IMAGE', imageUrl: '/products/xe-soi.jpg' }, data: { imageUrl: '/products/hat-doi.jpg' } }),
    prisma.siteAsset.updateMany({ where: { key: 'B2B_HERO_BANNER', imageUrl: '/products/xe-soi.jpg' }, data: { imageUrl: '/products/combo.jpg' } }),
    prisma.siteAsset.updateMany({ where: { key: 'OG_IMAGE', imageUrl: '/products/xe-soi.jpg' }, data: { imageUrl: '/products/combo.jpg' } }),
    prisma.siteAsset.updateMany({ where: { key: 'BADGE_BCT', imageUrl: '' }, data: { imageUrl: '/badge-bct.svg' } }),
  ]);
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
    const imageUrl = (await getCachedAsset())?.imageUrl;
    if (!imageUrl || imageUrl === legacyDefaultImages[key]) return fallbackUrl;
    return imageUrl;
  } catch {
    return fallbackUrl;
  }
}