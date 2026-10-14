import { ArrowUpRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import StockControl from './stock-control';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Danh mục &amp; mức tồn kho</p>
            <h2>Sản phẩm</h2>
          </div>
          <span className="admin-count-badge">{products.length} sản phẩm</span>
        </div>

        <div className="table-card admin-products-table">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>GIÁ (VNĐ)</th>
                <th>GIÁ TRỊ KHO</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td><div className="admin-product-name"><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.unit}</small></span></div></td>
                  <td>{product.category}</td>
                  <StockControl productId={product.id} currentPrice={product.price} currentStock={product.stock} active={product.active} />
                </tr>
              ))}
              {!products.length && <tr><td colSpan={5}>Chưa có sản phẩm trong danh mục.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="admin-inventory-note"><ArrowUpRight size={15} /> Mức tồn dưới 30 đơn vị được đánh dấu cần bổ sung.</p>
      </section>
    </main>
  );
}
