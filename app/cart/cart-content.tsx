'use client';

import { useEffect, useRef, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Link from 'next/link';
import { Minus, Plus, Trash2, Truck } from 'lucide-react';

import { calculateShipping, FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import { useLocaleCurrency } from '@/lib/i18n-context';

type CartVariant = { id: string; label: string; price: number; weight: string; stock: number };
type CartItem = {
  id: string;
  productId: string;
  productSlug: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  total: number;
  stock: number;
  variantId: string | null;
  variantLabel: string | null;
  variants: CartVariant[];
};

export function CartPageHeading() {
  const { currency } = useLocaleCurrency();
  const isEN = currency === 'SGD';

  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{isEN ? 'SHOPPING CART' : 'GIỎ HÀNG'}</p>
        <h2>{isEN ? 'Your Order' : 'Đơn hàng của bạn'}</h2>
      </div>
    </div>
  );
}

function CartItemRow({
  item,
  onUpdate,
}: {
  item: CartItem;
  onUpdate: (id: string, quantity: number, variantId: string | null) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const { currency, formatCurrency, translateProductName } = useLocaleCurrency();
  const isEN = currency === 'SGD';
  const productName = translateProductName(item.name);
  const selectedVariant = item.variants.find((variant) => variant.id === item.variantId);
  const maxQuantity = selectedVariant?.stock ?? item.stock;
  const unitPrice = selectedVariant?.price ?? item.unitPrice;

  async function update(quantity: number, variantId = item.variantId) {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdate(item.id, quantity, variantId);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`cart-item micro-opacity flex w-full max-w-none flex-nowrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-[box-shadow,opacity] duration-150 hover:shadow-md${saving ? ' is-pending' : ''}`}>
      <div className="cart-item-image">
        <img src={item.image} alt={productName} />
      </div>
      <div className="cart-item-info min-w-0 flex-1">
        <h3 className="truncate font-semibold text-gray-900">{productName}</h3>
        {item.variantLabel && <div>{item.variantLabel}</div>}
        <div className="cart-item-meta">
          <span>{formatCurrency(unitPrice)} / {isEN ? 'item' : 'đơn'}</span>
          <span className={`product-status ${maxQuantity > 0 ? 'in-stock' : 'out-of-stock'}`}>{maxQuantity > 0 ? (isEN ? 'In Stock' : 'Còn hàng') : (isEN ? 'Out of Stock' : 'Hết hàng')}</span>
        </div>
      </div>
      <div className="cart-item-controls">
        {item.variants.length > 1 && (
          <label className="field">
            <span>{isEN ? 'Variant' : 'Phân loại'}</span>
            <select value={item.variantId ?? ''} onChange={(event) => {
              const nextVariantId = event.target.value || null;
              const nextVariant = item.variants.find((variant) => variant.id === nextVariantId);
              void update(Math.min(item.quantity, nextVariant?.stock ?? item.stock), nextVariantId);
            }} disabled={saving}>
              {item.variants.map((variant) => <option key={variant.id} value={variant.id} disabled={variant.stock < 1 && variant.id !== item.variantId}>{variant.label} · {formatCurrency(variant.price)}</option>)}
            </select>
          </label>
        )}
        <div className="field">
          <span id={`cart-quantity-label-${item.id}`}>{isEN ? 'Qty' : 'Số lượng'}</span>
          <div className="quantity-stepper" role="group" aria-labelledby={`cart-quantity-label-${item.id}`}>
            <button type="button" aria-label={`${isEN ? 'Decrease quantity of' : 'Giảm số lượng'} ${productName}`} disabled={saving || item.quantity <= 1} onClick={() => { if (item.quantity > 1) void update(item.quantity - 1); }}><Minus size={16} /></button>
            <input aria-label={`${isEN ? 'Quantity of' : 'Số lượng'} ${productName}`} type="number" min={1} max={maxQuantity} value={item.quantity} disabled={saving} readOnly />
            <button type="button" aria-label={`${isEN ? 'Increase quantity of' : 'Tăng số lượng'} ${productName}`} disabled={saving || item.quantity >= maxQuantity} onClick={() => void update(Math.min(maxQuantity, item.quantity + 1))}><Plus size={16} /></button>
          </div>
        </div>
      </div>
      <strong className="cart-item-total w-28 shrink-0 text-right font-bold text-[#9B2424]">{formatCurrency(unitPrice * item.quantity)}</strong>
      <button className="cart-item-remove micro-tactile micro-tactile--small" type="button" aria-label={`${isEN ? 'Remove' : 'Xóa'} ${productName} ${isEN ? 'from cart' : 'khỏi giỏ hàng'}`} title={isEN ? 'Remove item' : 'Xóa sản phẩm'} disabled={saving} onClick={() => void update(0)}><Trash2 size={17} /></button>
    </div>
  );
}

export default function CartContent({ initialItems }: { initialItems: CartItem[] }) {
  const { currency, formatCurrency } = useLocaleCurrency();
  const isEN = currency === 'SGD';
  const [items, setItems] = useState(initialItems);
  const [cartListRef] = useAutoAnimate();
  const itemsRef = useRef(initialItems);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = calculateShipping(subtotal, items.map((item) => item.productSlug));
  const total = subtotal + shipping;
  const freeShipping = items.length > 0 && shipping === 0;
  const freeShippingApplied = subtotal >= FREE_SHIPPING_THRESHOLD;
  const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  function commitItems(nextItems: CartItem[]) {
    itemsRef.current = nextItems;
    setItems(nextItems);
    try {
      window.localStorage.setItem('bohoch_cart_quantities', JSON.stringify(nextItems.map(({ id, quantity, variantId }) => ({ id, quantity, variantId }))));
    } catch {
      return;
    }
    window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: nextItems.reduce((sum, item) => sum + item.quantity, 0) } }));
  }

  useEffect(() => {
    try {
      window.localStorage.setItem('bohoch_cart_quantities', JSON.stringify(items.map(({ id, quantity, variantId }) => ({ id, quantity, variantId }))));
    } catch {
      return;
    }
  }, []);

  async function updateItem(itemId: string, quantity: number, variantId: string | null) {
    const currentItems = itemsRef.current;
    const previousItem = currentItems.find((item) => item.id === itemId);
    if (!previousItem) return;

    const selectedVariant = previousItem.variants.find((variant) => variant.id === variantId);
    const unitPrice = selectedVariant?.price ?? previousItem.unitPrice;
    const updatedItem = { ...previousItem, quantity, variantId, variantLabel: selectedVariant?.label ?? null, unitPrice, total: unitPrice * quantity, stock: selectedVariant?.stock ?? previousItem.stock };
    const optimisticItems = quantity <= 0
      ? currentItems.filter((item) => item.id !== itemId)
      : currentItems.map((item) => item.id === itemId ? updatedItem : item);
    commitItems(optimisticItems);

    try {
      const response = quantity <= 0
        ? await fetch('/api/cart/items', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId }) })
        : await fetch('/api/cart/items', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId, quantity, variantId }) });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể đồng bộ giỏ hàng.');
    } catch (error) {
      const latestItems = itemsRef.current;
      const restoredItems = latestItems.some((item) => item.id === itemId)
        ? latestItems.map((item) => item.id === itemId ? previousItem : item)
        : [...latestItems, previousItem];
      commitItems(restoredItems);
      throw error;
    }
  }

  return (
    <div className="checkout-layout cart-content-layout">
      <div ref={cartListRef} className="w-full max-w-none">
        {items.length > 0 && <section className={`free-shipping-progress cart-free-shipping${freeShipping ? ' is-free' : ''}`} aria-live="polite"><div className="cart-free-shipping-message"><Truck size={18} strokeWidth={1.8} aria-hidden="true" /><p>{freeShipping ? (isEN ? 'Congratulations! You unlocked FREE SHIPPING!' : 'Chúc mừng! Đơn hàng của bạn được miễn phí vận chuyển.') : (isEN ? `Add ${formatCurrency(remaining)} more to get free nationwide shipping.` : `Mua thêm ${remaining.toLocaleString('vi-VN')}đ để được miễn phí vận chuyển.`)}</p></div><div className="free-shipping-track" role="progressbar" aria-label={isEN ? 'Free shipping progress' : 'Tiến trình đạt miễn phí vận chuyển'} aria-valuemin={0} aria-valuemax={FREE_SHIPPING_THRESHOLD} aria-valuenow={Math.min(subtotal, FREE_SHIPPING_THRESHOLD)}><span className="free-shipping-fill" style={{ width: '100%', transform: `scaleX(${progress / 100})` }} /></div><small>{formatCurrency(Math.min(subtotal, FREE_SHIPPING_THRESHOLD))} / {formatCurrency(FREE_SHIPPING_THRESHOLD)}</small></section>}
        {items.length ? items.map((item) => <CartItemRow key={item.id} item={item} onUpdate={updateItem} />) : <p className="empty-state">{isEN ? 'Your cart is empty.' : 'Giỏ hàng của bạn đang trống.'}</p>}
      </div>
      <aside className="summary-card">
        <h3>{isEN ? 'Order Summary' : 'Tổng thanh toán'}</h3>
        <div className="summary-list">
          <div className="item"><span>{isEN ? 'Subtotal' : 'Tạm tính'}</span><strong>{formatCurrency(subtotal)}</strong></div>
          <div className="item"><span>{isEN ? 'Shipping' : 'Vận chuyển'}</span><strong>{freeShippingApplied ? <><del>{formatCurrency(35000)}</del> {formatCurrency(0)}</> : items.length && shipping === 0 ? (isEN ? `Free · ${formatCurrency(0)}` : `Miễn phí · ${formatCurrency(0)}`) : formatCurrency(shipping)}</strong></div>
          <div className="item"><span>{isEN ? 'Total' : 'Thành tiền'}</span><strong>{formatCurrency(total)}</strong></div>
        </div>
        {freeShippingApplied && <p className="automatic-shipping-banner" role="status">{isEN ? 'System automatically applied best discount: Free shipping (-35.000đ)' : 'Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ)'}</p>}
        {!freeShippingApplied && items.length > 0 && shipping === 0 && <p className="free-shipping-note">{isEN ? `Free nationwide shipping (${formatCurrency(0)}).` : 'Bạn được MIỄN PHÍ VẬN CHUYỂN toàn quốc (0đ).'}</p>}
        <div className="cart-footer">
          <Link href="/products" className="secondary-action micro-tactile">{isEN ? 'Continue Shopping' : 'Tiếp tục mua'}</Link>
          <Link href="/checkout" aria-disabled={!items.length} className={`primary-action micro-tactile${items.length ? '' : ' is-disabled'}`}>{isEN ? 'Proceed to Checkout' : 'Thanh toán'}</Link>
        </div>
      </aside>
    </div>
  );
}