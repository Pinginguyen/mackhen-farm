'use client';

import { ImageUp, LoaderCircle, Upload } from 'lucide-react';
import { useState } from 'react';

type MediaFilter = 'all' | 'home' | 'branding' | 'special';

const filters: { id: MediaFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'home', label: 'Trang chủ' },
  { id: 'branding', label: 'Logo & Footer' },
  { id: 'special', label: 'Trang chuyên biệt (B2B/Truy xuất)' },
];

const filterKeys: Record<Exclude<MediaFilter, 'all'>, string[]> = {
  home: ['HERO_BANNER_MAIN', 'HERO_BANNER_MOBILE', 'PROMO_BANNER_HOME'],
  branding: ['LOGO_HEADER', 'LOGO_FOOTER'],
  special: ['B2B_HERO_BANNER', 'TRACEABILITY_BANNER'],
};

const recommendedDimensions: Record<string, string> = {
  HERO_BANNER_MAIN: '1920 x 1080 px',
  HERO_BANNER_MOBILE: '1080 x 1350 px',
  PROMO_BANNER_HOME: '1600 x 500 px',
  LOGO_HEADER: '512 x 512 px',
  LOGO_FOOTER: '512 x 160 px',
  B2B_HERO_BANNER: '1920 x 900 px',
  TRACEABILITY_BANNER: '1920 x 700 px',
};

const managedAssetKeys = Object.values(filterKeys).flat();

function categoryLabel(key: string) {
  if (filterKeys.home.includes(key)) return 'Trang chủ';
  if (filterKeys.branding.includes(key)) return 'Logo & Footer';
  if (filterKeys.special.includes(key)) return 'Trang chuyên biệt';
  return 'Storefront';
}

export type SiteAssetItem = {
  id: string;
  key: string;
  label: string;
  category: string;
  imageUrl: string;
  altText: string | null;
  updatedAt: string;
};

export default function SiteAssetManager({ initialItems, unavailable }: { initialItems: SiteAssetItem[]; unavailable: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [activeFilter, setActiveFilter] = useState<MediaFilter>('all');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function saveAsset(asset: SiteAssetItem, imageUrl: string) {
    const response = await fetch('/api/admin/site-assets', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: asset.key, imageUrl, altText: asset.altText }),
    });
    const result = await response.json() as { item?: SiteAssetItem; error?: string };
    if (!response.ok || !result.item) throw new Error(result.error ?? 'Không thể lưu hình ảnh.');
    setItems((current) => current.map((item) => item.key === asset.key ? result.item! : item));
  }

  async function uploadAsset(asset: SiteAssetItem, file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP tối đa 4 MB.' });
      return;
    }

    setBusyKey(asset.key);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const uploadResponse = await fetch('/api/admin/media/upload', { method: 'POST', body: formData });
      const uploadResult = await uploadResponse.json() as { url?: string; error?: string };
      if (!uploadResponse.ok || !uploadResult.url) throw new Error(uploadResult.error ?? 'Không thể tải ảnh lên.');
      await saveAsset({ ...asset, altText: asset.altText?.trim() || asset.label }, uploadResult.url);
      setFeedback({ type: 'success', text: `Đã cập nhật: ${asset.label}.` });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Không thể cập nhật hình ảnh.' });
    } finally {
      setBusyKey(null);
    }
  }

  const managedItems = items.filter((asset) => managedAssetKeys.includes(asset.key));
  const visibleItems = activeFilter === 'all'
    ? managedItems
    : managedItems.filter((asset) => filterKeys[activeFilter].includes(asset.key));

  return <section className="admin-media-manager">
    {unavailable && <p className="empty-state" role="status">Không thể tải vị trí hình ảnh từ cơ sở dữ liệu.</p>}
    {feedback && <p className={`admin-media-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    <div className="admin-media-filters" role="tablist" aria-label="Lọc vị trí hình ảnh">
      {filters.map((filter) => <button
        key={filter.id}
        type="button"
        role="tab"
        aria-selected={activeFilter === filter.id}
        className={activeFilter === filter.id ? 'is-active' : ''}
        onClick={() => setActiveFilter(filter.id)}
      >{filter.label}</button>)}
    </div>
    <div className="admin-media-grid">
      {visibleItems.map((asset) => {
        const busy = busyKey === asset.key;
        const uploading = busyKey !== null;
        return <article className="admin-media-card" key={asset.key}>
          <header className="admin-media-card-heading">
            <div><span className="admin-media-category">{categoryLabel(asset.key)}</span><h2>{asset.label}</h2></div>
            <code>{asset.key}</code>
          </header>
          <div className="admin-media-preview">
            {asset.imageUrl
              ? <img className="object-cover object-center" src={asset.imageUrl} alt={asset.altText ?? asset.label} />
              : <div className="admin-media-empty"><ImageUp size={28} aria-hidden="true" /><span>Chưa có logo</span></div>}
          </div>
          <p className="admin-media-dimensions">Kích thước gợi ý <strong>{recommendedDimensions[asset.key] ?? 'Theo tỉ lệ vị trí hiển thị'}</strong></p>
          <label
            className={`admin-media-dropzone${busy ? ' is-busy' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); if (!uploading && !unavailable) void uploadAsset(asset, event.dataTransfer.files[0]); }}
          >
            {busy ? <LoaderCircle size={18} className="admin-media-spinner" aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
            <span>{busy ? 'Đang tải và lưu...' : 'Tải ảnh thay thế'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading || unavailable}
              onChange={(event) => { void uploadAsset(asset, event.target.files?.[0]); event.currentTarget.value = ''; }}
            />
          </label>
        </article>;
      })}
    </div>
  </section>;
}