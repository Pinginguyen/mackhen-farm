import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import ProductCatalogFilter, { type CatalogProduct } from '@/components/ProductCatalogFilter';
import HomeTransparencyTabs from '@/components/HomeTransparencyTabs';
import ScrollReveal from '@/components/ScrollReveal';
import { prisma } from '@/lib/prisma';
import { normalizeNutritionFacts, normalizePairingGuide, normalizeSensoryProfile } from '@/lib/store-data';
import LocalizedText from '@/components/LocalizedText';
import LocalizedHeroImage from '@/components/LocalizedHeroImage';
import HomeHeroReveal from '@/components/HomeHeroReveal';
import BeforeAfterSlider from '@/components/home/BeforeAfterSlider';
import FlavorPairingGuide from '@/components/product/FlavorPairingGuide';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import { getSiteAsset } from '@/lib/site-assets';
import PromoVoucherCode from '@/components/home/PromoVoucherCode';
import { getCoreContentSettings } from '@/lib/system-settings';
import ForbiddenNotice from '@/components/layout/ForbiddenNotice';

const homeRevealGroups = [
  { selector: '.home-page .comparison-table', highlight: true },
];

export const revalidate = 300;

export default async function HomePage() {
  const [heroImageUrl, heroImageMobileUrl, promoBannerUrl, storyImageUrl, beforeAfterOriginalUrl, beforeAfterResultUrl, contentSettings] = await Promise.all([
    getSiteAsset('HERO_BANNER_MAIN', '/products/xe-soi.jpg'),
    getSiteAsset('HERO_BANNER_MOBILE', '/products/hat-mac-khen.jpg'),
    getSiteAsset('PROMO_BANNER_HOME', '/products/combo.jpg'),
    getSiteAsset('STORY_SECTION_IMAGE', '/products/hat-doi.jpg'),
    getSiteAsset('BEFORE_AFTER_ORIGINAL', '/products/soy-pulp.svg'),
    getSiteAsset('BEFORE_AFTER_RESULT', '/products/xe-soi.jpg'),
    getCoreContentSettings(),
  ]);
  const distinctStoryImageUrl = storyImageUrl === promoBannerUrl ? '/products/hat-doi.jpg' : storyImageUrl;
  let products: CatalogProduct[] = [];
  let bestSellers: CatalogProduct[] = [];
  try {
    const [databaseProducts, databaseBestSellers] = await Promise.all([
      prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
      prisma.product.findMany({ where: { active: true }, take: 4, orderBy: { createdAt: 'desc' } }),
    ]);
    products = databaseProducts.length
      ? databaseProducts.map((product) => ({ ...product, nutritionFacts: normalizeNutritionFacts(product.nutritionFacts), sensoryProfile: normalizeSensoryProfile(product.sensoryProfile), pairingGuide: normalizePairingGuide(product.pairingGuide) }))
      : DEFAULT_PRODUCTS;
    bestSellers = databaseBestSellers.length
      ? databaseBestSellers.map((product) => ({ ...product, nutritionFacts: normalizeNutritionFacts(product.nutritionFacts), sensoryProfile: normalizeSensoryProfile(product.sensoryProfile), pairingGuide: normalizePairingGuide(product.pairingGuide) }))
      : DEFAULT_PRODUCTS.filter((product) => product.active).slice(0, 4);
  } catch (error) {
    console.error('[HOME_PRODUCTS_DB_ERROR]', error instanceof Error ? error.message : error);
    products = DEFAULT_PRODUCTS;
    bestSellers = DEFAULT_PRODUCTS.filter((product) => product.active).slice(0, 4);
  }
  return (
    <main className="page-shell home-page">
      <ScrollReveal groups={homeRevealGroups} />
      <HomeHeroReveal />
      <ForbiddenNotice />

      <section className="hero">
        <div className="hero-copy">
          <div className="home-gourmet-label">
            <span aria-hidden="true">✦</span>
            <LocalizedText text="100% ĐẠM THỰC VẬT • VỊ RỪNG TÂY BẮC" />
          </div>
          <h1 className="home-gourmet-title"><LocalizedText text="Khô Bò Thực Vật" /></h1>
          <p className="home-gourmet-subtitle"><LocalizedText text="Thớ dai đậm vị, cay tê khói củi mộc" /></p>
          <p className="home-gourmet-description">
            <LocalizedText text="Thức quà lai rai thượng hạng từ nguồn đạm thực vật bản địa, ủ đượm gia vị mắc khén sao giòn và hạt dổi nướng than vùng cao." />
          </p>
          <div className="hero-actions home-gourmet-actions">
            <Link href="/products" className="primary-btn home-gourmet-primary">
              <LocalizedText text="Mua ngay mẻ sấy mới" /> <span aria-hidden="true">➔</span>
            </Link>
            <Link href="#flavor-pairing-title" className="secondary-btn home-gourmet-secondary">
              <LocalizedText text="Khám phá gợi ý thưởng vị" />
            </Link>
          </div>
          <div className="home-gourmet-batch-status" aria-label="Tình trạng mẻ sấy thủ công">
            <span className="home-gourmet-status-dot" aria-hidden="true" />
            <span><LocalizedText text={contentSettings.heroScarcityBadge} /></span>
          </div>
        </div>
        <div className="hero-media">
          <div className="photo-card home-hero-photo">
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
          <img className="w-full h-full rounded-2xl object-cover object-center" src={promoBannerUrl} alt="Combo sản phẩm Mắc Khén Farm" />
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

      <FlavorPairingGuide products={products.length ? products : DEFAULT_PRODUCTS} />

      <BeforeAfterSlider originalImageUrl={beforeAfterOriginalUrl} resultImageUrl={beforeAfterResultUrl} />

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

      <HomeTransparencyTabs featureImageUrls={['/products/soy-pulp.svg', '/products/combo.jpg', '/products/hat-mac-khen.jpg']} />

      <section className="story-block">
        <div>
          <p className="eyebrow"><LocalizedText text="Vì sao lựa chọn Mắc Khén Farm?" /></p>
          <h2><LocalizedText text="Tận dụng trọn nguyên liệu, giữ trọn vị ngon." /></h2>
        </div>
        <img className="story-section-image w-full h-full rounded-2xl object-cover object-center" src={distinctStoryImageUrl} alt="Hạt dổi bản địa được thu hoạch thủ công tại vùng cao" />
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
