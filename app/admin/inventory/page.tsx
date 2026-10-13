import Link from 'next/link';
import { fetchApiWithFallback } from '@/lib/server-api';

export default async function AdminInventoryPage() {
  const { data: { items: inventory }, unavailable } = await fetchApiWithFallback<{ items: { id: string; name: string; stock: number; status: string }[] }>('/api/admin/inventory', { items: [] });
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
            <h2>Tồn kho</h2>
          </div>
        </div>

        <div className="table-card">
          {unavailable && <p className="empty-state" role="status">Không thể tải tồn kho vì cơ sở dữ liệu hiện không khả dụng.</p>}
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.stock}</td>
                  <td>{entry.status}</td>
                </tr>
              ))}
              {!inventory.length && <tr><td colSpan={3}>Chưa có sản phẩm trong kho.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
