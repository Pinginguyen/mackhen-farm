'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';

import type { ProductVariant } from '@/lib/store-data';

export default function AddToCart({ productId, variants }: { productId: string; variants: ProductVariant[] }) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [added, setAdded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function addItem(buyNow = false) {
    if (saving) return;
    setMessage('');
    setSaving(true);
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, variantId: variantId || undefined, quantity }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'Không thể thêm sản phẩm vào giỏ.');
        return;
      }
      setAdded(true);
      if (buyNow) router.push('/checkout');
    } catch {
      setMessage('Không thể kết nối để cập nhật giỏ hàng.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cart-add-control">
      {variants.length > 0 && (
        <label className="field">
          <span>Phân loại</span>
          <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
            {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label} · {variant.price.toLocaleString('vi-VN')}đ</option>)}
          </select>
        </label>
      )}
      <div className="field">
        <span id="product-quantity-label">Số lượng</span>
        <div className="quantity-stepper" role="group" aria-labelledby="product-quantity-label">
          <button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={16} /></button>
          <input id="product-quantity" aria-label="Số lượng" type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Math.min(99, Math.max(1, Number(event.target.value) || 1)))} />
          <button type="button" aria-label="Tăng số lượng" disabled={quantity >= 99} onClick={() => setQuantity((value) => Math.min(99, value + 1))}><Plus size={16} /></button>
        </div>
      </div>
      <div className="inline-actions">
        {added ? <Link href="/cart" className="primary-action">Xem giỏ hàng</Link> : <button className="primary-action" type="button" onClick={() => addItem()} disabled={saving}>{saving ? 'Đang thêm...' : 'Thêm vào giỏ'}</button>}
        <button className="secondary-action" type="button" onClick={() => addItem(true)} disabled={saving}>Mua ngay</button>
      </div>
      {message && <p role="alert">{message}</p>}
    </div>
  );
}