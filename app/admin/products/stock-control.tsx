'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export default function StockControl({ productId, currentPrice, currentStock, active: initialActive }: { productId: string; currentPrice: number; currentStock: number; active: boolean }) {
  const [price, setPrice] = useState(currentPrice);
  const [stock, setStock] = useState(currentStock);
  const [savedPrice, setSavedPrice] = useState(currentPrice);
  const [savedStock, setSavedStock] = useState(currentStock);
  const [active, setActive] = useState(initialActive);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function update(payload: { price?: number; stock?: number; stockDelta?: number; active?: boolean }) {
    setMessage('');
    setSaving(true);
    try {
      const response = await fetch('/api/admin/inventory', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, ...payload }) });
      const result = await response.json() as { message?: string; error?: { message?: string }; product?: { price: number; stock: number; active: boolean } };
      if (!response.ok || !result.product) {
        setMessage(result.error?.message ?? 'Không thể cập nhật sản phẩm.');
        return;
      }
      setPrice(result.product.price);
      setStock(result.product.stock);
      setSavedPrice(result.product.price);
      setSavedStock(result.product.stock);
      setActive(result.product.active);
      setMessage(result.message ?? 'Đã cập nhật thành công.');
    } catch {
      setMessage('Không thể kết nối để cập nhật.');
    } finally {
      setSaving(false);
    }
  }

  const stockLevel = stock < 30 ? 'low' : 'normal';
  const stockPercent = Math.min(100, Math.round((stock / 100) * 100));

  return <>
    <td>
      <div className="admin-price-edit">
        <label className="admin-input-wrap"><span aria-hidden="true">đ</span><input className="product-price-input" aria-label="Giá bán (VNĐ)" type="number" min={0} step={1000} value={price} onChange={(event) => setPrice(Math.max(0, Number(event.target.value)))} /></label>
        {price !== savedPrice && <button className="admin-save-btn" type="button" onClick={() => update({ price, ...(stock !== savedStock ? { stock } : {}) })} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu giá'}</button>}
      </div>
    </td>
    <td>
      <div className={`admin-stock-edit ${stockLevel}`}>
        <div className="admin-stock-value"><strong>{stock}</strong><span>{stockLevel === 'low' ? 'Thấp' : 'Bình thường'}</span></div>
        <div className="admin-stock-track"><span style={{ width: `${stockPercent}%` }} /></div>
        <div className="admin-stock-controls">
          <button type="button" aria-label="Giảm tồn kho một đơn vị" onClick={() => update({ stockDelta: -1 })} disabled={saving || stock <= 0}><Minus size={14} /></button>
          <button type="button" aria-label="Tăng tồn kho một đơn vị" onClick={() => update({ stockDelta: 1 })} disabled={saving}><Plus size={14} /></button>
          <input aria-label="Tồn kho mới" type="number" min={0} value={stock} onChange={(event) => setStock(Math.max(0, Number(event.target.value)))} />
          {stock !== savedStock && <button className="admin-save-btn" type="button" onClick={() => update({ stock })} disabled={saving}>{saving ? '...' : 'Lưu'}</button>}
        </div>
      </div>
    </td>
    <td>
      <button className={`admin-product-toggle ${active ? 'is-active' : ''}`} type="button" role="switch" aria-checked={active} onClick={() => update({ active: !active })} disabled={saving}>
        <span />{active ? 'Đang mở bán' : 'Tạm ẩn sản phẩm'}
      </button>
      {message && <span className={message.startsWith('Không') ? 'stock-save-error' : 'stock-save-success'} role="status">{message}</span>}
    </td>
  </>;
}