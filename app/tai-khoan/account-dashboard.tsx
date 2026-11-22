'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import LogoutButton from '@/app/logout-button';
import { formatCurrency } from '@/lib/store-data';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';

type Profile = { name: string; email: string; phone: string | null; address: string | null; loyaltyPoints: number; lifetimePoints: number; membershipTier: string };
type AccountOrder = { orderCode: string; createdAt: string; totalAmount: number; orderStatus: string; items: { productName: string; productSlug: string; quantity: number; price: number }[] };
type PointHistoryItem = { id: string; points: number; type: 'EARN' | 'SPEND'; description: string; createdAt: string };
type WalletHistoryItem = { id: string; amount: number; type: 'CREDIT' | 'DEBIT'; description: string; createdAt: string };
type ReviewReward = { id: string; rewardVoucherCode: string | null; createdAt: string; product: { name: string } };

const statusLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Chờ xác nhận', PAID: 'Đã thanh toán', PROCESSING: 'Đang đóng gói', HANDED_OFF: 'Đã bàn giao 3PL', IN_TRANSIT: 'Đang giao', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Đã giao', CANCELLED: 'Đã hủy' };

export default function AccountDashboard({ profile, orders, pointHistory, reviewRewards, initialTab }: { profile: Profile; orders: AccountOrder[]; pointHistory: PointHistoryItem[]; reviewRewards: ReviewReward[]; initialTab: 'profile' | 'orders' }) {
  const [tab, setTab] = useState(initialTab);
  const [orderList, setOrderList] = useState(orders);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [wallet, setWallet] = useState<{ balance: number; transactions: WalletHistoryItem[] }>({ balance: 0, transactions: [] });
  const memberTier = profile.membershipTier === 'VVIP' ? 'Gold' : profile.membershipTier === 'VIP' ? 'Silver' : 'Bronze';

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/account/orders', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { items?: AccountOrder[] };
      })
      .then((result) => {
        if (!result || !Array.isArray(result.items)) return;
        setOrderList(result.items);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [orders]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/account/wallet', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { wallet?: typeof wallet } : null)
      .then((result) => { if (result?.wallet) setWallet(result.wallet); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

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
          <section className="loyalty-panel" aria-labelledby="loyalty-title">
            <div className="loyalty-balance">
              <p className="eyebrow">MẮC KHÉN FARM · MEMBERSHIP</p>
              <h2 id="loyalty-title">{profile.loyaltyPoints.toLocaleString('vi-VN')} điểm thưởng</h2>
              <p>Đã tích lũy trọn đời {profile.lifetimePoints.toLocaleString('vi-VN')} điểm · 1 điểm đổi 100đ</p>
            </div>
            <span className={`membership-tier-badge tier-${profile.membershipTier.toLowerCase()}`}>{memberTier}</span>
            <div className="loyalty-history">
              <h3>Lịch sử điểm thưởng</h3>
              {pointHistory.length ? <ul>{pointHistory.map((entry) => <li key={entry.id}>
                <span><strong>{entry.description}</strong><small>{new Date(entry.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></span>
                <b className={entry.type === 'EARN' ? 'points-earned' : 'points-spent'}>{entry.type === 'EARN' ? '+' : '−'}{entry.points.toLocaleString('vi-VN')}</b>
              </li>)}</ul> : <p>Chưa có biến động điểm thưởng.</p>}
            </div>
          </section>
          <section className="wallet-panel" aria-labelledby="wallet-title">
            <div className="wallet-panel-balance"><p className="eyebrow">VÍ NỘI BỘ</p><h2 id="wallet-title">{formatCurrency(wallet.balance)}</h2><p>Dùng thanh toán đơn hàng · Cashback 2% khi đơn hoàn tất</p></div>
            <div className="wallet-history"><h3>Lịch sử ví</h3>
              {wallet.transactions.length ? <ul>{wallet.transactions.map((transaction) => <li key={transaction.id}><span><strong>{transaction.description}</strong><small>{new Date(transaction.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></span><b className={transaction.type === 'CREDIT' ? 'points-earned' : 'points-spent'}>{transaction.type === 'CREDIT' ? '+' : '−'}{formatCurrency(transaction.amount)}</b></li>)}</ul> : <p>Chưa có giao dịch trong ví.</p>}
            </div>
          </section>
          {reviewRewards.length > 0 && <section className="review-reward-panel" aria-labelledby="review-reward-title">
            <h2 id="review-reward-title">Voucher cảm ơn đánh giá</h2>
            <ul>{reviewRewards.map((reward) => <li key={reward.id}><span>{reward.product.name}</span><code>{reward.rewardVoucherCode}</code><small>Giảm 10% · dùng một lần</small></li>)}</ul>
          </section>}
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
              <div className="mobile-table-scroll w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table>
                <thead><tr><th>Mã đơn</th><th>Ngày mua</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead>
                <tbody>{orderList.map((order) => (
                  <tr key={order.orderCode}>
                    <td>{order.orderCode}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
                    <td>{order.items.length ? order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ') : 'Không có sản phẩm'}</td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>{statusLabels[order.orderStatus] ?? order.orderStatus}</td>
                    <td>
                      <Link href={`/tra-cuu?orderCode=${encodeURIComponent(order.orderCode)}`}>Xem chi tiết / Tra cứu</Link>
                      {['DELIVERED', 'COMPLETED'].includes(order.orderStatus) && order.items[0] && (
                        <Link className="account-review-link" href={`/products/${encodeURIComponent(order.items[0].productSlug)}?review=1#product-reviews-title`}>Đánh giá</Link>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              </div>
            </div>
          ) : <p>Chưa tìm thấy đơn hàng gắn với hồ sơ. Bạn có thể tra cứu đơn khách vãng lai bằng mã đơn và số điện thoại.</p>}
        </div>
      )}
    </section>
  );
}