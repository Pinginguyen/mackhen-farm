import Link from 'next/link';

import { fetchApiWithFallback } from '@/lib/server-api';
import { formatCurrency } from '@/lib/store-data';

export default async function AdminDashboardPage() {
  const { data: report, unavailable } = await fetchApiWithFallback('/api/admin/reports/overview', { revenue: 0, orders: 0, pending: 0, lowStock: 0 });
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-badge">M</span>
          <div>
            <p className="eyebrow">Mắc Khén Farm Admin</p>
            <h1>Mắc Khén Farm</h1>
          </div>
        </div>
        <nav className="main-nav" aria-label="Menu quản trị">
          <Link href="/admin/dashboard">Dashboard</Link>
          <Link href="/admin/products">Sản phẩm</Link>
          <Link href="/admin/orders">Đơn hàng</Link>
          <Link href="/admin/inventory">Tồn kho</Link>
          <Link href="/admin/reports">Báo cáo</Link>
        </nav>
      </header>

      <section className="page-card">
        {unavailable && <p className="empty-state" role="status">Không thể tải báo cáo vì cơ sở dữ liệu hiện không khả dụng.</p>}
        <div className="page-title">
          <div>
            <p className="eyebrow">Tổng quan</p>
            <h2>Dashboard quản trị</h2>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Doanh thu</span>
            <strong>{formatCurrency(report.revenue)}</strong>
            <div>GMV đã thanh toán</div>
          </div>
          <div className="stat-card">
            <span>Tổng số đơn</span>
            <strong>{report.orders}</strong>
            <div>Tất cả trạng thái</div>
          </div>
          <div className="stat-card">
            <span>Đơn chờ xử lý</span>
            <strong>{report.pending}</strong>
            <div>Chờ xác nhận và đóng gói</div>
          </div>
          <div className="stat-card">
            <span>Tồn kho cảnh báo</span>
            <strong>{report.lowStock} SKU</strong>
            <div>Sản phẩm cần bổ sung</div>
          </div>
        </div>
      </section>
    </main>
  );
}
