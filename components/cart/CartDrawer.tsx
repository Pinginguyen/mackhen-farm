'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';
import CartUpsell from './CartUpsell';
import type { CartUpsellProduct } from './CartUpsell';

type CartVariant = { id: string; label: string; price: number; weight: string; stock: number };
type CartItem = {
  id: string;
  productId: string;
  productSlug: string;
  image: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  stock: number;
  variantId: string | null;
  variantLabel: string | null;
  variants: CartVariant[];
  upsellProduct: CartUpsellProduct | null;
};
type CartSnapshot = { items: CartItem[]; subtotal: number; shipping: number; total: number; freeShippingThreshold: number; tasteGuaranteeText: string };

const emptyCart: CartSnapshot = { items: [], subtotal: 0, shipping: 0, total: 0, freeShippingThreshold: 0, tasteGuaranteeText: '' };

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartSnapshot>(emptyCart);
  const [loading, setLoading] = useState(false);
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const { currency, formatCurrency, translateProductName, locale } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const freeShippingThreshold = cart.freeShippingThreshold;
  const progress = freeShippingThreshold > 0 ? Math.min(100, Math.round(cart.subtotal / freeShippingThreshold * 100)) : 0;
  const reachedThreshold = freeShippingThreshold > 0 && cart.subtotal >= freeShippingThreshold;
  const freeShipping = cart.items.length > 0 && cart.shipping === 0;

  async function loadCart() {
    setLoading(true);
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load cart');
      setCart(await response.json() as CartSnapshot);
      setMessage('');
    } catch {
      setMessage(isEN ? 'Your cart could not be loaded.' : 'Không thể tải giỏ hàng.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const openDrawer = () => setOpen(true);
    window.addEventListener('mackhen:cart-drawer-open', openDrawer);
    return () => window.removeEventListener('mackhen:cart-drawer-open', openDrawer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const syncCart = () => { void loadCart(); };
    window.addEventListener('mackhen:cart-sync', syncCart);
    return () => window.removeEventListener('mackhen:cart-sync', syncCart);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    void loadCart();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  async function updateItem(item: CartItem, quantity: number) {
    if (pendingItem) return;
    setPendingItem(item.id);
    setMessage('');
    try {
      const response = quantity < 1
        ? await fetch('/api/cart/items', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId: item.id }) })
        : await fetch('/api/cart/items', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId: item.id, quantity, variantId: item.variantId }) });
      const result = await response.json() as { error?: { message?: string }; cartCount?: number };
      if (!response.ok) throw new Error(result.error?.message ?? 'Cart update failed');
      await loadCart();
      window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: result.cartCount } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isEN ? 'Cart update failed.' : 'Không thể cập nhật giỏ hàng.'));
    } finally {
      setPendingItem(null);
    }
  }

  const upsellProduct = cart.items
    .map((item) => item.upsellProduct)
    .find((product): product is CartUpsellProduct => Boolean(product && product.stock > 0 && !cart.items.some((item) => item.productId === product.id)));

  if (!open) return null;

  return (
    <div className="cart-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header className="cart-drawer-header">
          <div><p className="eyebrow">{isEN ? 'MAC KHEN FARM' : 'MẮC KHÉN FARM'}</p><h2 id="cart-drawer-title">{isEN ? 'Your Cart' : 'Giỏ hàng của bạn'}</h2></div>
          <button type="button" className="cart-drawer-close" aria-label={isEN ? 'Close cart' : 'Đóng giỏ hàng'} onClick={() => setOpen(false)}><X size={20} /></button>
        </header>
        {cart.items.length > 0 && <section className={`drawer-shipping-progress${freeShipping ? ' is-free' : ''}${reachedThreshold ? ' is-goal-reached' : ''}`} aria-live="polite">
          <div className="drawer-shipping-copy"><Truck size={18} aria-hidden="true" /><p>{freeShipping ? (isEN ? 'Free shipping unlocked.' : 'Đơn hàng được miễn phí vận chuyển.') : (isEN ? `Add ${formatCurrency(Math.max(0, freeShippingThreshold - cart.subtotal))} for free shipping.` : `Mua thêm ${formatCurrency(Math.max(0, freeShippingThreshold - cart.subtotal))} để được miễn phí vận chuyển.`)}</p></div>
          <div className="drawer-shipping-track" role="progressbar" aria-label={isEN ? 'Free shipping progress' : 'Tiến trình miễn phí vận chuyển'} aria-valuemin={0} aria-valuemax={freeShippingThreshold} aria-valuenow={Math.min(cart.subtotal, freeShippingThreshold)}><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
          <small>{formatCurrency(Math.min(cart.subtotal, freeShippingThreshold))} / {formatCurrency(freeShippingThreshold)}</small>
        </section>}
        <div className="cart-drawer-items" aria-live="polite">
          {loading && !cart.items.length ? <p className="cart-drawer-message">{isEN ? 'Loading your cart…' : 'Đang tải giỏ hàng…'}</p> : cart.items.length ? cart.items.map((item) => {
            const maxQuantity = item.variants.find((variant) => variant.id === item.variantId)?.stock ?? item.stock;
            return <article className="cart-drawer-item" key={item.id}>
              <img src={item.image} alt="" width={64} height={64} />
              <div className="cart-drawer-item-copy"><strong>{translateProductName(item.name)}</strong>{item.variantLabel && <small>{item.variantLabel}</small>}<span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                <div className="cart-drawer-stepper" role="group" aria-label={isEN ? `Quantity of ${item.name}` : `Số lượng ${item.name}`}>
                  <button type="button" aria-label={isEN ? 'Decrease quantity' : 'Giảm số lượng'} disabled={pendingItem === item.id || item.quantity <= 1} onClick={() => void updateItem(item, item.quantity - 1)}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label={isEN ? 'Increase quantity' : 'Tăng số lượng'} disabled={pendingItem === item.id || item.quantity >= maxQuantity} onClick={() => void updateItem(item, item.quantity + 1)}><Plus size={14} /></button>
                  <button className="cart-drawer-remove" type="button" aria-label={isEN ? 'Remove item' : 'Xóa sản phẩm'} disabled={pendingItem === item.id} onClick={() => void updateItem(item, 0)}><Trash2 size={14} /></button>
                </div>
              </div>
            </article>;
          }) : <div className="cart-drawer-empty"><ShoppingBag size={28} /><p>{isEN ? 'Your cart is empty.' : 'Giỏ hàng đang trống.'}</p><Link href="/products" onClick={() => setOpen(false)}>{isEN ? 'Explore products' : 'Khám phá sản phẩm'}</Link></div>}
          {upsellProduct && <CartUpsell product={upsellProduct} onAdded={loadCart} />}
        </div>
        {message && <p className="cart-drawer-message" role="status">{message}</p>}
        {cart.items.length > 0 && <footer className="cart-drawer-footer">
          <div className="cart-drawer-subtotal"><span>{isEN ? 'Subtotal' : 'Tạm tính'}</span><strong>{formatCurrency(cart.subtotal)}</strong></div>
          <Link className="cart-drawer-checkout" href="/checkout" onClick={() => setOpen(false)}>{isEN ? 'Proceed to Checkout' : 'Thanh toán'}</Link>
          <Link className="cart-drawer-full-cart" href="/cart" onClick={() => setOpen(false)}>{isEN ? 'View full cart' : 'Xem giỏ hàng đầy đủ'}</Link>
        </footer>}
      </aside>
    </div>
  );
}