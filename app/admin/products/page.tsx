import { ArrowUpRight } from 'lucide-react';
import { fetchApiWithFallback } from '@/lib/server-api';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import ProductsManager from './products-manager';

export const dynamic = 'force-dynamic';

type AdminProduct = CatalogProduct & { active: boolean };

export default async function AdminProductsPage() {
  const { data: { items: products }, unavailable } = await fetchApiWithFallback<{ items: AdminProduct[] }>('/api/products', { items: DEFAULT_PRODUCTS });
  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Danh mục &amp; mức tồn kho</p>
            <h2>Sản phẩm</h2>
          </div>
        </div>

        {unavailable && <p className="empty-state" role="status">Không thể đồng bộ dữ liệu sản phẩm; danh sách mẫu đang được hiển thị.</p>}
        <ProductsManager initialProducts={products} />
        <p className="admin-inventory-note"><ArrowUpRight size={15} /> Mức tồn dưới 30 đơn vị được đánh dấu cần bổ sung.</p>
      </section>
    </main>
  );
}
