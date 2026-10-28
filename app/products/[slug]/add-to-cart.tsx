'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import gsap from 'gsap';
import { toast } from 'sonner';

import type { ProductVariant } from '@/lib/store-data';
import { useLocaleCurrency } from '@/lib/i18n-context';

function animateFlyToCart(image: string, origin: DOMRect) {
  const cart = document.querySelector<HTMLElement>('.header-cart');
  if (!cart) return;

  const target = cart.getBoundingClientRect();
  const startX = origin.left + origin.width / 2;
  const startY = origin.top + origin.height / 2;
  const endX = target.left + target.width / 2;
  const endY = target.top + target.height / 2;
  const controlX = (startX + endX) / 2;
  const controlY = Math.min(startY, endY) - 150;
  const ghost = document.createElement('img');
  const flight = { progress: 0 };

  ghost.src = image;
  ghost.alt = '';
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    objectFit: 'cover',
    pointerEvents: 'none',
    zIndex: '9999',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(ghost);
  gsap.set(ghost, { x: startX - 30, y: startY - 30 });

  gsap.to(flight, {
    progress: 1,
    duration: 0.8,
    ease: 'power2.in',
    onUpdate: () => {
      const progress = flight.progress;
      const inverse = 1 - progress;
      const x = inverse * inverse * startX + 2 * inverse * progress * controlX + progress * progress * endX;
      const y = inverse * inverse * startY + 2 * inverse * progress * controlY + progress * progress * endY;
      gsap.set(ghost, { x: x - 30, y: y - 30, scale: inverse, opacity: inverse });
    },
    onComplete: () => {
      ghost.remove();
      const badge = document.querySelector<HTMLElement>('.header-cart-count');
      if (!badge) return;
      badge.classList.remove('is-arriving');
      void badge.offsetWidth;
      badge.classList.add('is-arriving');
      window.setTimeout(() => badge.classList.remove('is-arriving'), 500);
    },
  });
}

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
  const [isAdded, setIsAdded] = useState(false);
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

  async function addItem(buyNow = false, origin?: DOMRect) {
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
      const payload = {
        productId,
        quantity,
        ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
        ...(buyNow ? { buyNow: true } : {}),
      };
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        toast.success('🎉 Đã thêm sản phẩm vào giỏ hàng!', { duration: 2500 });
        setIsAdded(true);
        window.setTimeout(() => setIsAdded(false), 1500);
        if (origin) animateFlyToCart(image, origin);
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
          <button className="micro-tactile micro-tactile--small" type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={16} /></button>
          <input id="product-quantity" aria-label="Số lượng" type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} />
          <button className="micro-tactile micro-tactile--small" type="button" aria-label="Tăng số lượng" disabled={quantity >= 20} onClick={() => setQuantity((value) => Math.min(20, value + 1))}><Plus size={16} /></button>
        </div>
      </div>
      <div className="inline-actions" ref={primaryActionsRef}>
        <button className={`primary-action micro-tactile transition-all duration-200 active:scale-90 hover:scale-[1.02] hover:shadow-lg ${isAdded ? 'bg-emerald-600 text-white animate-bounce' : 'bg-[#9B2424] text-white'}`} type="button" onClick={(event) => void addItem(false, event.currentTarget.getBoundingClientRect())} disabled={saving || productUnavailable || Boolean(selectedVariant && selectedVariant.stock < 1)}>{isAdded ? '✓ ĐÃ THÊM THÀNH CÔNG!' : saving ? (locale === 'en' ? 'Adding...' : 'Đang thêm...') : t('addToCart')}</button>
        <button className="secondary-action micro-tactile" type="button" onClick={() => addItem(true)} disabled={saving || productUnavailable || Boolean(selectedVariant && selectedVariant.stock < 1)}>{saving ? (locale === 'en' ? 'Processing...' : 'Đang xử lý...') : t('buyNow')}</button>
      </div>
      {showStickyBuyBar && <div className="mobile-sticky-buy-bar">
        <img src={image} alt="" />
        <span><strong>{localizedName}</strong><b>{formatCurrency(selectedPrice)}</b></span>
        <button type="button" className="primary-action micro-tactile" onClick={() => void addItem(true)} disabled={saving || productUnavailable || Boolean(selectedVariant && selectedVariant.stock < 1)}>{saving ? (locale === 'en' ? 'Processing...' : 'Đang xử lý...') : t('buyNow')}</button>
      </div>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}