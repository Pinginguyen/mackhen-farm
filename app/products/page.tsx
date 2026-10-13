import Link from 'next/link';

import { fetchApiWithFallback } from '@/lib/server-api';
import { formatCurrency, type Product } from '@/lib/store-data';

export default async function ProductsPage() {
  const { data: { items: products, filters }, unavailable } = await fetchApiWithFallback<{ items: Product[]; filters: { categories: string[] } }>('/api/products', { items: [], filters: { categories: [] } });
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-badge">M</span>
          <div>
            <p className="eyebrow">Mắc Khén Farm - Nông sản sấy vị Tây Bắc</p>
            <h1>Mắc Khén Farm</h1>
          </div>
        </div>
        <nav className="main-nav" aria-label="Menu chính">
          <Link href="/">Trang chủ</Link>
          <Link href="/products">Sản phẩm</Link>
          <Link href="/cart">Giỏ hàng</Link>
          <Link href="/account">Tài khoản</Link>
        </nav>
        <Link className="cta-link" href="/cart">
          Giỏ hàng
        </Link>
      </header>

      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Danh mục sản phẩm</p>
            <h2>Khô bò thực vật High-Protein</h2>
          </div>
        </div>

        <div className="filters" aria-label="Bộ lọc sản phẩm">
          <button className="filter-pill">Tất cả</button>
          {filters.categories.map((category) => <button key={category} className="filter-pill">{category}</button>)}
        </div>

        <div className="product-list">
          {unavailable && <p className="empty-state" role="status">Không thể kết nối cơ sở dữ liệu sản phẩm.</p>}
          {products.length ? products.map((product) => (
            <article key={product.id} className="product-card">
              <div className="image-box">
                <img src={product.image} alt={product.name} />
                <span className="chip">{product.highlight}</span>
              </div>
              <div className="card-body">
                <div className="meta-row">
                  <span>{product.category}</span>
                  <span>★ {product.rating}</span>
                </div>
                <h4>{product.name}</h4>
                <p>{product.description}</p>
                <div className="card-footer">
                  <strong>{formatCurrency(product.price)}</strong>
                  <Link href={`/products/${product.slug}`} className="secondary-action">
                    Chi tiết
                  </Link>
                </div>
              </div>
            </article>
          )) : <p className="empty-state">Danh mục hiện chưa có sản phẩm.</p>}
        </div>
      </section>
    </main>
  );
}
