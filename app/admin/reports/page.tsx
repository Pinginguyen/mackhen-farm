import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/store-data';

export default async function AdminReportsPage() {
  const now = new Date();
  const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [revenue, orders, lowStockProducts, currentPeriodRevenue, previousPeriodRevenue] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.order.count(),
    prisma.product.findMany({ where: { active: true, stock: { lt: 30 } }, select: { id: true, name: true, stock: true, unit: true }, orderBy: { stock: 'asc' } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: currentPeriodStart } }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } }, _sum: { totalAmount: true } }),
  ]);

  const report = {
    revenue: revenue._sum.totalAmount ?? 0,
    orders,
    lowStock: lowStockProducts.length,
    currentRevenue: currentPeriodRevenue._sum.totalAmount ?? 0,
    previousRevenue: previousPeriodRevenue._sum.totalAmount ?? 0,
  };

  const unavailable = false;
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
          <Link href="/admin/reports">Báo cáo</Link>
        </nav>
      </header>

      <section className="page-card">
        {unavailable && <p className="empty-state" role="status">Không thể tải báo cáo vì cơ sở dữ liệu hiện không khả dụng.</p>}
        <div className="page-title">
          <div>
            <p className="eyebrow">Báo cáo</p>
            <h2>Revenue & channel trend</h2>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Doanh thu</span>
            <strong>{formatCurrency(report.revenue)}</strong>
          </div>
          <div className="stat-card">
            <span>Đơn đã thanh toán</span>
            <strong>{report.orders}</strong>
          </div>
          <div className="stat-card">
            <span>Sản phẩm sắp hết</span>
            <strong>{report.lowStock}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
