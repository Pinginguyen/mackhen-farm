'use client';

import { useState } from 'react';

export default function StockControl({ productId, currentStock }: { productId: string; currentStock: number }) {
  const [stock, setStock] = useState(currentStock);
  const [message, setMessage] = useState('');

  async function save() {
    setMessage('');
    try {
      const response = await fetch('/api/admin/inventory', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, stock }) });
      const result = await response.json() as { error?: { message?: string } };
      setMessage(response.ok ? 'Đã lưu' : result.error?.message ?? 'Không thể cập nhật');
    } catch {
      setMessage('Không thể kết nối');
    }
  }

  return <div className="stock-control"><input aria-label="Số lượng tồn kho" type="number" min={0} value={stock} onChange={(event) => setStock(Math.max(0, Number(event.target.value)))} /><button className="secondary-action" type="button" onClick={save}>Lưu</button>{message && <span role="status">{message}</span>}</div>;
}