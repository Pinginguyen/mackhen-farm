import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';

import Hero3DCanvasLoader from '@/components/Hero3DCanvasLoader';
import ProductCatalogFilter, { type CatalogProduct } from '@/components/ProductCatalogFilter';
import HomeTransparencyTabs from '@/components/HomeTransparencyTabs';
import ScrollReveal from '@/components/ScrollReveal';
import { fetchApiWithFallback } from '@/lib/server-api';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';

const homeRevealGroups = [
  { selector: '.home-page .comparison-table', highlight: true },
];

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { error?: string } }) {
  const { data: { items: products } } = await fetchApiWithFallback<{ items: CatalogProduct[] }>('/api/products', { items: DEFAULT_PRODUCTS });
  return (
    <main className="page-shell home-page">
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
            <Image
              src="/products/xe-soi.jpg"
              alt="Món ăn vặt khô và gia vị Tây Bắc"
              width={920}
              height={760}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
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

      <HomeTransparencyTabs />

      <section className="catalog-section">
        <div className="section-heading home-section-heading catalog-heading">
          <div>
            <h2 className="catalog-section-title">SẢN PHẨM BÁN CHẠY</h2>
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
