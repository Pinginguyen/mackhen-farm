'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Copy, Gift, Sparkles, Tag, Ticket, Truck } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

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

function valueLabel(voucher: Voucher, isEN: boolean, formatCurrency: (amount: number) => string) {
  if (voucher.freeShipping) return isEN ? 'FREE SHIPPING' : 'FREESHIP';
  if (voucher.discountType === 'PERCENTAGE') return `${isEN ? 'SAVE' : 'GIẢM'} ${voucher.value}%`;
  return `${isEN ? 'SAVE' : 'GIẢM'} ${formatCurrency(voucher.value)}`;
}

function voucherIcon(voucher: Voucher) {
  if (voucher.freeShipping) return <Truck aria-hidden="true" size={25} />;
  if (voucher.firstOrderOnly) return <Gift aria-hidden="true" size={25} />;
  return <Tag aria-hidden="true" size={25} />;
}

function expirationLabel(value: string | null, isEN: boolean, text: (value: string) => string) {
  if (!value) return text('Không thời hạn');
  const remaining = Date.parse(value) - Date.now();
  if (remaining <= 0) return text('Đã hết hạn');
  const days = Math.ceil(remaining / 86_400_000);
  if (days === 1) return text('Còn lại hôm nay');
  if (days <= 7) return isEN ? `${days} days left` : `Còn ${days} ngày`;
  return `${isEN ? 'Until' : 'Đến'} ${new Date(value).toLocaleDateString(isEN ? 'en-SG' : 'vi-VN')}`;
}

function voucherTitle(voucher: Voucher, isEN: boolean, text: (value: string) => string) {
  const fallback = voucher.freeShipping ? 'Ưu đãi vận chuyển' : voucher.firstOrderOnly ? 'Quà cho thành viên mới' : 'Ưu đãi đơn hàng';
  if (!voucher.name) return text(fallback);
  const translated = text(voucher.name);
  if (!isEN || translated !== voucher.name || !/[À-ỹ]/.test(voucher.name)) return translated;
  return text(fallback);
}

export default function PromotionsPage() {
  const { locale, currency, formatCurrency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const text = (value: string) => translateContent(value, isEN ? 'en' : 'vi');
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
          throw new Error(text('Không thể tải danh sách ưu đãi.'));
        }
        if (mounted) {
          setVouchers(result.items);
          setError('');
        }
      } catch (loadError) {
        if (mounted) setError(isEN ? text('Không thể tải danh sách ưu đãi.') : loadError instanceof Error ? loadError.message : text('Không thể tải danh sách ưu đãi.'));
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
  }, [isEN]);

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
          <p className="promo-eyebrow"><Sparkles size={15} aria-hidden="true" /> {text('ƯU ĐÃI ĐẶC SẢN TÂY BẮC')}</p>
          <h1 className="font-sans font-extrabold tracking-tight"><span className="promo-hero-title-primary">{text('Kho Voucher & Ưu Đãi')}</span><span className="promo-hero-title-brand">Mắc Khén Farm</span></h1>
          <p className="promo-hero-description">{text('Săn mã giảm giá độc quyền để thưởng thức trọn vẹn đặc sản sấy Tây Bắc.')}</p>
          <Link className="promo-hero-cta" href="/products">{text('Khám phá sản phẩm')} <ArrowRight size={17} /></Link>
          <div className="promo-hero-stamp" aria-hidden="true"><Gift size={30} /><span>{isEN ? <>NORTHWEST<br />GIFTS</> : <>QUÀ<br />TÂY BẮC</>}</span></div>
        </div>
      </section>

      <section className="promo-content" aria-label={isEN ? 'Voucher list' : 'Danh sách voucher'}>
        <div className="promo-section-heading"><div><p className="promo-section-kicker">{text('Dành riêng cho bạn')}</p><h2>{text('Ưu đãi đang mở')}</h2></div><span>{vouchers.length} {text('mã')}</span></div>
        <div className="promo-tabs" role="tablist" aria-label={text('Lọc voucher')}>
          {categories.map((item) => <button key={item.id} id={`promo-tab-${item.id}`} type="button" role="tab" aria-selected={category === item.id} className={category === item.id ? 'is-selected' : ''} onClick={() => setCategory(item.id)}>{text(item.label)}</button>)}
        </div>

        {loading && <p className="promo-state" role="status">{text('Đang tìm ưu đãi dành cho bạn...')}</p>}
        {!loading && error && <p className="promo-state is-error" role="alert">{error}</p>}
        {!loading && !error && visibleVouchers.length > 0 && <div className="promo-voucher-grid">
          {visibleVouchers.map((voucher) => <article className={`promo-ticket${voucher.freeShipping ? ' is-shipping' : voucher.firstOrderOnly ? ' is-new' : ''}`} key={voucher.id}>
            <div className="promo-ticket-value"><span className="promo-ticket-icon">{voucherIcon(voucher)}</span><strong>{valueLabel(voucher, isEN, formatCurrency)}</strong><small>{text('VOUCHER ĐẶC BIỆT')}</small></div>
            <div className="promo-ticket-details">
              <div className="promo-ticket-copy"><p className="promo-ticket-title">{voucherTitle(voucher, isEN, text)}</p><p className="promo-ticket-condition">{text('Đơn tối thiểu')} <strong>{formatCurrency(voucher.minSpend)}</strong>{voucher.maxDiscount && voucher.discountType === 'PERCENTAGE' ? ` · ${isEN ? 'up to' : 'tối đa'} ${formatCurrency(voucher.maxDiscount)}` : ''}</p>
                <p className="promo-ticket-audience">{text(voucher.firstOrderOnly ? 'Chỉ áp dụng cho đơn hàng đầu tiên' : 'Áp dụng cho mọi khách hàng')}</p><p className="promo-ticket-expiry">{text('Hạn dùng:')} <strong>{expirationLabel(voucher.expiresAt, isEN, text)}</strong></p></div>
              <div className="promo-ticket-actions"><span className="promo-code-badge"><Ticket size={15} aria-hidden="true" />{voucher.code}</span><button type="button" className="promo-copy-button" onClick={() => void copyCode(voucher.code)}><Copy size={15} /> {text(copiedCode === voucher.code ? 'Đã sao chép mã!' : 'Sao chép mã')}</button><Link className="promo-use-button" href="/products">{text('Dùng ngay')} <ArrowRight size={15} /></Link></div>
            </div>
          </article>)}
        </div>}
        {!loading && !error && visibleVouchers.length === 0 && <div className="promo-empty"><Gift size={28} /><p>{text(vouchers.length ? 'Danh mục này chưa có voucher phù hợp.' : 'Chưa có ưu đãi công khai. Mời bạn quay lại sau!')}</p></div>}
      </section>
      <div className={`promo-toast${copiedCode ? ' is-visible' : ''}`} role="status" aria-live="polite">{copiedCode === 'error' ? text('Không thể sao chép mã. Vui lòng thử lại.') : copiedCode ? text('Đã sao chép mã!') : ''}</div>
    </main>
  );
}