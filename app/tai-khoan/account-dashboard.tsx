'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import LogoutButton from '@/app/logout-button';
import { formatCurrency } from '@/lib/store-data';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';

type Profile = { name: string; email: string; phone: string | null; address: string | null };
type AccountOrder = { orderCode: string; createdAt: string; totalAmount: number; orderStatus: string; items: { productName: string; productSlug: string; quantity: number; price: number }[]; localFallback?: boolean };

const statusLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Chờ xác nhận', PAID: 'Đã thanh toán', PROCESSING: 'Đang đóng gói', HANDED_OFF: 'Đã bàn giao 3PL', IN_TRANSIT: 'Đang giao', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Đã giao', CANCELLED: 'Đã hủy' };

function mergeOrders(current: AccountOrder[], incoming: AccountOrder[]): AccountOrder[] {
  const byCode = new Map(current.map((order) => [order.orderCode, order]));
  for (const order of incoming) {
    const existing = byCode.get(order.orderCode);
    if (!existing || existing.localFallback || !order.localFallback) byCode.set(order.orderCode, order);
  }
  return [...byCode.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export default function AccountDashboard({ profile, orders, initialTab }: { profile: Profile; orders: AccountOrder[]; initialTab: 'profile' | 'orders' }) {
  const [tab, setTab] = useState(initialTab);
  const [orderList, setOrderList] = useState(orders);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let savedCodes: string[] = [];
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem('user_orders') ?? '[]');
      if (Array.isArray(saved)) savedCodes = [...new Set(saved.filter((code): code is string => typeof code === 'string' && /^MKF-\d{6}$/.test(code)))];
    } catch {
      savedCodes = [];
    }

    const knownCodes = new Set(orders.map((order) => order.orderCode));
    const localOrders = savedCodes.filter((code) => !knownCodes.has(code)).map((orderCode): AccountOrder => ({
      orderCode,
      createdAt: new Date().toISOString(),
      totalAmount: 0,
      orderStatus: 'PENDING',
      items: [],
      localFallback: true,
    }));
    setOrderList((current) => mergeOrders(mergeOrders(current, orders), localOrders));

    const controller = new AbortController();
    void fetch('/api/account/orders', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { items?: AccountOrder[] };
      })
      .then((result) => {
        if (result?.items) setOrderList((current) => mergeOrders(current, result.items ?? []));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [orders]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/account/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), phone: form.get('phone'), address: form.get('address') }) });
      const result = await response.json() as { error?: string };
      setMessage(response.ok ? 'Đã lưu thông tin cá nhân.' : result.error ?? 'Không thể cập nhật hồ sơ.');
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-card account-page">
      <div className="page-title">
        <div><p className="eyebrow">Khu vực cá nhân</p><h1>Xin chào, {profile.name}</h1></div>
        <LogoutButton />
      </div>
      <div className="account-tabs" role="tablist" aria-label="Thông tin tài khoản">
        <button id="profile-tab" role="tab" aria-selected={tab === 'profile'} aria-controls="profile-panel" onClick={() => setTab('profile')}>Thông tin cá nhân</button>
        <button id="orders-tab" role="tab" aria-selected={tab === 'orders'} aria-controls="orders-panel" onClick={() => setTab('orders')}>Đơn mua của tôi</button>
      </div>
      {tab === 'profile' ? (
        <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
          <form className="form-list account-profile-form" onSubmit={saveProfile}>
            <div className="field"><label htmlFor="account-name">Họ và tên</label><input id="account-name" name="name" defaultValue={profile.name} maxLength={100} required /></div>
            <div className="field"><label htmlFor="account-email">Email</label><input id="account-email" value={profile.email} readOnly /></div>
            <div className="field"><label htmlFor="account-phone">Số điện thoại</label><ValidatedPhoneInput id="account-phone" name="phone" autoComplete="tel" defaultValue={profile.phone ?? ''} maxLength={30} /></div>
            <div className="field"><label htmlFor="account-address">Địa chỉ nhận hàng mặc định</label><textarea id="account-address" name="address" defaultValue={profile.address ?? ''} maxLength={500} rows={3} /></div>
            <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button>
            {message && <p role="status">{message}</p>}
          </form>
        </div>
      ) : (
        <div id="orders-panel" role="tabpanel" aria-labelledby="orders-tab">
          {orderList.length ? (
            <div className="table-card account-order-table">
              <table>
                <thead><tr><th>Mã đơn</th><th>Ngày mua</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead>
                <tbody>{orderList.map((order) => (
                  <tr key={order.orderCode}>
                    <td>{order.orderCode}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>{order.items.length ? order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ') : order.localFallback ? 'Đang đồng bộ sản phẩm' : 'Không có sản phẩm'}</td>
                    <td>{order.totalAmount > 0 ? formatCurrency(order.totalAmount) : 'Đang đồng bộ'}</td>
                    <td>{order.localFallback ? 'Đang đồng bộ đơn hàng' : statusLabels[order.orderStatus] ?? order.orderStatus}</td>
                    <td>
                      <Link href={`/tra-cuu?orderCode=${encodeURIComponent(order.orderCode)}`}>Xem chi tiết / Tra cứu</Link>
                      {!order.localFallback && ['DELIVERED', 'COMPLETED'].includes(order.orderStatus) && order.items[0] && (
                        <Link className="account-review-link" href={`/products/${encodeURIComponent(order.items[0].productSlug)}?review=1#product-reviews-title`}>Đánh giá</Link>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p>Chưa tìm thấy đơn hàng gắn với hồ sơ. Bạn có thể tra cứu đơn khách vãng lai bằng mã đơn và số điện thoại.</p>}
        </div>
      )}
    </section>
  );
}