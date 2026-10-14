'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, Printer, Search } from 'lucide-react';

export type AdminOrder = {
  id: string;
  orderCode: string;
  customer: string;
  phone: string;
  address: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  trackingCode: string | null;
  carrier: string | null;
  createdAt: string;
  items: { productName: string; sku: string; quantity: number }[];
};

const statusOptions = [
  ['PENDING', 'Chờ xác nhận'], ['CONFIRMED', 'Đã xác nhận'], ['PROCESSING', 'Đang đóng gói'],
  ['SHIPPING', 'Đang giao'], ['DELIVERED', 'Đã giao'], ['COMPLETED', 'Hoàn tất'], ['CANCELLED', 'Đã hủy'],
];
const orderStatusLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang đóng gói', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' };

export default function OrdersManager({ orders }: { orders: AdminOrder[] }) {
  const [orderList, setOrderList] = useState(orders);
  const [statusTab, setStatusTab] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    setSearch(new URLSearchParams(window.location.search).get('search') ?? '');
  }, []);

  const tabs = [
    { id: 'ALL', label: 'Tất cả' }, { id: 'PENDING', label: 'Chờ xử lý' },
    { id: 'PROCESSING', label: 'Đang đóng gói' }, { id: 'SHIPPING', label: 'Đang giao' },
    { id: 'SUCCESS', label: 'Thành công' }, { id: 'CANCELLED', label: 'Đã hủy' },
  ];
  const visibleOrders = orderList.filter((order) => {
    const matchesTab = statusTab === 'ALL'
      || (statusTab === 'PENDING' && ['PENDING', 'CONFIRMED'].includes(order.status))
      || (statusTab === 'SUCCESS' && ['DELIVERED', 'COMPLETED'].includes(order.status))
      || order.status === statusTab;
    const query = search.trim().toLocaleLowerCase('vi');
    const matchesSearch = !query || `${order.orderCode} ${order.customer} ${order.phone}`.toLocaleLowerCase('vi').includes(query);
    const orderDate = order.createdAt.slice(0, 10);
    return matchesTab
      && matchesSearch
      && (paymentMethod === 'ALL' || order.paymentMethod === paymentMethod)
      && (!dateFrom || orderDate >= dateFrom)
      && (!dateTo || orderDate <= dateTo);
  });

  const exportParams = new URLSearchParams({ format: 'csv' });
  if (search.trim()) exportParams.set('q', search.trim());
  if (statusTab !== 'ALL') exportParams.set('status', statusTab);
  if (paymentMethod !== 'ALL') exportParams.set('paymentMethod', paymentMethod);
  if (dateFrom) exportParams.set('from', dateFrom);
  if (dateTo) exportParams.set('to', dateTo);

  async function save(event: React.FormEvent<HTMLFormElement>, order: AdminOrder) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(order.orderCode);
    setToast('');
    try {
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderCode: order.orderCode, status: form.get('status'), carrier: form.get('carrier'), trackingCode: form.get('trackingCode') }) });
      const result = await response.json() as { status?: string; error?: { message?: string } };
      if (!response.ok) setToast(result.error?.message ?? 'Không thể cập nhật đơn.');
      else {
        setOrderList((current) => current.map((item) => item.orderCode === order.orderCode ? { ...item, status: result.status ?? String(form.get('status')), carrier: String(form.get('carrier') || '') || null, trackingCode: String(form.get('trackingCode') || '') || null } : item));
        setToast(`Đã cập nhật đơn ${order.orderCode}.`);
      }
    } catch {
      setToast('Không thể kết nối để cập nhật đơn.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="admin-orders">
      <div className="admin-order-tabs" role="tablist" aria-label="Lọc trạng thái đơn hàng">
        {tabs.map((tab) => <button type="button" role="tab" aria-selected={statusTab === tab.id} className={statusTab === tab.id ? 'is-active' : ''} key={tab.id} onClick={() => setStatusTab(tab.id)}>{tab.label}<span>{tab.id === 'ALL' ? orderList.length : orderList.filter((order) => tab.id === 'PENDING' ? ['PENDING', 'CONFIRMED'].includes(order.status) : tab.id === 'SUCCESS' ? ['DELIVERED', 'COMPLETED'].includes(order.status) : order.status === tab.id).length}</span></button>)}
      </div>
      <div className="admin-order-filters">
        <label className="admin-filter-search"><Search size={17} /><input aria-label="Tìm theo mã đơn, tên hoặc số điện thoại" placeholder="Mã đơn, tên khách hoặc SĐT" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="field">Thanh toán<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="ALL">Tất cả</option><option value="VIETQR">VietQR</option><option value="MOMO">MoMo</option><option value="COD">COD</option></select></label>
        <label className="field">Từ ngày<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label className="field">Đến ngày<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <a className="secondary-action" href={`/api/admin/orders?${exportParams.toString()}`}><Download size={16} /> Xuất CSV</a>
      </div>
      {toast && <p className="admin-toast" role="status">{toast}</p>}
      <p className="admin-order-result-count">Hiển thị {visibleOrders.length} / {orderList.length} đơn gần đây</p>
      <div className="admin-order-list">
        {visibleOrders.map((order) => (
          <article className="admin-order" key={order.id}>
            <header>
              <div><strong>{order.orderCode} <span className={`admin-status-badge status-${order.status.toLowerCase()}`}>{orderStatusLabels[order.status] ?? order.status}</span></strong><span>{order.customer} · {order.phone}</span><small>{new Date(order.createdAt).toLocaleString('vi-VN')}</small></div>
              <div className="admin-order-total"><span className={`admin-payment-badge ${order.paymentMethod === 'COD' ? 'cod' : order.paymentMethod.toLowerCase()}`}>{order.paymentMethod === 'VIETQR' ? 'VietQR' : order.paymentMethod === 'MOMO' ? 'MoMo' : 'COD'} · {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span><strong>{order.total.toLocaleString('vi-VN')}đ</strong></div>
            </header>
            {order.paymentMethod === 'COD' && order.total >= 200000 && <p className="cod-risk-badge">Cần xác nhận qua điện thoại</p>}
            <p className="admin-order-address">{order.address}</p>
            <ul>{order.items.map((item, index) => <li key={`${order.id}-${index}`}>{item.sku} · {item.productName} × {item.quantity}</li>)}</ul>
            <form className="admin-order-update" onSubmit={(event) => save(event, order)}>
              <label className="field">Trạng thái<select name="status" defaultValue={order.status}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="field">Đơn vị vận chuyển<select name="carrier" defaultValue={order.carrier ?? ''}><option value="">Chưa chọn</option><option value="GHTK">GHTK</option><option value="SPX">SPX Express</option><option value="VIETTEL_POST">Viettel Post</option></select></label>
              <label className="field">Mã vận đơn<input name="trackingCode" defaultValue={order.trackingCode ?? ''} /></label>
              <button className="primary-action" type="submit" disabled={pending === order.orderCode}>{pending === order.orderCode ? 'Đang lưu...' : 'Cập nhật đơn'}</button>
              <Link className="secondary-action" href={`/admin/orders/print/${encodeURIComponent(order.orderCode)}`}><Printer size={16} /> In phiếu A6</Link>
            </form>
          </article>
        ))}
        {!visibleOrders.length && <p className="empty-state">Không có đơn hàng phù hợp với bộ lọc.</p>}
      </div>
    </div>
  );
}