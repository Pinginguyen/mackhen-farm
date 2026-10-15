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
  hasOpenCase?: boolean;
  createdAt: string;
  items: { productName: string; sku: string; quantity: number }[];
};

const statusOptions = [
  ['PENDING', 'Chờ thanh toán / xác nhận'], ['CONFIRMED', 'Đã xác nhận'], ['PAID', 'Đã thanh toán'], ['PROCESSING', 'Đang đóng gói phòng sạch'],
  ['HANDED_OFF', 'Đã bàn giao 3PL'], ['IN_TRANSIT', 'Đang giao hàng'], ['SHIPPING', 'Đang giao (cũ)'],
  ['DELIVERED', 'Giao thành công'], ['COMPLETED', 'Hoàn tất'], ['CANCELLED', 'Đã hủy'],
];
const orderStatusLabels: Record<string, string> = { PENDING: 'Chờ thanh toán / xác nhận', CONFIRMED: 'Đã xác nhận', PAID: 'Đã thanh toán', PROCESSING: 'Đang đóng gói', HANDED_OFF: 'Đã bàn giao 3PL', IN_TRANSIT: 'Đang giao hàng', SHIPPING: 'Đang giao', DELIVERED: 'Giao thành công', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' };

export default function OrdersManager({ orders }: { orders: AdminOrder[] }) {
  const [orderList, setOrderList] = useState(orders);
  const [statusTab, setStatusTab] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('20');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    setSearch(new URLSearchParams(window.location.search).get('search') ?? '');
  }, []);

  const tabs = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'PENDING', label: 'Chờ thanh toán / xác nhận' },
    { id: 'PAID', label: 'Đã thanh toán' },
    { id: 'PROCESSING', label: 'Đóng gói · FEFO & hút oxy' },
    { id: 'HANDED_OFF', label: 'Đã bàn giao 3PL' },
    { id: 'IN_TRANSIT', label: 'Đang giao hàng' },
    { id: 'SUCCESS', label: 'Giao thành công' },
    { id: 'RETURNS', label: 'Đổi trả / bảo hành' },
    { id: 'CANCELLED', label: 'Đã hủy' },
  ];
  function orderMatchesTab(order: AdminOrder, tab: string) {
    if (tab === 'ALL') return true;
    if (tab === 'PENDING') return order.status !== 'CANCELLED' && (['PENDING', 'CONFIRMED'].includes(order.status) || order.paymentStatus === 'PENDING');
    if (tab === 'PAID') return order.paymentStatus === 'PAID';
    if (tab === 'SUCCESS') return ['DELIVERED', 'COMPLETED'].includes(order.status);
    if (tab === 'RETURNS') return order.hasOpenCase === true;
    return order.status === tab;
  }
  const visibleOrders = orderList.filter((order) => {
    const matchesTab = orderMatchesTab(order, statusTab);
    const query = search.trim().toLocaleLowerCase('vi');
    const matchesSearch = !query || `${order.orderCode} ${order.customer} ${order.phone}`.toLocaleLowerCase('vi').includes(query);
    const orderDate = order.createdAt.slice(0, 10);
    return matchesTab
      && matchesSearch
      && (paymentMethod === 'ALL' || order.paymentMethod === paymentMethod)
      && (!dateFrom || orderDate >= dateFrom)
      && (!dateTo || orderDate <= dateTo);
  });
  const rowsPerPage = pageSize === 'ALL' ? Math.max(visibleOrders.length, 1) : Number(pageSize);
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pagedOrders = visibleOrders.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderCode: order.orderCode, status: form.get('status'), paymentStatus: form.get('paymentStatus'), carrier: form.get('carrier'), trackingCode: form.get('trackingCode') }) });
      const result = await response.json() as { status?: string; paymentStatus?: string; carrier?: string | null; trackingCode?: string | null; error?: { message?: string } };
      if (!response.ok) setToast(result.error?.message ?? 'Không thể cập nhật đơn.');
      else {
        setOrderList((current) => current.map((item) => item.orderCode === order.orderCode ? { ...item, status: result.status ?? String(form.get('status')), paymentStatus: result.paymentStatus ?? String(form.get('paymentStatus')), carrier: result.carrier ?? (String(form.get('carrier') || '') || null), trackingCode: result.trackingCode ?? (String(form.get('trackingCode') || '') || null) } : item));
        setToast(`Đã cập nhật đơn ${order.orderCode}.`);
      }
    } catch {
      setToast('Không thể kết nối để cập nhật đơn.');
    } finally {
      setPending(null);
    }
  }

  async function quickUpdate(order: AdminOrder, status: string, carrier?: string) {
    setPending(order.orderCode);
    setToast('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode: order.orderCode, status, carrier: carrier ?? order.carrier, trackingCode: order.trackingCode }),
      });
      const result = await response.json() as { status?: string; paymentStatus?: string; carrier?: string | null; trackingCode?: string | null; error?: { message?: string } };
      if (!response.ok) {
        setToast(result.error?.message ?? 'Không thể cập nhật đơn.');
        return;
      }
      setOrderList((current) => current.map((item) => item.orderCode === order.orderCode ? { ...item, status: result.status ?? status, paymentStatus: result.paymentStatus ?? order.paymentStatus, carrier: result.carrier ?? carrier ?? order.carrier, trackingCode: result.trackingCode ?? order.trackingCode } : item));
      setToast(status === 'HANDED_OFF' ? `Đã bàn giao ${order.orderCode} cho SPX${result.trackingCode ? ` · Mã ${result.trackingCode}` : ''}.` : `Đã cập nhật đơn ${order.orderCode}.`);
    } catch {
      setToast('Không thể kết nối để cập nhật đơn.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="admin-orders">
      <div className="admin-order-tabs" role="tablist" aria-label="Lọc trạng thái đơn hàng">
        {tabs.map((tab) => <button type="button" role="tab" aria-selected={statusTab === tab.id} className={statusTab === tab.id ? 'is-active' : ''} key={tab.id} onClick={() => { setStatusTab(tab.id); setPage(1); }}>{tab.label}<span>{orderList.filter((order) => orderMatchesTab(order, tab.id)).length}</span></button>)}
      </div>
      <div className="admin-order-filters">
        <label className="admin-filter-search"><Search size={17} /><input aria-label="Tìm theo mã đơn, tên hoặc số điện thoại" placeholder="Mã đơn, tên khách hoặc SĐT" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <label className="field">Thanh toán<select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value); setPage(1); }}><option value="ALL">Tất cả</option><option value="VIETQR">VietQR</option><option value="MOMO">MoMo</option><option value="COD">COD</option></select></label>
        <label className="field">Từ ngày<input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
        <label className="field">Đến ngày<input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
        <a className="secondary-action" href={`/api/admin/orders?${exportParams.toString()}`}><Download size={16} /> Xuất CSV</a>
      </div>
      {toast && <p className="admin-toast" role="status">{toast}</p>}
      <div className="admin-order-pagination">
        <p className="admin-order-result-count">Hiển thị {pagedOrders.length ? (currentPage - 1) * rowsPerPage + 1 : 0}–{Math.min(currentPage * rowsPerPage, visibleOrders.length)} / {visibleOrders.length} đơn</p>
        <label>Hiển thị<select aria-label="Số đơn mỗi trang" value={pageSize} onChange={(event) => { setPageSize(event.target.value); setPage(1); }}><option value="20">20</option><option value="50">50</option><option value="ALL">Tất cả</option></select></label>
        <button type="button" className="secondary-action" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1}>Trước</button>
        <span>Trang {currentPage} / {pageCount}</span>
        <button type="button" className="secondary-action" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage >= pageCount}>Sau</button>
      </div>
      <div className="admin-order-list">
        {pagedOrders.map((order) => (
          <article className="admin-order" key={order.id}>
            <header>
              <div><strong>{order.orderCode} <span className={`admin-status-badge status-${order.status.toLowerCase()}`}>{orderStatusLabels[order.status] ?? order.status}</span></strong><span>{order.customer} · {order.phone}</span><small>{new Date(order.createdAt).toLocaleString('vi-VN')}</small></div>
              <div className="admin-order-total"><span className={`admin-payment-badge ${order.paymentMethod === 'COD' ? 'cod' : order.paymentMethod.toLowerCase()}`}>{order.paymentMethod === 'VIETQR' ? 'VietQR' : order.paymentMethod === 'MOMO' ? 'MoMo' : 'COD'} · {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span><strong>{order.total.toLocaleString('vi-VN')}đ</strong></div>
            </header>
            {order.paymentMethod === 'COD' && order.total >= 200000 && <p className="cod-risk-badge">Cần xác nhận qua điện thoại</p>}
            <p className="admin-order-address">{order.address}</p>
            <ul>{order.items.map((item, index) => <li key={`${order.id}-${index}`}>{item.sku} · {item.productName} × {item.quantity}</li>)}</ul>
            {order.hasOpenCase && <p className="admin-open-case-badge">Đang có yêu cầu đổi trả / bảo hành cần xử lý</p>}
            <form className="admin-order-update" onSubmit={(event) => save(event, order)}>
              <label className="field">Trạng thái<select name="status" defaultValue={order.status}>{statusOptions.map(([value, label]) => <option key={value} value={value} disabled={value === 'PAID'}>{label}</option>)}</select></label>
              <label className="field">Trạng thái thanh toán<select name="paymentStatus" defaultValue={order.paymentStatus}><option value="PENDING">Chưa thanh toán</option><option value="PAID">Đã thanh toán</option></select></label>
              <label className="field">Đơn vị vận chuyển<select name="carrier" defaultValue={order.carrier ?? ''}><option value="">Chưa chọn</option><option value="GHTK">GHTK</option><option value="SPX">SPX Express</option><option value="VIETTEL_POST">Viettel Post</option></select></label>
              <label className="field">Mã vận đơn (không bắt buộc)<input name="trackingCode" defaultValue={order.trackingCode ?? ''} /></label>
              <button className="primary-action" type="submit" disabled={pending === order.orderCode}>{pending === order.orderCode ? 'Đang lưu...' : 'Cập nhật đơn'}</button>
              <Link className="secondary-action" href={`/admin/orders/print/${encodeURIComponent(order.orderCode)}`}><Printer size={16} /> In phiếu nhặt hàng &amp; vận đơn</Link>
            </form>
            <div className="admin-order-quick-actions">
              {['PENDING', 'CONFIRMED', 'PAID'].includes(order.status) && <button type="button" className="primary-action" disabled={pending === order.orderCode} onClick={() => void quickUpdate(order, 'PROCESSING')}>Duyệt đơn &amp; Đóng gói</button>}
              {order.status === 'PROCESSING' && <button type="button" className="admin-handoff-button" disabled={pending === order.orderCode} onClick={() => void quickUpdate(order, 'HANDED_OFF', 'SPX')}>Bàn giao bưu tá 3PL</button>}
              {order.status === 'HANDED_OFF' && <button type="button" className="admin-handoff-button" disabled={pending === order.orderCode} onClick={() => void quickUpdate(order, 'IN_TRANSIT')}>Chuyển sang đang giao</button>}
            </div>
          </article>
        ))}
        {!visibleOrders.length && <p className="empty-state">Không có đơn hàng phù hợp với bộ lọc.</p>}
      </div>
    </div>
  );
}