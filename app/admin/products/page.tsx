import { ArrowUpRight } from 'lucide-react';
import { fetchApi } from '@/lib/server-api';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import ProductsManager from './products-manager';

export const dynamic = 'force-dynamic';

type AdminProduct = CatalogProduct & { active: boolean };

export default async function AdminProductsPage() {
  let products: AdminProduct[] = [];
  let unavailable = false;
  try {
    const result = await fetchApi<{ items: AdminProduct[] }>('/api/admin/products');
    products = result.items;
  } catch {
    unavailable = true;
    products = DEFAULT_PRODUCTS.map((product) => ({ ...product, active: true, variants: [] }));
  }
  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Danh mục &amp; mức tồn kho</p>
            <h2>Sản phẩm</h2>
          </div>
        </div>

        {unavailable && <p className="empty-state" role="status">Không thể tải sản phẩm từ cơ sở dữ liệu. Vui lòng thử lại sau.</p>}
        <ProductsManager initialProducts={products} />
        <p className="admin-inventory-note"><ArrowUpRight size={15} /> Mức tồn dưới 30 đơn vị được đánh dấu cần bổ sung.</p>
      </section>
    </main>
  );
}
