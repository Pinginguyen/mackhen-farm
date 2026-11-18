'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useLocaleCurrency } from '@/lib/i18n-context';
import type { RecommendedProduct } from '@/lib/product-recommendations';

export default function ProductRecommendationShelf({ products }: { products: RecommendedProduct[] }) {
  const { locale, formatCurrency, translateProductName } = useLocaleCurrency();
  const [addingId, setAddingId] = useState('');

  if (!products.length) return null;

  async function addToCart(product: RecommendedProduct) {
    if (addingId) return;
    setAddingId(product.id);
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: product.slug, quantity: 1 }),
      });
      const result = await response.json() as { cartCount?: number; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể thêm sản phẩm vào giỏ.');
      window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: result.cartCount } }));
      window.dispatchEvent(new Event('mackhen:cart-drawer-open'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm sản phẩm vào giỏ.');
    } finally {
      setAddingId('');
    }
  }

  const isEnglish = locale === 'en';
  return (
    <section className="product-recommendation-shelf" aria-labelledby="product-recommendation-title">
      <header>
        <p className="eyebrow">{isEnglish ? 'CURATED PAIRINGS' : 'GỢI Ý THEO SẢN PHẨM'}</p>
        <h2 id="product-recommendation-title">{isEnglish ? 'You may also like' : 'Có thể bạn sẽ thích'}</h2>
        <p>{isEnglish ? 'Based on products in the same category and completed orders.' : 'Gợi ý từ danh mục cùng loại và các đơn hàng đã hoàn tất.'}</p>
      </header>
      <div className="product-recommendation-grid">
        {products.map((product) => <article className="product-recommendation-item" key={product.id}>
          <Link href={`/products/${encodeURIComponent(product.slug)}`} className="product-recommendation-image">
            <Image src={product.image} alt={translateProductName(product.name)} width={500} height={360} sizes="(max-width: 640px) 70vw, 25vw" />
          </Link>
          <div className="product-recommendation-copy">
            <small>{product.reason === 'frequently-bought-together'
              ? (isEnglish ? 'Often bought together' : 'Thường mua kèm')
              : (isEnglish ? 'Same category' : 'Cùng danh mục')}</small>
            <h3><Link href={`/products/${encodeURIComponent(product.slug)}`}>{translateProductName(product.name)}</Link></h3>
            <strong>{formatCurrency(product.price)}</strong>
          </div>
          <button type="button" className="product-recommendation-add" disabled={addingId !== '' || product.stock < 1} onClick={() => void addToCart(product)}>
            <ShoppingBag size={15} aria-hidden="true" /> {addingId === product.id ? (isEnglish ? 'Adding...' : 'Đang thêm') : (isEnglish ? 'Add' : 'Thêm vào giỏ')}
          </button>
        </article>)}
      </div>
    </section>
  );
}