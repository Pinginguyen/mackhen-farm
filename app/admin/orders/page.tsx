import Link from 'next/link';
import { fetchApiWithFallback } from '@/lib/server-api';
import OrdersManager, { type AdminOrder } from './orders-manager';

export default async function AdminOrdersPage() {
  const { data: { items: orders }, unavailable } = await fetchApiWithFallback<{ items: AdminOrder[] }>('/api/admin/orders', { items: [] });
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
        </nav>
      </header>

      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Quản lý</p>
            <h2>Đơn hàng</h2>
          </div>
        </div>

        <div className="table-card">
          {unavailable && <p className="empty-state" role="status">Không thể tải đơn hàng vì cơ sở dữ liệu hiện không khả dụng.</p>}
          <OrdersManager orders={orders} />
        </div>
      </section>
    </main>
  );
}
