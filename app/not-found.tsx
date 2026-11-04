import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';

export default function NotFound() {
  const featuredProducts = DEFAULT_PRODUCTS.filter((product) => product.active).slice(0, 3);

  return (
    <main className="not-found-page">
      <section className="not-found-hero">
        <p className="not-found-kicker">MẮC KHÉN FARM · SƠN LA</p>
        <h1>404 - LẠC BƯỚC GIỮA ĐẠI NGÀN</h1>
        <p>Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển dời sang nương rẫy khác.</p>
        <Link className="not-found-home-link" href="/"><ArrowLeft size={17} aria-hidden="true" /> Quay về bản làng (Trang chủ)</Link>
      </section>
      <section className="not-found-products" aria-labelledby="not-found-products-title">
        <div className="not-found-products-heading">
          <p className="not-found-kicker">GỢI Ý TỪ NƯƠNG</p>
          <h2 id="not-found-products-title">Có thể bạn đang tìm</h2>
        </div>
        <div className="not-found-products-grid">
          {featuredProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
        </div>
      </section>
    </main>
  );
}