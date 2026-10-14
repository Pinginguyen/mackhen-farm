'use client';

import Link from 'next/link';
import { useState } from 'react';

import LogoutButton from '@/app/logout-button';
import { formatCurrency } from '@/lib/store-data';

type Profile = { name: string; email: string; phone: string | null; address: string | null };
type AccountOrder = { orderCode: string; createdAt: string; totalAmount: number; orderStatus: string; items: { productName: string; quantity: number; price: number }[] };

const statusLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Chờ xác nhận', PAID: 'Chờ xác nhận', PROCESSING: 'Đang đóng gói', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Đã giao', CANCELLED: 'Đã hủy' };

export default function AccountDashboard({ profile, orders, initialTab }: { profile: Profile; orders: AccountOrder[]; initialTab: 'profile' | 'orders' }) {
  const [tab, setTab] = useState(initialTab);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

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

  return <section className="page-card account-page"><div className="page-title"><div><p className="eyebrow">Khu vực cá nhân</p><h1>Xin chào, {profile.name}</h1></div><LogoutButton /></div><div className="account-tabs" role="tablist" aria-label="Thông tin tài khoản"><button id="profile-tab" role="tab" aria-selected={tab === 'profile'} aria-controls="profile-panel" onClick={() => setTab('profile')}>Thông tin cá nhân</button><button id="orders-tab" role="tab" aria-selected={tab === 'orders'} aria-controls="orders-panel" onClick={() => setTab('orders')}>Đơn mua của tôi</button></div>{tab === 'profile' ? <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab"><form className="form-list account-profile-form" onSubmit={saveProfile}><div className="field"><label htmlFor="account-name">Họ và tên</label><input id="account-name" name="name" defaultValue={profile.name} maxLength={100} required /></div><div className="field"><label htmlFor="account-email">Email</label><input id="account-email" value={profile.email} readOnly /></div><div className="field"><label htmlFor="account-phone">Số điện thoại</label><input id="account-phone" name="phone" type="tel" defaultValue={profile.phone ?? ''} maxLength={30} /></div><div className="field"><label htmlFor="account-address">Địa chỉ nhận hàng mặc định</label><textarea id="account-address" name="address" defaultValue={profile.address ?? ''} maxLength={500} rows={3} /></div><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button>{message && <p role="status">{message}</p>}</form></div> : <div id="orders-panel" role="tabpanel" aria-labelledby="orders-tab">{orders.length ? <div className="table-card account-order-table"><table><thead><tr><th>Mã đơn</th><th>Ngày mua</th><th>Tổng tiền</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>{orders.map((order) => <tr key={order.orderCode}><td>{order.orderCode}</td><td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td><td>{formatCurrency(order.totalAmount)}</td><td>{statusLabels[order.orderStatus] ?? order.orderStatus}</td><td><Link href={`/tra-cuu?orderCode=${encodeURIComponent(order.orderCode)}`}>Xem chi tiết đơn</Link></td></tr>)}</tbody></table></div> : <p>Bạn chưa có đơn hàng.</p>}</div>}</section>;
}