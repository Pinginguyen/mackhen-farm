'use client';

import { ImageUp, LoaderCircle, Upload } from 'lucide-react';
import { useState } from 'react';

type MediaGroupId = 'campaign' | 'identity' | 'special';
type MediaFilter = 'all' | MediaGroupId;

const mediaGroups: { id: MediaGroupId; label: string; keys: string[] }[] = [
  { id: 'campaign', label: 'TRANG CHỦ & HERO', keys: ['HERO_BANNER_MAIN', 'HERO_BANNER_MOBILE', 'PROMO_BANNER_HOME', 'BEFORE_AFTER_ORIGINAL', 'BEFORE_AFTER_RESULT', 'STORY_SECTION_IMAGE'] },
  { id: 'identity', label: 'NHẬN DIỆN & MẠNG XÃ HỘI', keys: ['LOGO_HEADER', 'LOGO_FOOTER', 'OG_IMAGE', 'BADGE_BCT'] },
  { id: 'special', label: 'TRANG CHUYÊN BIỆT', keys: ['B2B_HERO_BANNER', 'TRACEABILITY_BANNER', 'BADGE_FEATURE_1', 'BADGE_FEATURE_2', 'BADGE_FEATURE_3'] },
];

const filters: { id: MediaFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'campaign', label: 'Trang chủ' },
  { id: 'identity', label: 'Nhận diện' },
  { id: 'special', label: 'Chuyên biệt' },
];

const recommendedDimensions: Record<string, string> = {
  HERO_BANNER_MAIN: '1920 x 1080 px',
  HERO_BANNER_MOBILE: '1080 x 1350 px',
  PROMO_BANNER_HOME: '1600 x 500 px',
  BEFORE_AFTER_ORIGINAL: '1200 x 900 px',
  BEFORE_AFTER_RESULT: '1200 x 900 px',
  STORY_SECTION_IMAGE: '1200 x 900 px',
  LOGO_HEADER: '512 x 160 px',
  LOGO_FOOTER: '512 x 160 px',
  OG_IMAGE: '1200 x 630 px',
  BADGE_BCT: '200 x 75 px',
  B2B_HERO_BANNER: '1920 x 900 px',
  TRACEABILITY_BANNER: '1920 x 700 px',
  BADGE_FEATURE_1: '256 x 256 px',
  BADGE_FEATURE_2: '256 x 256 px',
  BADGE_FEATURE_3: '256 x 256 px',
};

const assetGuidance: Record<string, string> = {
  HERO_BANNER_MAIN: 'Ưu tiên món ăn đặt lệch tâm, chừa khoảng trống cho nội dung tiêu đề.',
  HERO_BANNER_MOBILE: 'Bố cục dọc, chủ thể ở giữa và tránh chữ sát mép ảnh.',
  PROMO_BANNER_HOME: 'Dùng ảnh combo nằm ngang, nền đơn giản để nổi bật ưu đãi.',
  BEFORE_AFTER_ORIGINAL: 'Chọn ảnh cận cảnh bã đậu nành thô, đủ sáng và rõ kết cấu.',
  BEFORE_AFTER_RESULT: 'Chọn ảnh thành phẩm xé sợi, góc chụp tương đồng ảnh nguyên liệu.',
  STORY_SECTION_IMAGE: 'Ưu tiên ảnh thật vùng nguyên liệu, nông trại hoặc người làm sản phẩm.',
  LOGO_HEADER: 'Logo ngang, nền trong suốt hoặc sáng, giữ khoảng thở xung quanh.',
  LOGO_FOOTER: 'Logo ngang có độ tương phản tốt trên nền footer tối.',
  OG_IMAGE: 'Đặt tên thương hiệu và sản phẩm trong vùng an toàn giữa ảnh.',
  BADGE_BCT: 'Dùng đúng biểu tượng xác nhận của Bộ Công Thương được cấp cho website.',
  B2B_HERO_BANNER: 'Ảnh nguyên liệu, sản phẩm hoặc đóng gói phù hợp đối tác bán sỉ.',
  TRACEABILITY_BANNER: 'Gợi hình vùng nguyên liệu, lô sản xuất hoặc chuỗi truy xuất.',
  BADGE_FEATURE_1: 'Biểu tượng hoặc ảnh minh họa nguồn nguyên liệu bã đậu nành địa phương.',
  BADGE_FEATURE_2: 'Biểu tượng hoặc ảnh minh họa đóng gói và bảo vệ đơn hàng.',
  BADGE_FEATURE_3: 'Biểu tượng hoặc ảnh minh họa hương vị mắc khén Tây Bắc.',
};

const managedAssetKeys = mediaGroups.flatMap(({ keys }) => keys);

function categoryLabel(key: string) {
  const group = mediaGroups.find(({ keys }) => keys.includes(key));
  if (group) return group.label;
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
    : managedItems.filter((asset) => mediaGroups.find((group) => group.id === activeFilter)?.keys.includes(asset.key));

  return <section className="admin-media-manager">
    {unavailable && <p className="empty-state" role="status">Không thể tải vị trí hình ảnh từ cơ sở dữ liệu.</p>}
    {feedback && <p className={`admin-media-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    <div className="admin-media-filters" role="tablist" aria-label="Lọc vị trí hình ảnh">
      {filters.map((filter) => {
        const count = filter.id === 'all'
          ? managedItems.length
          : managedItems.filter((asset) => mediaGroups.find((group) => group.id === filter.id)?.keys.includes(asset.key)).length;
        return <button
          key={filter.id}
          type="button"
          role="tab"
          aria-selected={activeFilter === filter.id}
          className={activeFilter === filter.id ? 'is-active' : ''}
          onClick={() => setActiveFilter(filter.id)}
        >{filter.label} <span>({count})</span></button>;
      })}
    </div>
    <div className="admin-media-grid">
      {visibleItems.map((asset) => {
        const busy = busyKey === asset.key;
        const uploading = busyKey !== null;
        const containImage = ['LOGO_HEADER', 'LOGO_FOOTER', 'BADGE_BCT', 'BADGE_FEATURE_1', 'BADGE_FEATURE_2', 'BADGE_FEATURE_3'].includes(asset.key);
        const dimensions = recommendedDimensions[asset.key] ?? 'Theo tỉ lệ vị trí hiển thị';
        return <article className="admin-media-card" key={asset.key}>
          <header className="admin-media-card-heading">
            <div><span className="admin-media-category">{categoryLabel(asset.key)}</span><h2>{asset.label}</h2></div>
            <code>{asset.key}</code>
          </header>
          <div className={`admin-media-preview${containImage ? ' is-contained' : ''}`}>
            {asset.imageUrl
              ? <img className="object-cover object-center" src={asset.imageUrl} alt={asset.altText ?? asset.label} />
              : <div className="admin-media-empty"><ImageUp size={28} aria-hidden="true" /><span>Chưa có hình ảnh</span></div>}
          </div>
          <p className="admin-media-guidance">{assetGuidance[asset.key] ?? 'Chọn ảnh rõ nét, đúng nội dung vị trí hiển thị.'}</p>
          <div className="admin-media-card-footer">
            <span className="admin-media-dimension-badge">{dimensions.replace(/ x /g, '×').replace(' px', '')}</span>
            <label
              className={`admin-media-upload-button${busy ? ' is-busy' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); if (!uploading && !unavailable) void uploadAsset(asset, event.dataTransfer.files[0]); }}
            >
              {busy ? <LoaderCircle size={14} className="admin-media-spinner" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
              <span>{busy ? 'Đang tải...' : 'Tải ảnh mới'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading || unavailable}
                onChange={(event) => { void uploadAsset(asset, event.target.files?.[0]); event.currentTarget.value = ''; }}
              />
            </label>
          </div>
        </article>;
      })}
    </div>
  </section>;
}