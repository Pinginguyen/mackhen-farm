import Link from 'next/link';
import { ArrowRight, ShieldCheck, ShoppingBag, Sparkles, Truck } from 'lucide-react';

import { fetchApiWithFallback } from '@/lib/server-api';
import { formatCurrency, type Product } from '@/lib/store-data';

export default async function HomePage() {
  const { data: { items: products }, unavailable } = await fetchApiWithFallback<{ items: Product[] }>('/api/products', { items: [] });
  const bestSellers = products.slice(0, 4);

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
          <Link href="/tai-khoan">Tài khoản</Link>
          <Link href="/tra-cuu">Tra cứu đơn</Link>
          <Link href="/admin">Quản trị</Link>
        </nav>
        <Link className="cta-link" href="/products">
          <ShoppingBag size={16} /> Mua ngay
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="pill">Upcycled Food · Hương vị Tây Bắc</span>
          <h2>Khô bò thực vật High-Protein chuẩn vị Tây Bắc - Dự án kinh tế tuần hoàn Upcycled Food từ bã đậu nành địa phương</h2>
          <p>
            Tái chế bã đậu nành thành món ăn giàu đạm, đậm vị mắc khén và hạt dổi, để nguyên liệu được sử dụng trọn vẹn hơn.
          </p>
          <div className="hero-actions">
            <Link href="/products" className="primary-btn">
              Xem sản phẩm <ArrowRight size={18} />
            </Link>
            <Link href="/admin/dashboard" className="secondary-btn">
              Xem báo cáo
            </Link>
          </div>
          <ul className="trust-list">
            <li>
              <ShieldCheck size={16} /> Tận dụng bã đậu nành địa phương
            </li>
            <li>
              <Truck size={16} /> Đóng gói sẵn sàng vận chuyển
            </li>
            <li>
              <Sparkles size={16} /> Mùi vị đặc trưng Tây Bắc
            </li>
          </ul>
        </div>
        <div className="hero-media">
          <div className="photo-card">
            <img
              src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80"
              alt="Món ăn vặt khô và gia vị Tây Bắc"
            />
          </div>
        </div>
      </section>

      <section className="feature-row">
        {[
          { label: 'Hương vị', value: 'Mắc khén, hạt dổi Tây Bắc' },
          { label: 'Protein', value: '22g trong dòng xé sợi' },
          { label: 'Đóng gói', value: 'Túi nhôm 3 lớp, gói khử oxy' },
        ].map((item) => (
          <article key={item.label} className="mini-panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="comparison-section">
        <div className="section-heading"><div><p className="eyebrow">So sánh lựa chọn</p><h3>Đậm vị thực vật, nhẹ gánh chi phí</h3></div></div>
        <div className="table-card comparison-table"><table><thead><tr><th>Tiêu chí</th><th>Mắc Khén Farm</th><th>Khô bò thịt thật</th></tr></thead><tbody><tr><th>Cholesterol</th><td>0%</td><td>Có cholesterol</td></tr><tr><th>Đạm</th><td>22g / túi xé sợi</td><td>Tùy sản phẩm</td></tr><tr><th>Chi phí</th><td>Tiết kiệm khoảng 50%</td><td>Giá cao hơn</td></tr></tbody></table></div>
      </section>

      <section className="process-section">
        <div className="section-heading"><div><p className="eyebrow">Từ phụ phẩm đến món ngon</p><h3>5 bước sản xuất</h3></div></div>
        <ol className="process-steps">{['Thu gom bã đậu trong 4 giờ', 'Khử trùng và ép nước', 'Phối trộn hạt dổi, mắc khén', 'Tạo sợi hoặc tạo miếng', 'Sấy dẻo ở 60°C'].map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol>
      </section>

      <section className="packing-section">
        <div className="section-heading"><div><p className="eyebrow">Chuẩn bị cho hành trình</p><h3>4 lớp đóng gói</h3></div></div>
        <ol className="packing-steps">{['Túi nhôm 3 lớp', 'Gói khử oxy', 'Hộp carton 3 lớp', 'Màng xốp bóng khí'].map((step, index) => <li key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}</ol>
      </section>

      <section className="catalog-section">
        {unavailable && <p className="empty-state" role="status">Không thể kết nối cơ sở dữ liệu sản phẩm.</p>}
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sản phẩm bán chạy</p>
            <h3>Chọn món yêu thích</h3>
          </div>
          <Link href="/products">Xem tất cả</Link>
        </div>

        <div className="product-grid">
          {bestSellers.length ? bestSellers.map((product) => (
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
                  <span>{product.status}</span>
                </div>
              </div>
            </article>
          )) : <p className="empty-state">Chưa có sản phẩm được đăng bán.</p>}
        </div>
      </section>

      <section className="story-block">
        <div>
          <p className="eyebrow">Vì sao lựa chọn Mắc Khén Farm?</p>
          <h3>Tận dụng trọn nguyên liệu, giữ trọn vị ngon.</h3>
        </div>
        <div className="story-grid">
          {[
            'Mô hình Upcycled Food biến bã đậu nành sau sản xuất thành nguồn đạm thực vật cho món ăn vặt.',
            'Mắc khén, hạt dổi và tiêu rừng mang hương vị đặc trưng của vùng Tây Bắc.',
            'Túi nhôm 3 lớp kết hợp gói khử oxy giúp bảo vệ sản phẩm trong quá trình bảo quản và vận chuyển.',
          ].map((item) => (
            <div key={item} className="story-item">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="catalog-section compact">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Danh mục nổi bật</p>
            <h3>Khám phá thêm</h3>
          </div>
        </div>
        <div className="bottom-grid">
          {products.map((product) => (
            <Link key={product.id} href={`/san-pham/${product.slug}`} className="compact-card">
              <img src={product.image} alt={product.name} />
              <div>
                <strong>{product.name}</strong>
                <span>{formatCurrency(product.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
