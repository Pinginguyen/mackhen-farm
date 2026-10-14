import { prisma } from '@/lib/prisma';
import Header from '@/components/layout/Header';
import ProductCatalogFilter, { type CatalogProduct } from '@/components/ProductCatalogFilter';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products: CatalogProduct[] = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="page-shell">
      <Header />

      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Danh mục sản phẩm</p>
            <h2>Khám phá sản phẩm Tây Bắc</h2>
          </div>
        </div>

        <ProductCatalogFilter products={products} />
      </section>
    </main>
  );
}
