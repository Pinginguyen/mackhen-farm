import Link from 'next/link';

import { fetchApiWithFallback } from '@/lib/server-api';
import type { Product } from '@/lib/store-data';
import StockControl from './stock-control';

export default async function AdminProductsPage() {
  const { data: { items: products }, unavailable } = await fetchApiWithFallback<{ items: Product[] }>('/api/products', { items: [] });
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
            <h2>Sản phẩm</h2>
          </div>
        </div>

        <div className="table-card">
          {unavailable && <p className="empty-state" role="status">Không thể tải danh mục vì cơ sở dữ liệu hiện không khả dụng.</p>}
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Giá</th>
                <th>Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{product.price.toLocaleString('vi-VN')}đ</td>
                  <td><StockControl productId={product.id} currentStock={product.stock} /></td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan={4}>Chưa có sản phẩm trong danh mục.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
