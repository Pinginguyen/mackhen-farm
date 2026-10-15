'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Eye } from 'lucide-react';

import ProductRating from '@/components/ProductRating';
import ProductQuickView from '@/components/ProductQuickView';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';

export default function ProductCard({ product, index }: { product: CatalogProduct; index: number }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const secondImage = product.images?.find((image) => image && image !== product.image);
  const imageIsUnoptimized = (image: string) => image.startsWith('data:') || /^https?:\/\//i.test(image);

  return (
    <article className={`product-card${product.stock === 0 ? ' is-out-of-stock' : ''}`} style={{ animationDelay: `${index * 35}ms` }}>
      <div className={`image-box product-card-media${secondImage ? ' has-secondary' : ''}`}>
        <Link className="product-card-image-link" href={`/products/${product.slug}`} aria-label={`Xem ${product.name}`}>
          <Image className="product-card-image is-primary" src={product.image} alt={product.name} width={800} height={600} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={index < 2} unoptimized={imageIsUnoptimized(product.image)} />
          {secondImage && <Image className="product-card-image is-secondary" src={secondImage} alt={`${product.name}, góc chụp khác`} width={800} height={600} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" unoptimized={imageIsUnoptimized(secondImage)} />}
        </Link>
        <div className="product-badges">
          {product.stock === 0 && <span className="product-badge out-of-stock-badge">Tạm hết hàng</span>}
          {product.protein != null && <span className="product-badge nutrition-badge">{product.protein} Protein</span>}
          <span className="product-badge">{product.highlight}</span>
        </div>
        {product.stock > 0 && <button className="product-card-quick-view" type="button" onClick={() => setQuickViewOpen(true)} aria-label={`Xem nhanh ${product.name}`}><Eye size={16} />Xem nhanh</button>}
      </div>
      <div className="card-body">
        <div className="product-card-header">
          <div className="meta-row"><span>{product.category} • {product.unit ?? 'Khối lượng chưa cập nhật'}</span></div>
          <ProductRating rating={product.rating} showValue={false} size="sm" />
        </div>
        <h4 className="product-name"><Link href={`/products/${product.slug}`}>{product.name}</Link></h4>
        <p className="product-card-description text-xs text-stone-500 line-clamp-2 leading-relaxed">{product.description}</p>
        <div className="product-card-pricing"><div className="product-prices"><strong>{product.price.toLocaleString('vi-VN')}đ</strong>{product.originalPrice != null && <del>{product.originalPrice.toLocaleString('vi-VN')}đ</del>}</div></div>
        <Link
          href={`/products/${product.slug}`}
          aria-disabled={product.stock === 0}
          tabIndex={product.stock === 0 ? -1 : undefined}
          onClick={(event) => { if (product.stock === 0) event.preventDefault(); }}
          className={`product-card-action${product.stock === 0 ? ' is-out-of-stock' : ''}`}
        >
          {product.stock === 0 ? 'Tạm hết hàng' : <>Chọn mua <ArrowRight size={16} /></>}
        </Link>
      </div>
      {quickViewOpen && <ProductQuickView product={product} onClose={() => setQuickViewOpen(false)} />}
    </article>
  );
}