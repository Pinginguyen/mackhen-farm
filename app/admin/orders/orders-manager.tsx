'use client';

import Link from 'next/link';
import { useState } from 'react';

export type AdminOrder = {
  id: string;
  orderCode: string;
  customer: string;
  phone: string;
  address: string;
  status: string;
  paymentStatus: string;
  total: number;
  trackingCode: string | null;
  carrier: string | null;
  createdAt: string;
  items: { productName: string; sku: string; quantity: number }[];
};

const statusOptions = [
  ['PENDING', 'Chờ xác nhận'], ['CONFIRMED', 'Đã xác nhận'], ['PROCESSING', 'Đang đóng gói'],
  ['SHIPPING', 'Đang giao'], ['DELIVERED', 'Đã giao'], ['CANCELLED', 'Đã hủy'],
];

export default function OrdersManager({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const visibleOrders = filter === 'ALL' ? orders : orders.filter((order) => order.status === filter);

  async function save(event: React.FormEvent<HTMLFormElement>, order: AdminOrder) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(order.orderCode);
    setMessage('');
    try {
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderCode: order.orderCode, status: form.get('status'), carrier: form.get('carrier'), trackingCode: form.get('trackingCode') }) });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) setMessage(result.error?.message ?? 'Không thể cập nhật đơn.');
      else window.location.reload();
    } catch {
      setMessage('Không thể kết nối để cập nhật đơn.');
    } finally {
      setPending(null);
    }
  }

  return <div className="admin-orders"><div className="admin-order-tools"><label className="field">Lọc trạng thái<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">Tất cả</option>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><a className="secondary-action" href="/api/admin/orders?format=csv">Xuất CSV</a></div>{message && <p role="alert">{message}</p>}<div className="admin-order-list">{visibleOrders.map((order) => <article className="admin-order" key={order.id}><header><div><strong>{order.orderCode}</strong><span>{order.customer} · {order.phone}</span></div><strong>{order.total.toLocaleString('vi-VN')}đ</strong></header><p>{order.address}</p><ul>{order.items.map((item, index) => <li key={`${order.id}-${index}`}>{item.sku} · {item.productName} × {item.quantity}</li>)}</ul><form className="admin-order-update" onSubmit={(event) => save(event, order)}><label className="field">Trạng thái<select name="status" defaultValue={order.status}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field">Đơn vị<select name="carrier" defaultValue={order.carrier ?? ''}><option value="">Chưa chọn</option><option value="GHTK">GHTK</option><option value="SPX">SPX Express</option></select></label><label className="field">Mã vận đơn<input name="trackingCode" defaultValue={order.trackingCode ?? ''} /></label><button className="primary-action" type="submit" disabled={pending === order.orderCode}>{pending === order.orderCode ? 'Đang lưu...' : 'Cập nhật'}</button><Link className="secondary-action" href={`/admin/orders/print/${encodeURIComponent(order.orderCode)}`}>In phiếu giao hàng</Link></form></article>)}{!visibleOrders.length && <p>Không có đơn hàng ở trạng thái này.</p>}</div></div>;
}