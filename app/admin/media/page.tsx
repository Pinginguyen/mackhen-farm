import SiteAssetManager, { type SiteAssetItem } from './site-asset-manager';
import { prisma } from '@/lib/prisma';
import { ensureSiteAssets } from '@/lib/site-assets';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  let items: SiteAssetItem[] = [];
  let unavailable = false;
  try {
    await ensureSiteAssets();
    const assets = await prisma.siteAsset.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });
    items = assets.map((asset) => ({ ...asset, updatedAt: asset.updatedAt.toISOString() }));
  } catch {
    unavailable = true;
  }

  return <main className="page-shell admin-media-page">
    <header className="page-title">
      <div><p className="eyebrow">Cửa hàng</p><h1>Quản lý hình ảnh</h1></div>
    </header>
    <SiteAssetManager initialItems={items} unavailable={unavailable} />
  </main>;
}