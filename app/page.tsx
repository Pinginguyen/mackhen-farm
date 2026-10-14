import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import Header from '@/components/layout/Header';
import Hero3DCanvasLoader from '@/components/Hero3DCanvasLoader';
import ProductCatalogFilter from '@/components/ProductCatalogFilter';
import ScrollReveal from '@/components/ScrollReveal';

const homeRevealGroups = [
  { selector: '.home-page .comparison-table', highlight: true },
  { selector: '.home-page .process-steps > li', stagger: true },
  { selector: '.home-page .packing-steps > li', stagger: true },
];

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { error?: string } }) {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <main className="page-shell home-page">
      <Header />
      <ScrollReveal groups={homeRevealGroups} />
      {searchParams.error === 'forbidden' && <p className="role-notice" role="alert">Bạn không có quyền truy cập khu vực quản trị.</p>}

      <section className="hero">
        <div className="hero3d-layer" aria-hidden="true">
          <Hero3DCanvasLoader />
        </div>
        <div className="hero-copy">
          <div className="hero-badges">
            <span className="pill">Upcycled Food · Hương vị Tây Bắc</span>
            <Link href="/products" className="hero-proof-badge"><Sparkles size={16} />Gia vị Tây Bắc</Link>
          </div>
          <h1>Khô bò thực vật High-Protein, đậm vị Tây Bắc</h1>
          <p>
            Tái chế bã đậu nành thành món ăn giàu đạm, đậm vị mắc khén và hạt dổi, để nguyên liệu được sử dụng trọn vẹn hơn.
          </p>
          <div className="hero-actions">
            <Link href="/products" className="primary-btn">
              Khám phá sản phẩm <ArrowRight size={18} />
            </Link>
            <Link href="/tra-cuu" className="secondary-btn">
              <Truck size={17} />
              Theo dõi đơn hàng
            </Link>
          </div>
          <ul className="trust-list hero-checklist">
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
              src="/products/xe-soi.jpg"
              alt="Món ăn vặt khô và gia vị Tây Bắc"
            />
          </div>
        </div>
      </section>

      <section className="feature-row">
        {[
          { label: 'Hương vị', value: 'Mắc khén, hạt dổi Tây Bắc' },
          { label: 'Dinh dưỡng', value: 'Thông tin trên 100g' },
          { label: 'Đóng gói', value: 'Túi nhôm 3 lớp, gói khử oxy' },
        ].map((item) => (
          <article key={item.label} className="mini-panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="comparison-section">
        <div className="section-heading home-section-heading"><div><p className="eyebrow">So sánh lựa chọn</p><h2>Đậm vị thực vật, nhẹ gánh chi phí</h2></div></div>
        <div className="table-card comparison-table">
          <table>
            <thead>
              <tr><th>Tiêu chí</th><th className="comparison-featured">Mắc Khén Farm</th><th>Khô bò thịt thật</th></tr>
            </thead>
            <tbody>
              <tr><th>Cholesterol</th><td className="comparison-featured">0% Cholesterol</td><td>Có cholesterol</td></tr>
              <tr><th>Đạm</th><td className="comparison-featured">22g Đạm / túi</td><td>Tùy sản phẩm</td></tr>
              <tr><th>Chi phí</th><td className="comparison-featured">Tiết kiệm ~50%</td><td>Giá cao hơn</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="process-section">
        <div className="section-heading home-section-heading"><div><p className="eyebrow">Từ phụ phẩm đến món ngon</p><h2>5 bước sản xuất</h2></div></div>
        <ol className="process-steps">{['Thu gom bã đậu trong 4 giờ', 'Khử trùng và ép nước', 'Phối trộn hạt dổi, mắc khén', 'Tạo sợi hoặc tạo miếng', 'Sấy dẻo ở 60°C'].map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol>
      </section>

      <section className="packing-section home-packing-section">
        <div className="packing-panel">
          <div className="section-heading home-section-heading"><div><p className="eyebrow">Chuẩn bị cho hành trình</p><h2>4 lớp đóng gói</h2></div></div>
          <ol className="packing-steps">
            {[
              { label: 'Lớp 1: Trong cùng', title: 'Túi nhôm 3 lớp', detail: 'Cản sáng, hạn chế ẩm và giữ trọn hương vị.' },
              { label: 'Lớp 2: Bảo quản', title: 'Gói khử oxy', detail: 'Hạn chế oxy hóa, hỗ trợ bảo quản sản phẩm.' },
              { label: 'Lớp 3: Chống sốc', title: 'Hộp carton 3 lớp', detail: 'Giữ hộp chắc chắn, hạn chế móp méo khi vận chuyển.' },
              { label: 'Lớp 4: Vận chuyển', title: 'Màng xốp bóng khí', detail: 'Giảm va đập trong suốt hành trình giao hàng.' },
            ].map((layer) => (
              <li key={layer.title}>
                <span className="packing-layer-badge">{layer.label}</span>
                <strong>{layer.title}</strong>
                <p>{layer.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="catalog-section">
        <div className="section-heading home-section-heading catalog-heading">
          <div>
            <p className="eyebrow">Sản phẩm bán chạy</p>
            <h2>Chọn món yêu thích</h2>
          </div>
          <Link href="/products">Xem tất cả</Link>
        </div>

        <ProductCatalogFilter products={products} />
      </section>

      <section className="story-block">
        <div>
          <p className="eyebrow">Vì sao lựa chọn Mắc Khén Farm?</p>
          <h2>Tận dụng trọn nguyên liệu, giữ trọn vị ngon.</h2>
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
    </main>
  );
}
