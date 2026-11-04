'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { calculateShipping, FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import { useLocaleCurrency } from '@/lib/i18n-context';

type CartVariant = { id: string; label: string; price: number; weight: string; stock: number };
type UpsellProduct = { id: string; slug: string; name: string; image: string; price: number; stock: number };
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
};
type CartSnapshot = { items: CartItem[]; subtotal: number; shipping: number; total: number };

const emptyCart: CartSnapshot = { items: [], subtotal: 0, shipping: 0, total: 0 };
const UPSELL_SLUG = 'muoi-cham-cheo-hat-doi-rang-kho';

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartSnapshot>(emptyCart);
  const [upsellProduct, setUpsellProduct] = useState<UpsellProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const { currency, formatCurrency, translateProductName, locale } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const progress = Math.min(100, Math.round(cart.subtotal / FREE_SHIPPING_THRESHOLD * 100));
  const reachedThreshold = cart.subtotal >= FREE_SHIPPING_THRESHOLD;
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

  async function loadUpsellProduct() {
    try {
      const response = await fetch(`/api/products/${UPSELL_SLUG}`, { cache: 'no-store' });
      if (!response.ok) return setUpsellProduct(null);
      const result = await response.json() as { product?: UpsellProduct };
      setUpsellProduct(result.product ?? null);
    } catch {
      setUpsellProduct(null);
    }
  }

  useEffect(() => {
    const openDrawer = () => setOpen(true);
    window.addEventListener('mackhen:cart-drawer-open', openDrawer);
    return () => window.removeEventListener('mackhen:cart-drawer-open', openDrawer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    void loadCart();
    void loadUpsellProduct();
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

  async function addUpsell() {
    if (!upsellProduct || pendingItem) return;
    setPendingItem('upsell');
    setMessage('');
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: upsellProduct.slug, quantity: 1 }),
      });
      const result = await response.json() as { error?: { message?: string }; cartCount?: number };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể thêm sản phẩm vào giỏ.');
      await loadCart();
      window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: result.cartCount } }));
      setMessage(isEN ? 'Chẳm chéo added to your cart.' : 'Đã thêm Muối Chẳm Chéo vào giỏ hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isEN ? 'Cart update failed.' : 'Không thể thêm sản phẩm vào giỏ.'));
    } finally {
      setPendingItem(null);
    }
  }

  const hasChamCheo = cart.items.some((item) => /cham.?cheo/i.test(`${item.productSlug} ${item.name}`));

  if (!open) return null;

  return (
    <div className="cart-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header className="cart-drawer-header">
          <div><p className="eyebrow">{isEN ? 'MAC KHEN FARM' : 'MẮC KHÉN FARM'}</p><h2 id="cart-drawer-title">{isEN ? 'Your Cart' : 'Giỏ hàng của bạn'}</h2></div>
          <button type="button" className="cart-drawer-close" aria-label={isEN ? 'Close cart' : 'Đóng giỏ hàng'} onClick={() => setOpen(false)}><X size={20} /></button>
        </header>
        {cart.items.length > 0 && <section className={`drawer-shipping-progress${freeShipping ? ' is-free' : ''}${reachedThreshold ? ' is-goal-reached' : ''}`} aria-live="polite">
          <div className="drawer-shipping-copy"><Truck size={18} aria-hidden="true" /><p>{freeShipping ? (isEN ? 'Free shipping unlocked.' : 'Đơn hàng được miễn phí vận chuyển.') : (isEN ? `Add ${formatCurrency(Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subtotal))} for free shipping.` : `Mua thêm ${formatCurrency(Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subtotal))} để được miễn phí vận chuyển.`)}</p></div>
          <div className="drawer-shipping-track" role="progressbar" aria-label={isEN ? 'Free shipping progress' : 'Tiến trình miễn phí vận chuyển'} aria-valuemin={0} aria-valuemax={FREE_SHIPPING_THRESHOLD} aria-valuenow={Math.min(cart.subtotal, FREE_SHIPPING_THRESHOLD)}><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
          <small>{formatCurrency(Math.min(cart.subtotal, FREE_SHIPPING_THRESHOLD))} / {formatCurrency(FREE_SHIPPING_THRESHOLD)}</small>
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
          {!hasChamCheo && upsellProduct && upsellProduct.stock > 0 && <section className="cart-drawer-upsell">
            <div className="cart-drawer-upsell-image"><img src={upsellProduct.image} alt="" width={56} height={56} /></div>
            <div className="cart-drawer-upsell-copy"><p>{isEN ? 'A Northwest favorite' : 'MÓN NHẮM GỢI Ý'}</p><strong>{isEN ? 'Plant jerky loves chẳm chéo.' : 'Ăn khô bò phải chấm chẳm chéo!'}</strong><span>{translateProductName(upsellProduct.name)} · {formatCurrency(upsellProduct.price)}</span></div>
            <button type="button" onClick={() => void addUpsell()} disabled={pendingItem !== null} aria-label={isEN ? 'Add chẳm chéo to cart' : 'Thêm Muối Chẳm Chéo vào giỏ'}>{pendingItem === 'upsell' ? '…' : '+ Thêm'}</button>
          </section>}
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