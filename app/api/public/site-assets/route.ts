import { NextResponse } from 'next/server';

import { getSiteAsset } from '@/lib/site-assets';

export const dynamic = 'force-dynamic';

const publicAssetFallbacks = {
  B2B_HERO_BANNER: '/products/combo.jpg',
  LOGO_HEADER: '',
  LOGO_FOOTER: '',
  BADGE_BCT: '/badge-bct.svg',
  TRACEABILITY_BANNER: '/products/soy-pulp.svg',
  BEFORE_AFTER_ORIGINAL: '/products/soy-pulp.svg',
  BEFORE_AFTER_RESULT: '/products/xe-soi.jpg',
  BADGE_FEATURE_1: '/products/soy-pulp.svg',
  BADGE_FEATURE_2: '/products/combo.jpg',
  BADGE_FEATURE_3: '/products/hat-mac-khen.jpg',
} as const;

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key');
  if (!key || !Object.hasOwn(publicAssetFallbacks, key)) {
    return NextResponse.json({ error: 'Vị trí hình ảnh không hợp lệ.' }, { status: 400 });
  }

  const assetKey = key as keyof typeof publicAssetFallbacks;
  const url = await getSiteAsset(assetKey, publicAssetFallbacks[assetKey]);
  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
}