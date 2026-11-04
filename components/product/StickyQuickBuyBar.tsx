'use client';

import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { ShoppingBag } from 'lucide-react';
import type { Currency } from '@/lib/translations';
import { useLocaleCurrency } from '@/lib/i18n-context';

type StickyProduct = { name: string; image: string; price: number };

export default function StickyQuickBuyBar({ product, currency, onAddToCart, anchorRef, disabled = false, loading = false }: {
  product: StickyProduct;
  currency: Currency;
  onAddToCart: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const { formatCurrency, translateProductName, locale } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const updateVisibility = () => {
      const passedAnchor = anchor.getBoundingClientRect().bottom < 0;
      setVisible(passedAnchor);
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(updateVisibility, { threshold: 0 });
    observer?.observe(anchor);
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility, { passive: true });
    updateVisibility();
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
    };
  }, [anchorRef]);

  return (
    <div className={`sticky-quick-buy${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <img src={product.image} alt="" width={48} height={48} />
      <span className="sticky-quick-buy-product" data-currency={currency}>
        <strong>{translateProductName(product.name)}</strong>
        <b>{formatCurrency(product.price)}</b>
      </span>
      <button type="button" className="sticky-quick-buy-button" onClick={onAddToCart} disabled={!visible || disabled || loading}>
        <ShoppingBag size={16} aria-hidden="true" />
        <span>{loading ? (isEN ? 'Adding...' : 'Đang thêm...') : (isEN ? 'Add to cart' : 'Thêm vào giỏ')}</span>
      </button>
    </div>
  );
}