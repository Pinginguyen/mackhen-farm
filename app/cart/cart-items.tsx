'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';

import { formatCurrency } from '@/lib/store-data';

type CartVariant = { id: string; label: string; price: number; weight: string; stock: number };
type CartItem = {
  id: string;
  name: string;
  image: string;
  quantity: number;
  total: number;
  stock: number;
  variantId: string | null;
  variantLabel: string | null;
  variants: CartVariant[];
};

function CartItemEditor({ item }: { item: CartItem }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(item.quantity);
  const [variantId, setVariantId] = useState(item.variantId ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const selectedVariant = item.variants.find((variant) => variant.id === variantId);
  const maxQuantity = selectedVariant?.stock ?? item.stock;
  const changed = quantity !== item.quantity || variantId !== (item.variantId ?? '');

  useEffect(() => {
    setQuantity(item.quantity);
    setVariantId(item.variantId ?? '');
  }, [item.quantity, item.variantId]);

  async function saveChanges() {
    if (saving || !changed) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/cart/items', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, quantity, variantId: variantId || null }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'Không thể cập nhật giỏ hàng.');
        return;
      }
      setMessage('Đã cập nhật giỏ hàng.');
      router.refresh();
    } catch {
      setMessage('Không thể kết nối để cập nhật giỏ hàng.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="table-row cart-item">
      <img src={item.image} alt={item.name} />
      <div className="cart-item-info">
        <strong>{item.name}</strong>
        {item.variantLabel && <div>{item.variantLabel}</div>}
      </div>
      <div className="cart-item-controls">
        {item.variants.length > 1 && (
          <label className="field">
            <span>Phân loại</span>
            <select value={variantId} onChange={(event) => { setVariantId(event.target.value); setMessage(''); }} disabled={saving}>
              {item.variants.map((variant) => <option key={variant.id} value={variant.id} disabled={variant.stock < 1 && variant.id !== variantId}>{variant.label} · {formatCurrency(variant.price)}</option>)}
            </select>
          </label>
        )}
        <div className="field">
          <span id={`cart-quantity-label-${item.id}`}>Số lượng</span>
          <div className="quantity-stepper" role="group" aria-labelledby={`cart-quantity-label-${item.id}`}>
            <button type="button" aria-label={`Giảm số lượng ${item.name}`} disabled={quantity <= 1 || saving} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={16} /></button>
            <input aria-label={`Số lượng ${item.name}`} type="number" min={1} max={maxQuantity} value={quantity} disabled={saving} onChange={(event) => setQuantity(Math.min(maxQuantity, Math.max(1, Number(event.target.value) || 1)))} />
            <button type="button" aria-label={`Tăng số lượng ${item.name}`} disabled={quantity >= maxQuantity || saving} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}><Plus size={16} /></button>
          </div>
        </div>
        {message && <p className="cart-item-message" role="status">{message}</p>}
        <button className="secondary-action cart-item-update" type="button" onClick={saveChanges} disabled={!changed || saving || quantity > maxQuantity || maxQuantity < 1}>
          {saving ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
      </div>
      <strong className="cart-item-total">{formatCurrency(item.total)}</strong>
    </div>
  );
}

export default function CartItems({ items }: { items: CartItem[] }) {
  return <div>{items.map((item) => <CartItemEditor key={item.id} item={item} />)}</div>;
}