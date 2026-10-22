'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';

import type { ProductVariant } from '@/lib/store-data';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function AddToCart({ productId, productSlug, name, image, price, originalPrice, unit, variants }: {
  productId: string;
  productSlug: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number | null;
  unit?: string | null;
  variants: ProductVariant[];
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [productUnavailable, setProductUnavailable] = useState(false);
  const [showStickyBuyBar, setShowStickyBuyBar] = useState(false);
  const { locale, formatCurrency, t, translateProductName } = useLocaleCurrency();
  const localizedName = translateProductName(name);
  const primaryActionsRef = useRef<HTMLDivElement>(null);
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const selectedPrice = selectedVariant?.price ?? price;
  const selectedOriginalPrice = selectedVariant?.originalPrice ?? originalPrice;

  useEffect(() => {
    const target = primaryActionsRef.current;
    if (!target) return;

    const updateStickyBar = () => {
      const passedPurchaseActions = target.getBoundingClientRect().bottom < 0;
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      setShowStickyBuyBar((current) => current === (passedPurchaseActions && isMobile) ? current : passedPurchaseActions && isMobile);
    };
    updateStickyBar();
    window.addEventListener('scroll', updateStickyBar, { passive: true });
    window.addEventListener('resize', updateStickyBar, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateStickyBar);
      window.removeEventListener('resize', updateStickyBar);
    };
  }, []);

  function clearBuyNowSnapshot() {
    try {
      window.sessionStorage.removeItem('buy_now_item');
    } catch {
      return;
    }
  }

  async function addItem(buyNow = false) {
    if (saving) return;
    setMessage('');
    setSaving(true);
    const selectedVariant = variants.find((variant) => variant.id === variantId);
    if (buyNow) {
      try {
        window.sessionStorage.setItem('buy_now_item', JSON.stringify({
          productId,
          productSlug,
          name,
          image,
          variantId: variantId || null,
          variantLabel: selectedVariant?.label ?? null,
          unitPrice: selectedVariant?.price ?? price,
          quantity,
        }));
      } catch {
        setSaving(false);
        setMessage('Không thể chuẩn bị phiên mua nhanh. Vui lòng thử lại.');
        return;
      }
    }
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, variantId: variantId || undefined, quantity, buyNow }),
      });
      const result = await response.json() as { error?: { code?: string; message?: string }; cartCount?: number };
      if (!response.ok) {
        if (buyNow) clearBuyNowSnapshot();
        const unavailable = ['PRODUCT_NOT_FOUND', 'VARIANT_NOT_FOUND'].includes(result.error?.code ?? '')
          || result.error?.message?.trim() === 'Không tìm thấy sản phẩm';
        if (unavailable) setProductUnavailable(true);
        else setMessage(result.error?.message ?? 'Không thể thêm sản phẩm vào giỏ.');
        return;
      }
      if (buyNow) router.push('/checkout?mode=buy_now');
      else {
        window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: result.cartCount } }));
        window.dispatchEvent(new CustomEvent('mackhen:cart-added', { detail: { name } }));
        setMessage('Đã thêm sản phẩm vào giỏ hàng.');
      }
    } catch {
      if (buyNow) clearBuyNowSnapshot();
      setMessage('Không thể kết nối để cập nhật giỏ hàng.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cart-add-control">
      <div className="detail-prices">
        <strong className="!text-[#9B2424] !text-3xl !font-bold">{formatCurrency(selectedPrice)}</strong>
        {selectedOriginalPrice != null && selectedOriginalPrice > selectedPrice && <del className="!text-stone-400">{formatCurrency(selectedOriginalPrice)}</del>}
      </div>
      {variants.length >= 2 && (
        <label className="field">
          <span>Phân loại</span>
          <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
            {variants.map((variant) => <option key={variant.id} value={variant.id} disabled={variant.stock < 1}>{variant.label} · {variant.weight} · {formatCurrency(variant.price)}</option>)}
          </select>
        </label>
      )}
      {variants.length === 1 && <p className="product-single-variant">Quy cách: {variants[0].label || unit}</p>}
      <div className="field">
        <span id="product-quantity-label">Số lượng</span>
        <div className="quantity-stepper" role="group" aria-labelledby="product-quantity-label">
          <button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={16} /></button>
          <input id="product-quantity" aria-label="Số lượng" type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} />
          <button type="button" aria-label="Tăng số lượng" disabled={quantity >= 20} onClick={() => setQuantity((value) => Math.min(20, value + 1))}><Plus size={16} /></button>
        </div>
      </div>
      <div className="inline-actions" ref={primaryActionsRef}>
        <button className="primary-action" type="button" onClick={() => addItem()} disabled={saving || productUnavailable || Boolean(selectedVariant && selectedVariant.stock < 1)}>{saving ? (locale === 'en' ? 'Adding...' : 'Đang thêm...') : t('addToCart')}</button>
        <button className="secondary-action" type="button" onClick={() => addItem(true)} disabled={saving || productUnavailable || Boolean(selectedVariant && selectedVariant.stock < 1)}>{saving ? (locale === 'en' ? 'Processing...' : 'Đang xử lý...') : t('buyNow')}</button>
      </div>
      {showStickyBuyBar && <div className="mobile-sticky-buy-bar">
        <img src={image} alt="" />
        <span><strong>{localizedName}</strong><b>{formatCurrency(selectedPrice)}</b></span>
        <button type="button" className="primary-action" onClick={() => void addItem(true)} disabled={saving || productUnavailable || Boolean(selectedVariant && selectedVariant.stock < 1)}>{saving ? (locale === 'en' ? 'Processing...' : 'Đang xử lý...') : t('buyNow')}</button>
      </div>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}