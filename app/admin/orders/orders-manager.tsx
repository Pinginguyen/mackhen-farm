'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, Pencil, Printer, Search, X } from 'lucide-react';
import { formatCurrency } from '@/lib/store-data';

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
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  note: string | null;
  trackingCode: string | null;
  carrier: string | null;
  hasOpenCase?: boolean;
  createdAt: string;
  items: { productName: string; sku: string; variantLabel?: string | null; quantity: number; price?: number }[];
};

const statusOptions = [
  ['PENDING', 'Chờ thanh toán / xác nhận'], ['CONFIRMED', 'Đã xác nhận'], ['PAID', 'Đã thanh toán'], ['PROCESSING', 'Đang đóng gói phòng sạch'],
  ['HANDED_OFF', 'Đã bàn giao 3PL'], ['IN_TRANSIT', 'Đang giao hàng'], ['SHIPPING', 'Đang giao (cũ)'],
  ['DELIVERED', 'Giao thành công'], ['COMPLETED', 'Hoàn tất'], ['RETURNED', 'Chuyển hoàn'], ['CANCELLED', 'Đã hủy'],
];
const orderStatusLabels: Record<string, string> = { PENDING: 'Chờ thanh toán / xác nhận', CONFIRMED: 'Đã xác nhận', PAID: 'Đã thanh toán', PROCESSING: 'Đang đóng gói', HANDED_OFF: 'Đã bàn giao 3PL', IN_TRANSIT: 'Đang giao hàng', SHIPPING: 'Đang giao', DELIVERED: 'Giao thành công', COMPLETED: 'Hoàn tất', RETURNED: 'Chuyển hoàn', CANCELLED: 'Đã hủy' };

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
  const [manualPaymentReason, setManualPaymentReason] = useState<Record<string, string>>({});
  const [manualPaymentOrder, setManualPaymentOrder] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi ý');
  const [editingRecipient, setEditingRecipient] = useState<string | null>(null);
  const [recipientDraft, setRecipientDraft] = useState({ phone: '', address: '' });
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

  function canSelectStatus(order: AdminOrder, status: string) {
    if (['CANCELLED', 'RETURNED'].includes(order.status)) return status === order.status;
    if (order.status === 'SHIPPING') return status === order.status || ['DELIVERED', 'RETURNED'].includes(status);
    return true;
  }

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

  async function saveRecipient(order: AdminOrder) {
    setPending(order.orderCode);
    setToast('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode: order.orderCode, phone: recipientDraft.phone, address: recipientDraft.address }),
      });
      const result = await response.json() as { phone?: string; address?: string; error?: { message?: string } };
      if (!response.ok) {
        setToast(result.error?.message ?? 'Không thể cập nhật thông tin giao hàng.');
        return;
      }
      setOrderList((current) => current.map((item) => item.orderCode === order.orderCode
        ? { ...item, phone: result.phone ?? recipientDraft.phone, address: result.address ?? recipientDraft.address }
        : item));
      setEditingRecipient(null);
      setToast(`Đã cập nhật thông tin giao hàng đơn ${order.orderCode}.`);
    } catch {
      setToast('Không thể kết nối để cập nhật thông tin giao hàng.');
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

  async function confirmManualPayment(order: AdminOrder) {
    const reason = manualPaymentReason[order.orderCode]?.trim() ?? '';
    if (!reason) {
      setToast('Nhập lý do trước khi xác nhận thanh toán thủ công.');
      return;
    }
    setPending(order.orderCode);
    setToast('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode: order.orderCode, status: order.status, paymentStatus: 'PAID', paymentReason: reason }),
      });
      const result = await response.json() as { status?: string; paymentStatus?: string; error?: { message?: string } };
      if (!response.ok) {
        setToast(result.error?.message ?? 'Không thể xác nhận thanh toán.');
        return;
      }
      setOrderList((current) => current.map((item) => item.orderCode === order.orderCode ? { ...item, status: result.status ?? item.status, paymentStatus: result.paymentStatus ?? 'PAID' } : item));
      setManualPaymentOrder(null);
      setToast(`Đã xác nhận thanh toán thủ công cho đơn ${order.orderCode}.`);
    } catch {
      setToast('Không thể kết nối để xác nhận thanh toán.');
    } finally {
      setPending(null);
    }
  }

  async function cancelOrder(order: AdminOrder) {
    setPending(order.orderCode);
    setToast('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode: order.orderCode, status: 'CANCELLED', cancelReason }),
      });
      const result = await response.json() as { status?: string; error?: { message?: string } };
      if (!response.ok) {
        setToast(result.error?.message ?? 'Không thể hủy đơn hàng.');
        return;
      }
      setOrderList((current) => current.map((item) => item.orderCode === order.orderCode ? { ...item, status: result.status ?? 'CANCELLED' } : item));
      setCancellingOrder(null);
      setToast(`Đã hủy đơn ${order.orderCode}.`);
    } catch {
      setToast('Không thể kết nối để hủy đơn hàng.');
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
            <header className="admin-order-header">
              <div className="admin-order-heading">
                <div className="admin-order-title-row">
                  <strong className="admin-order-code">{order.orderCode}</strong>
                  <span className={`admin-status-badge status-${order.status.toLowerCase()}`}>{orderStatusLabels[order.status] ?? order.status}</span>
                  <span className={`admin-payment-badge ${order.paymentMethod === 'COD' ? 'cod' : order.paymentMethod.toLowerCase()}`}>{order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                  <span className="admin-payment-method-badge">{order.paymentMethod === 'VIETQR' ? 'VietQR' : order.paymentMethod}</span>
                </div>
                <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString('vi-VN')}</time>
              </div>
              <div className="admin-order-total-wrap"><strong className="admin-order-total">{formatCurrency(order.total)}</strong><small>Tiền hàng: {formatCurrency(order.subtotal)} | Phí ship: {formatCurrency(order.shippingFee)} | Giảm giá: −{formatCurrency(order.discountAmount)}</small></div>
            </header>
            {order.note?.trim() && <p className="admin-order-customer-note">Ghi chú của khách: {order.note}</p>}
            {order.paymentMethod === 'COD' && order.total >= 200000 && <p className="cod-risk-badge">Cần xác nhận qua điện thoại</p>}
            <div className="admin-order-content">
              <section className="admin-order-customer" aria-label="Thông tin giao hàng">
                <h3>Thông tin giao hàng</h3>
                <dl>
                  <div><dt>Người nhận</dt><dd>{order.customer}</dd></div>
                  <div><dt>Số điện thoại</dt><dd>{order.phone}</dd></div>
                  <div><dt>Địa chỉ</dt><dd>{order.address}</dd></div>
                </dl>
                {['PENDING', 'PROCESSING'].includes(order.status) && <button
                  type="button"
                  className="admin-order-edit-recipient"
                  onClick={() => {
                    setRecipientDraft({ phone: order.phone, address: order.address });
                    setEditingRecipient(editingRecipient === order.orderCode ? null : order.orderCode);
                  }}
                ><Pencil size={14} /> Sửa địa chỉ/SĐT</button>}
                {editingRecipient === order.orderCode && <div className="admin-order-recipient-editor">
                  <label className="field">Số điện thoại<input type="tel" value={recipientDraft.phone} onChange={(event) => setRecipientDraft((current) => ({ ...current, phone: event.target.value }))} /></label>
                  <label className="field">Địa chỉ giao hàng<textarea rows={3} value={recipientDraft.address} onChange={(event) => setRecipientDraft((current) => ({ ...current, address: event.target.value }))} /></label>
                  <div className="admin-order-recipient-actions">
                    <button type="button" className="secondary-action" onClick={() => setEditingRecipient(null)} disabled={pending === order.orderCode}>Hủy</button>
                    <button type="button" className="primary-action" onClick={() => void saveRecipient(order)} disabled={pending === order.orderCode}>{pending === order.orderCode ? 'Đang lưu...' : 'Lưu thông tin'}</button>
                  </div>
                </div>}
              </section>
              <section className="admin-order-items" aria-label="Danh sách sản phẩm">
                <h3>Sản phẩm</h3>
                <ul>{order.items.map((item, index) => <li key={`${order.id}-${index}`}>
                  <span className="admin-order-item-name"><strong>{item.productName}</strong><small>{item.sku}{item.variantLabel ? ` · ${item.variantLabel}` : ''}</small></span>
                  <span className="admin-order-item-quantity">×{item.quantity}</span>
                  {item.price != null && <span className="admin-order-item-price">{formatCurrency(item.price * item.quantity)}</span>}
                </li>)}</ul>
              </section>
            </div>
            {order.hasOpenCase && <p className="admin-open-case-badge">Đang có yêu cầu đổi trả / bảo hành cần xử lý</p>}
            <form className="admin-order-toolbar" onSubmit={(event) => save(event, order)}>
              <div className="admin-order-toolbar-controls">
                <label className="field">Trạng thái đơn<select name="status" defaultValue={order.status}>{statusOptions.map(([value, label]) => <option key={value} value={value} disabled={value !== order.status && (!canSelectStatus(order, value) || value === 'PAID' || value === 'CANCELLED')}>{label}</option>)}</select></label>
                <label className="field">Trạng thái thanh toán<select name="paymentStatus" defaultValue={order.paymentStatus}><option value="PENDING">Chưa thanh toán</option><option value="PAID" disabled={order.paymentMethod === 'VIETQR' && order.paymentStatus !== 'PAID'}>Đã thanh toán</option></select></label>
                <label className="field">Đơn vị vận chuyển<select name="carrier" defaultValue={order.carrier ?? ''}><option value="">Chưa chọn</option><option value="GHTK">GHTK</option><option value="SPX">SPX Express</option><option value="VIETTEL_POST">Viettel Post</option></select></label>
                <label className="field">Mã vận đơn<input name="trackingCode" defaultValue={order.trackingCode ?? ''} placeholder="Nhập mã vận đơn..." /></label>
              </div>
              <div className="admin-order-toolbar-actions">
                <Link className="admin-order-print-button" href={`/admin/orders/print/${encodeURIComponent(order.orderCode)}`}><Printer size={16} /> In phiếu</Link>
                {order.paymentMethod === 'VIETQR' && order.paymentStatus !== 'PAID' && <button type="button" className="admin-order-manual-trigger" onClick={() => setManualPaymentOrder(order.orderCode)} disabled={pending === order.orderCode}>Duyệt thanh toán</button>}
                {order.status === 'PENDING' && <button type="button" className="admin-order-quick-button" disabled={pending === order.orderCode} onClick={() => void quickUpdate(order, 'PROCESSING')}>Duyệt đóng gói</button>}
                {order.status === 'PROCESSING' && <button type="button" className="admin-order-quick-button" disabled={pending === order.orderCode} onClick={() => void quickUpdate(order, 'HANDED_OFF', 'SPX')}>Bàn giao 3PL</button>}
                {order.status === 'HANDED_OFF' && <button type="button" className="admin-order-quick-button" disabled={pending === order.orderCode} onClick={() => void quickUpdate(order, 'IN_TRANSIT')}>Đang giao</button>}
                {['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING'].includes(order.status) && <button type="button" className="admin-order-cancel-button" disabled={pending === order.orderCode} onClick={() => { setCancelReason('Khách đổi ý'); setCancellingOrder(order.orderCode); }}>Hủy đơn</button>}
                <button className="admin-order-save-button" type="submit" disabled={pending === order.orderCode}>{pending === order.orderCode ? 'Đang lưu...' : 'Cập nhật đơn'}</button>
              </div>
            </form>
            {manualPaymentOrder === order.orderCode && <div className="admin-manual-payment-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && pending !== order.orderCode) setManualPaymentOrder(null); }}>
              <section className="admin-manual-payment-dialog" role="dialog" aria-modal="true" aria-labelledby={`manual-payment-title-${order.id}`}>
                <header><div><p className="eyebrow">VietQR · {order.orderCode}</p><h3 id={`manual-payment-title-${order.id}`}>Duyệt thanh toán</h3></div><button type="button" aria-label="Đóng" onClick={() => setManualPaymentOrder(null)} disabled={pending === order.orderCode}><X size={18} /></button></header>
                <label className="field">Lý do xác nhận<input autoFocus required maxLength={1000} value={manualPaymentReason[order.orderCode] ?? ''} onChange={(event) => setManualPaymentReason((current) => ({ ...current, [order.orderCode]: event.target.value }))} placeholder="Ví dụ: Đối soát sao kê khớp" /></label>
                <footer><button type="button" className="secondary-action" onClick={() => setManualPaymentOrder(null)} disabled={pending === order.orderCode}>Hủy</button><button type="button" className="admin-order-save-button" onClick={() => void confirmManualPayment(order)} disabled={pending === order.orderCode}>{pending === order.orderCode ? 'Đang xác nhận...' : 'Xác nhận thanh toán'}</button></footer>
              </section>
            </div>}
            {cancellingOrder === order.orderCode && <div className="admin-manual-payment-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && pending !== order.orderCode) setCancellingOrder(null); }}>
              <section className="admin-manual-payment-dialog" role="dialog" aria-modal="true" aria-labelledby={`cancel-order-title-${order.id}`}>
                <header><div><p className="eyebrow">Đơn hàng · {order.orderCode}</p><h3 id={`cancel-order-title-${order.id}`}>Xác nhận hủy đơn</h3></div><button type="button" aria-label="Đóng" onClick={() => setCancellingOrder(null)} disabled={pending === order.orderCode}><X size={18} /></button></header>
                <p>Đơn hàng sẽ ngừng xử lý và số lượng sản phẩm được hoàn lại kho.</p>
                <label className="field">Lý do hủy<select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)}><option>Khách đổi ý</option><option>Sai thông tin</option><option>Không liên lạc được</option><option>Khách yêu cầu hủy</option><option>Khác</option></select></label>
                <footer><button type="button" className="secondary-action" onClick={() => setCancellingOrder(null)} disabled={pending === order.orderCode}>Giữ đơn</button><button type="button" className="admin-order-cancel-button is-confirm" onClick={() => void cancelOrder(order)} disabled={pending === order.orderCode}>{pending === order.orderCode ? 'Đang hủy...' : 'Xác nhận hủy'}</button></footer>
              </section>
            </div>}
          </article>
        ))}
        {!visibleOrders.length && <p className="empty-state">Không có đơn hàng phù hợp với bộ lọc.</p>}
      </div>
    </div>
  );
}