'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Copy, Gift, Sparkles, Tag, Ticket, Truck } from 'lucide-react';

type Voucher = {
  id: string;
  code: string;
  name: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  expiresAt: string | null;
  freeShipping: boolean;
  firstOrderOnly: boolean;
};

type VoucherCategory = 'all' | 'shipping' | 'new' | 'discount';

const categories: { id: VoucherCategory; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'shipping', label: 'Miễn phí vận chuyển' },
  { id: 'new', label: 'Thành viên mới' },
  { id: 'discount', label: 'Giảm giá đơn hàng' },
];

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function valueLabel(voucher: Voucher) {
  if (voucher.freeShipping) return 'FREESHIP';
  if (voucher.discountType === 'PERCENTAGE') return `GIẢM ${voucher.value}%`;
  const compactAmount = voucher.value >= 1000 && voucher.value % 1000 === 0
    ? `${voucher.value / 1000}K`
    : formatMoney(voucher.value);
  return `GIẢM ${compactAmount}`;
}

function voucherIcon(voucher: Voucher) {
  if (voucher.freeShipping) return <Truck aria-hidden="true" size={25} />;
  if (voucher.firstOrderOnly) return <Gift aria-hidden="true" size={25} />;
  return <Tag aria-hidden="true" size={25} />;
}

function expirationLabel(value: string | null) {
  if (!value) return 'Không thời hạn';
  const remaining = Date.parse(value) - Date.now();
  if (remaining <= 0) return 'Đã hết hạn';
  const days = Math.ceil(remaining / 86_400_000);
  if (days === 1) return 'Còn lại hôm nay';
  if (days <= 7) return `Còn ${days} ngày`;
  return `Đến ${new Date(value).toLocaleDateString('vi-VN')}`;
}

export default function PromotionsPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [category, setCategory] = useState<VoucherCategory>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadVouchers() {
      try {
        const response = await fetch('/api/vouchers', { cache: 'no-store' });
        const result = await response.json() as { items?: Voucher[]; error?: string | { message?: string } };
        if (!response.ok || !result.items) {
          const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message;
          throw new Error(errorMessage ?? 'Không thể tải danh sách ưu đãi.');
        }
        if (mounted) {
          setVouchers(result.items);
          setError('');
        }
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách ưu đãi.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadVouchers();
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadVouchers();
    }, 15_000);
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') void loadVouchers(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  const visibleVouchers = vouchers.filter((voucher) => {
    if (category === 'shipping') return voucher.freeShipping;
    if (category === 'new') return voucher.firstOrderOnly;
    if (category === 'discount') return !voucher.freeShipping;
    return true;
  });

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(''), 2200);
    } catch {
      setCopiedCode('error');
      window.setTimeout(() => setCopiedCode(''), 2500);
    }
  }

  return (
    <main className="promo-page">
      <section className="promo-hero">
        <div className="promo-hero-inner">
          <p className="promo-eyebrow"><Sparkles size={15} aria-hidden="true" /> ƯU ĐÃI ĐẶC SẢN TÂY BẮC</p>
          <h1 className="font-sans font-extrabold tracking-tight"><span className="promo-hero-title-primary">Kho Voucher &amp; Ưu Đãi</span><span className="promo-hero-title-brand">Mắc Khén Farm</span></h1>
          <p className="promo-hero-description">Săn mã giảm giá độc quyền để thưởng thức trọn vẹn đặc sản sấy Tây Bắc.</p>
          <Link className="promo-hero-cta" href="/products">Khám phá sản phẩm <ArrowRight size={17} /></Link>
          <div className="promo-hero-stamp" aria-hidden="true"><Gift size={30} /><span>QUÀ<br />TÂY BẮC</span></div>
        </div>
      </section>

      <section className="promo-content" aria-label="Danh sách voucher">
        <div className="promo-section-heading"><div><p className="promo-section-kicker">DÀNH RIÊNG CHO BẠN</p><h2>Ưu đãi đang mở</h2></div><span>{vouchers.length} mã</span></div>
        <div className="promo-tabs" role="tablist" aria-label="Lọc voucher">
          {categories.map((item) => <button key={item.id} id={`promo-tab-${item.id}`} type="button" role="tab" aria-selected={category === item.id} className={category === item.id ? 'is-selected' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}
        </div>

        {loading && <p className="promo-state" role="status">Đang tìm ưu đãi dành cho bạn...</p>}
        {!loading && error && <p className="promo-state is-error" role="alert">{error}</p>}
        {!loading && !error && visibleVouchers.length > 0 && <div className="promo-voucher-grid">
          {visibleVouchers.map((voucher) => <article className={`promo-ticket${voucher.freeShipping ? ' is-shipping' : voucher.firstOrderOnly ? ' is-new' : ''}`} key={voucher.id}>
            <div className="promo-ticket-value"><span className="promo-ticket-icon">{voucherIcon(voucher)}</span><strong>{valueLabel(voucher)}</strong><small>VOUCHER ĐẶC BIỆT</small></div>
            <div className="promo-ticket-details">
              <div className="promo-ticket-copy"><p className="promo-ticket-title">{voucher.name ?? (voucher.freeShipping ? 'Ưu đãi vận chuyển' : voucher.firstOrderOnly ? 'Quà cho thành viên mới' : 'Ưu đãi đơn hàng')}</p><p className="promo-ticket-condition">Đơn tối thiểu <strong>{formatMoney(voucher.minSpend)}</strong>{voucher.maxDiscount && voucher.discountType === 'PERCENTAGE' ? ` · tối đa ${formatMoney(voucher.maxDiscount)}` : ''}</p>
                <p className="promo-ticket-audience">{voucher.firstOrderOnly ? 'Chỉ áp dụng cho đơn hàng đầu tiên' : 'Áp dụng cho mọi khách hàng'}</p><p className="promo-ticket-expiry">Hạn dùng: <strong>{expirationLabel(voucher.expiresAt)}</strong></p></div>
              <div className="promo-ticket-actions"><span className="promo-code-badge"><Ticket size={15} aria-hidden="true" />{voucher.code}</span><button type="button" className="promo-copy-button" onClick={() => void copyCode(voucher.code)}><Copy size={15} /> Sao chép mã</button><Link className="promo-use-button" href="/products">Dùng ngay <ArrowRight size={15} /></Link></div>
            </div>
          </article>)}
        </div>}
        {!loading && !error && visibleVouchers.length === 0 && <div className="promo-empty"><Gift size={28} /><p>{vouchers.length ? 'Danh mục này chưa có voucher phù hợp.' : 'Chưa có ưu đãi công khai. Mời bạn quay lại sau!'}</p></div>}
      </section>
      <div className={`promo-toast${copiedCode ? ' is-visible' : ''}`} role="status" aria-live="polite">{copiedCode === 'error' ? 'Không thể sao chép mã. Vui lòng thử lại.' : copiedCode ? 'Đã sao chép mã!' : ''}</div>
    </main>
  );
}