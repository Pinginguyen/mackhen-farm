'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { ProductVariant } from '@/lib/store-data';

export default function AddToCart({ productId, variants }: { productId: string; variants: ProductVariant[] }) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [added, setAdded] = useState(false);

  async function addItem(buyNow = false) {
    setMessage('');
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
      <label className="field" htmlFor="product-quantity">Số lượng<input id="product-quantity" type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label>
      <div className="inline-actions">
        {added ? <Link href="/cart" className="primary-action">Xem giỏ hàng</Link> : <button className="primary-action" type="button" onClick={() => addItem()}>Thêm vào giỏ</button>}
        <button className="secondary-action" type="button" onClick={() => addItem(true)}>Mua ngay</button>
      </div>
      {message && <p role="alert">{message}</p>}
    </div>
  );
}