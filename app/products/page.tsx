import { prisma } from '@/lib/prisma';
import ProductCatalogFilter, { type CatalogProduct } from '@/components/ProductCatalogFilter';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import { normalizeNutritionFacts } from '@/lib/store-data';

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
    <main className="page-shell !bg-[#FAF7F2]">
      <section className="page-card !rounded-2xl !border !border-stone-200/70 !bg-white shadow-sm">
        <div className="page-title">
          <div>
            <p className="eyebrow">Danh mục sản phẩm</p>
            <h2 className="text-2xl font-semibold text-stone-900">Khám phá sản phẩm Tây Bắc</h2>
          </div>
        </div>

        <ProductCatalogFilter products={products} initialQuery={searchParams?.search ?? ''} />
      </section>
    </main>
  );
}
