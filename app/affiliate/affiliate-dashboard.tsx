'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, LogOut, MousePointerClick, PackageCheck, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/store-data';

type AffiliateDashboardData = {
  affiliate: { name: string; email: string; affiliateCode: string; commissionRate: number };
  totalClicks: number;
  completedOrders: number;
  totalRevenue: number;
  commissionAccrued: number;
  commissionDue: number;
  updatedAt: string;
  orders: { orderCode: string; createdAt: string; totalAmount: number; commission: number; commissionStatus: string; paymentReference: string | null }[];
};

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://mackhen-farm.vercel.app').replace(/\/+$/, '');

export default function AffiliateDashboard({ initialAffiliate }: { initialAffiliate: AffiliateDashboardData['affiliate'] }) {
  const router = useRouter();
  const [data, setData] = useState<AffiliateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const referralUrl = `${appUrl}/?ref=${encodeURIComponent(initialAffiliate.affiliateCode)}`;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/affiliate/dashboard', { cache: 'no-store' });
        const result = await response.json() as AffiliateDashboardData | { error?: string };
        if (!response.ok || !('affiliate' in result)) throw new Error('Không thể tải dữ liệu đối tác.');
        if (active) setData(result);
      } catch {
        if (active) setMessage('Không thể tải số liệu hiện tại. Vui lòng tải lại trang.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setMessage('Đã sao chép liên kết tiếp thị.');
    } catch {
      setMessage('Không thể sao chép tự động. Hãy chọn và sao chép liên kết.');
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dang-nhap');
    router.refresh();
  }

  const metrics = data ?? {
    affiliate: initialAffiliate,
    totalClicks: 0,
    completedOrders: 0,
    totalRevenue: 0,
    commissionAccrued: 0,
    commissionDue: 0,
    updatedAt: '',
    orders: [],
  };

  return (
    <main className="affiliate-portal-shell">
      <header className="affiliate-portal-header">
        <div><p className="eyebrow">MẮC KHÉN FARM · CREATOR PARTNER</p><h1>Chào mừng đối tác {metrics.affiliate.name} hợp tác cùng Mắc Khén Farm</h1><p>Mã đối tác <code>{metrics.affiliate.affiliateCode}</code> · Hoa hồng {metrics.affiliate.commissionRate}%</p></div>
        <button className="affiliate-logout-link" type="button" onClick={() => void logout()}><LogOut size={16} /> Đăng xuất</button>
      </header>

      <section className="affiliate-link-panel" aria-labelledby="affiliate-link-title">
        <div><p className="eyebrow">YOUR REFERRAL LINK</p><h2 id="affiliate-link-title">Liên kết tiếp thị độc quyền</h2><p>Chia sẻ liên kết này để ghi nhận lượt truy cập và đơn hàng phát sinh.</p></div>
        <div className="affiliate-copy-row"><input aria-label="Liên kết tiếp thị" readOnly value={referralUrl} /><button className="affiliate-copy-button" type="button" onClick={() => void copyReferralLink()}>{message.startsWith('Đã sao chép') ? <Check size={17} /> : <Copy size={17} />}{message.startsWith('Đã sao chép') ? 'Đã sao chép' : 'Sao chép liên kết'}</button><a className="affiliate-open-link" href={referralUrl} target="_blank" rel="noreferrer" aria-label="Mở liên kết tiếp thị"><ExternalLink size={17} /></a></div>
      </section>

      {message && <p className="affiliate-portal-notice" role="status">{message}</p>}
      {loading && <p className="affiliate-portal-notice" role="status">Đang đồng bộ số liệu...</p>}

      <section className="affiliate-kpi-grid" aria-label="Kết quả tiếp thị">
        <article><span><MousePointerClick size={17} />Tổng lượt click vào link</span><strong>{metrics.totalClicks.toLocaleString('vi-VN')}</strong></article>
        <article><span><PackageCheck size={17} />Tổng đơn hàng hoàn tất</span><strong>{metrics.completedOrders.toLocaleString('vi-VN')}</strong></article>
        <article><span><ExternalLink size={17} />Tổng doanh thu tạo ra</span><strong>{formatCurrency(metrics.totalRevenue)}</strong></article>
        <article><span><Wallet size={17} />Hoa hồng tích lũy (VNĐ)</span><strong>{formatCurrency(metrics.commissionAccrued)}</strong><small>Còn chờ chi trả: {formatCurrency(metrics.commissionDue)}</small></article>
      </section>

      <section className="affiliate-history-panel">
        <header><div><p className="eyebrow">ORDER ATTRIBUTION</p><h2>Lịch sử đơn hàng phát sinh</h2></div><span>Cập nhật tự động mỗi 30 giây</span></header>
        <div className="affiliate-history-scroll"><table>
          <thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Giá trị đơn</th><th>Hoa hồng</th><th>Trạng thái hoa hồng</th></tr></thead>
          <tbody>{metrics.orders.map((order) => <tr key={order.orderCode}>
            <td><strong>{order.orderCode}</strong></td>
            <td>{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
            <td>{formatCurrency(order.totalAmount)}</td>
            <td>{formatCurrency(order.commission)}</td>
            <td><span className={`affiliate-payout-status${order.commissionStatus === 'Đã chi trả' ? ' is-paid' : ''}`}>{order.commissionStatus}</span>{order.paymentReference && <small className="affiliate-reference">Mã GD: {order.paymentReference}</small>}</td>
          </tr>)}
          {!loading && !metrics.orders.length && <tr><td className="affiliate-history-empty" colSpan={5}>Chưa có đơn hàng phát sinh từ liên kết.</td></tr>}
          </tbody>
        </table></div>
      </section>
      <footer className="affiliate-portal-footer">Hoa hồng được xác lập sau khi đơn thanh toán thành công và được đối soát bởi Mắc Khén Farm.</footer>
    </main>
  );
}