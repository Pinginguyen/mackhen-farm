'use client';

import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

export type CartUpsellProduct = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  stock: number;
};

export default function CartUpsell({ product, onAdded }: { product: CartUpsellProduct; onAdded?: () => void | Promise<void> }) {
  const { currency, formatCurrency, translateProductName } = useLocaleCurrency();
  const isEN = currency === 'SGD';
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function addProduct() {
    if (saving || product.stock < 1) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: product.slug, quantity: 1 }),
      });
      const result = await response.json() as { error?: { message?: string }; cartCount?: number };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể thêm sản phẩm vào giỏ.');
      window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: result.cartCount } }));
      setMessage(isEN ? 'Added to your order.' : 'Đã thêm vào đơn hàng.');
      await onAdded?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isEN ? 'Could not add this product.' : 'Không thể thêm sản phẩm này.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="cart-drawer-upsell" aria-label={isEN ? 'Suggested pairing' : 'Sản phẩm gợi ý bán kèm'}>
      <div className="cart-drawer-upsell-image"><img src={product.image} alt="" width={56} height={56} /></div>
      <div className="cart-drawer-upsell-copy"><p>{isEN ? 'SUGGESTED PAIRING' : 'GỢI Ý PHỐI VỊ'}</p><strong>{translateProductName(product.name)}</strong><span>{formatCurrency(product.price)}</span></div>
      <button type="button" onClick={() => void addProduct()} disabled={saving || product.stock < 1}>{saving ? '…' : <><ShoppingBag size={13} aria-hidden="true" /> {isEN ? 'Add' : '+ Thêm'}</>}</button>
      {message && <small className="cart-upsell-message" role="status">{message}</small>}
    </section>
  );
}