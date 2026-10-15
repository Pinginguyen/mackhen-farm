import { prisma } from '@/lib/prisma';
import ProductCatalogFilter, { type CatalogProduct } from '@/components/ProductCatalogFilter';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams?: { search?: string } }) {
  let products: CatalogProduct[];
  try {
    const databaseProducts = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (databaseProducts.length) {
      products = databaseProducts;
    } else {
      console.warn('Không kết nối được DB, dùng danh sách sản phẩm mặc định');
      products = DEFAULT_PRODUCTS;
    }
  } catch {
    console.warn('Không kết nối được DB, dùng danh sách sản phẩm mặc định');
    products = DEFAULT_PRODUCTS;
  }

  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Danh mục sản phẩm</p>
            <h2>Khám phá sản phẩm Tây Bắc</h2>
          </div>
        </div>

        <ProductCatalogFilter products={products} initialQuery={searchParams?.search ?? ''} />
      </section>
    </main>
  );
}
