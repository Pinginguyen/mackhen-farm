import Link from 'next/link';
import { ArrowRight, Flame, Sparkles, Sprout, Truck } from 'lucide-react';

import Hero3DCanvasLoader from '@/components/Hero3DCanvasLoader';
import ProductCatalogFilter, { type CatalogProduct } from '@/components/ProductCatalogFilter';
import HomeTransparencyTabs from '@/components/HomeTransparencyTabs';
import ScrollReveal from '@/components/ScrollReveal';
import { prisma } from '@/lib/prisma';
import { normalizeNutritionFacts } from '@/lib/store-data';
import LocalizedText from '@/components/LocalizedText';
import LocalizedHeroImage from '@/components/LocalizedHeroImage';
import HomeHeroReveal from '@/components/HomeHeroReveal';
import BeforeAfterSlider from '@/components/home/BeforeAfterSlider';
import ProductCylinder3DLoader from '@/components/home/ProductCylinder3DLoader';
import FlavorPairingGuide from '@/components/product/FlavorPairingGuide';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import { getSiteAsset } from '@/lib/site-assets';
import PromoVoucherCode from '@/components/home/PromoVoucherCode';
import { getCoreContentSettings } from '@/lib/system-settings';

const homeRevealGroups = [
  { selector: '.home-page .comparison-table', highlight: true },
];

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { error?: string } }) {
  const [heroImageUrl, heroImageMobileUrl, promoBannerUrl, storyImageUrl, contentSettings] = await Promise.all([
    getSiteAsset('HERO_BANNER_MAIN', '/products/xe-soi.jpg'),
    getSiteAsset('HERO_BANNER_MOBILE', '/products/xe-soi.jpg'),
    getSiteAsset('PROMO_BANNER_HOME', '/products/combo.jpg'),
    getSiteAsset('STORY_SECTION_IMAGE', '/products/xe-soi.jpg'),
    getCoreContentSettings(),
  ]);
  let products: CatalogProduct[] = [];
  let bestSellers: CatalogProduct[] = [];
  try {
    const [databaseProducts, databaseBestSellers] = await Promise.all([
      prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
      prisma.product.findMany({ where: { active: true }, take: 4, orderBy: { createdAt: 'desc' } }),
    ]);
    products = databaseProducts.map((product) => ({ ...product, nutritionFacts: normalizeNutritionFacts(product.nutritionFacts) }));
    bestSellers = databaseBestSellers.map((product) => ({ ...product, nutritionFacts: normalizeNutritionFacts(product.nutritionFacts) }));
  } catch (error) {
    console.error('[HOME_PRODUCTS_DB_ERROR]', error instanceof Error ? error.message : error);
  }
  return (
    <main className="page-shell home-page">
      <ScrollReveal groups={homeRevealGroups} />
      <HomeHeroReveal />
      {searchParams.error === 'forbidden' && <p className="role-notice" role="alert"><LocalizedText text="Bạn không có quyền truy cập khu vực quản trị." /></p>}

      <section className="hero">
        <div className="hero3d-layer" aria-hidden="true">
          <Hero3DCanvasLoader />
        </div>
        <div className="hero-copy">
          <div className="hero-badges">
            <span className="pill"><Sprout className="hero-upcycled-icon" aria-hidden="true" /><LocalizedText text="Upcycled Food · Hương vị Tây Bắc" /></span>
            <Link href="/products" className="hero-proof-badge"><Sparkles size={16} /><LocalizedText text="Gia vị Tây Bắc" /></Link>
          </div>
          <h1><span className="hero-title-main"><LocalizedText text="Khô bò thực vật" /></span><span className="hero-title-accent"><LocalizedText text="High-Protein, đậm vị Tây Bắc" /></span></h1>
          <p>
            <LocalizedText text="Tái chế bã đậu nành thành món ăn giàu đạm, đậm vị mắc khén và hạt dổi, để nguyên liệu được sử dụng trọn vẹn hơn." />
          </p>
          <div className="hero-actions">
            <Link href="/products" className="primary-btn">
              <LocalizedText text="Khám phá sản phẩm" /> <ArrowRight size={18} />
            </Link>
            <Link href="/tra-cuu" className="secondary-btn">
              <Truck size={17} />
              <LocalizedText text="Theo dõi đơn hàng" />
            </Link>
          </div>
          <ul className="trust-list hero-checklist">
            <li className="hero-feature-pill">
              <Sprout className="w-4 h-4 text-emerald-600" aria-hidden="true" /> <LocalizedText text="Tận dụng bã đậu nành địa phương" />
            </li>
            <li className="hero-feature-pill">
              <Truck className="w-4 h-4 text-emerald-600" aria-hidden="true" /> <LocalizedText text="Đóng gói sẵn sàng vận chuyển" />
            </li>
            <li className="hero-feature-pill">
              <Flame className="w-4 h-4 text-amber-600" aria-hidden="true" /> <LocalizedText text="Mùi vị đặc trưng Tây Bắc" />
            </li>
          </ul>
        </div>
        <div className="hero-media">
          <div className="photo-card animate-float">
            <LocalizedHeroImage imageUrl={heroImageUrl} mobileImageUrl={heroImageMobileUrl} />
          </div>
        </div>
      </section>

      <section className="catalog-section">
        <div className="section-heading home-section-heading catalog-heading">
          <div>
            <h2 className="catalog-section-title"><LocalizedText text="SẢN PHẨM NỔI BẬT & COMBO" /></h2>
          </div>
          <Link href="/products"><LocalizedText text="Xem tất cả sản phẩm" /> <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>

        <ProductCatalogFilter products={bestSellers} showFilters={false} />
      </section>

      <section className="home-promo-banner-wrap">
        <div className="home-promo-banner">
          <img src={promoBannerUrl} alt="Combo sản phẩm Mắc Khén Farm" />
          <span className="home-promo-banner-copy">
            <span className="promo-deal-badge">COMBO TIẾT KIỆM</span>
            <strong>{contentSettings.homePromoTitle}</strong>
            <PromoVoucherCode code={contentSettings.homePromoVoucherCode} />
            <Link className="home-promo-cta" href="/khuyen-mai">
              <LocalizedText text="Khám phá ưu đãi ngay" /> <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </span>
        </div>
      </section>

      <ProductCylinder3DLoader products={products} />

      <FlavorPairingGuide products={products.length ? products : DEFAULT_PRODUCTS} />

      <BeforeAfterSlider />

      <section className="comparison-section">
        <div className="section-heading home-section-heading"><div><p className="eyebrow"><LocalizedText text="So sánh lựa chọn" /></p><h2><LocalizedText text="Đậm vị thực vật, chi phí tối ưu" /></h2></div></div>
        <div className="table-card comparison-table">
          <table>
            <thead>
              <tr><th><LocalizedText text="Tiêu chí" /></th><th className="comparison-featured"><LocalizedText text="Mắc Khén Farm" /></th><th><LocalizedText text="Khô bò thịt thật" /></th></tr>
            </thead>
            <tbody>
              <tr><th>Cholesterol</th><td className="comparison-featured">0% Cholesterol</td><td><LocalizedText text="Có cholesterol" /></td></tr>
              <tr><th><LocalizedText text="Đạm" /></th><td className="comparison-featured"><LocalizedText text="22g Đạm / túi" /></td><td><LocalizedText text="Tùy sản phẩm" /></td></tr>
              <tr><th><LocalizedText text="Chi phí" /></th><td className="comparison-featured"><LocalizedText text="Tiết kiệm ~50%" /></td><td><LocalizedText text="Giá cao hơn" /></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <HomeTransparencyTabs />

      <section className="story-block">
        <div>
          <p className="eyebrow"><LocalizedText text="Vì sao lựa chọn Mắc Khén Farm?" /></p>
          <h2><LocalizedText text="Tận dụng trọn nguyên liệu, giữ trọn vị ngon." /></h2>
        </div>
        <img className="story-section-image" src={storyImageUrl} alt="Câu chuyện thương hiệu Mắc Khén Farm" />
        <div className="story-grid">
          {[
            'Mô hình Upcycled Food biến bã đậu nành sau sản xuất thành nguồn đạm thực vật cho món ăn vặt.',
            'Mắc khén, hạt dổi và tiêu rừng mang hương vị đặc trưng của vùng Tây Bắc.',
            'Túi nhôm 3 lớp kết hợp gói khử oxy giúp bảo vệ sản phẩm trong quá trình bảo quản và vận chuyển.',
          ].map((item) => (
            <div key={item} className="story-item">
              <LocalizedText text={item} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
