import { prisma } from '@/lib/prisma';
import ProductCatalogFilter, { type CatalogProduct } from '@/components/ProductCatalogFilter';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import { normalizeNutritionFacts } from '@/lib/store-data';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams?: { search?: string } }) {
  let products: CatalogProduct[];
  try {
    const databaseProducts = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (databaseProducts.length) {
      products = databaseProducts.map((product) => ({ ...product, nutritionFacts: normalizeNutritionFacts(product.nutritionFacts) }));
    } else {
      console.warn('Không kết nối được DB, dùng danh sách sản phẩm mặc định');
      products = DEFAULT_PRODUCTS;
    }
  } catch (error) {
    console.error('[CRITICAL_DB_ERROR] Chi tiết lỗi tại file này:', error instanceof Error ? error.message : error);
    console.warn('Không kết nối được DB, dùng danh sách sản phẩm mặc định');
    products = DEFAULT_PRODUCTS;
  }

  return (
    <main className="page-shell products-page">
      <section className="products-artisan-hero" aria-labelledby="products-hero-title">
        <div className="products-artisan-copy">
          <p className="products-artisan-kicker">MẮC KHÉN FARM <span /> SƠN LA</p>
          <h1 id="products-hero-title">ĐẶC SẢN NÔNG SẢN TÂY BẮC</h1>
          <p className="products-artisan-description">
            Từ bã đậu nành địa phương đến món ăn giàu đạm, kết hợp mắc khén và hạt dổi mang hương vị núi rừng.
          </p>
          <p className="products-artisan-note">Thực phẩm tuần hoàn · Nguyên liệu rõ nguồn gốc</p>
        </div>
        <div className="products-artisan-visual">
          <Image
            src="/products/hat-mac-khen.jpg"
            alt="Hạt mắc khén Sơn La, gia vị đặc trưng Tây Bắc"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 42vw"
          />
          <span>HƯƠNG VỊ TỪ VÙNG CAO</span>
        </div>
      </section>

      <section className="products-catalog" aria-labelledby="products-catalog-title">
        <header className="products-catalog-heading">
          <div>
            <p className="eyebrow">Danh mục sản phẩm</p>
            <h2 id="products-catalog-title">Khám phá sản phẩm Tây Bắc</h2>
          </div>
        </header>
        <ProductCatalogFilter products={products} initialQuery={searchParams?.search ?? ''} />
      </section>
    </main>
  );
}
