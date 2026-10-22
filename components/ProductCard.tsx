'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Eye } from 'lucide-react';

import ProductRating from '@/components/ProductRating';
import ProductQuickView from '@/components/ProductQuickView';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function ProductCard({ product, index }: { product: CatalogProduct; index: number }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { locale, formatCurrency, translateProductName, t } = useLocaleCurrency();
  const productName = translateProductName(product.name);
  const secondImage = product.images?.find((image) => image && image !== product.image);
  const imageIsUnoptimized = (image: string) => image.startsWith('data:') || /^https?:\/\//i.test(image);

  return (
    <article className={`product-card !rounded-2xl !border !border-stone-200/60 !bg-white !shadow-xs transition-all duration-300 hover:!shadow-md hover:!-translate-y-1${product.stock === 0 ? ' is-out-of-stock' : ''}`} style={{ animationDelay: `${index * 35}ms` }}>
      <div className={`image-box product-card-media group !overflow-hidden !rounded-xl${secondImage ? ' has-secondary' : ''}`}>
        <Link className="product-card-image-link" href={`/products/${product.slug}`} aria-label={`${t('products')}: ${productName}`}>
          <Image className="product-card-image is-primary transition-transform duration-500 group-hover:!scale-105" src={product.image} alt={productName} width={800} height={600} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={index < 2} unoptimized={imageIsUnoptimized(product.image)} />
          {secondImage && <Image className="product-card-image is-secondary transition-transform duration-500 group-hover:!scale-105" src={secondImage} alt={`${productName}, alternate view`} width={800} height={600} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" unoptimized={imageIsUnoptimized(secondImage)} />}
        </Link>
        <div className="product-badges">
          {product.stock === 0 && <span className="product-badge out-of-stock-badge !min-h-0 !px-2.5 !py-0.5 !rounded-full !border !border-stone-200/70 !text-[11px] !font-semibold !tracking-wide">Tạm hết hàng</span>}
          {product.protein != null && <span className="product-badge nutrition-badge !min-h-0 !px-2.5 !py-0.5 !rounded-full !border !border-stone-200/70 !text-[11px] !font-semibold !tracking-wide">{product.protein} Protein</span>}
          {product.badge?.trim() && <span className="product-highlight-badge !px-2.5 !py-0.5 !rounded-full !border !border-stone-200/70 !text-[11px] !font-semibold !tracking-wide">{product.badge}</span>}
          <span className="product-badge !min-h-0 !px-2.5 !py-0.5 !rounded-full !border !border-stone-200/70 !text-[11px] !font-semibold !tracking-wide">{product.highlight}</span>
        </div>
        {product.stock > 0 && <button className="product-card-quick-view" type="button" onClick={() => setQuickViewOpen(true)} aria-label={`${locale === 'en' ? 'Quick view' : 'Xem nhanh'} ${productName}`}><Eye size={16} />{locale === 'en' ? 'Quick view' : 'Xem nhanh'}</button>}
      </div>
      <div className="card-body">
        <div className="product-card-header">
          <div className="meta-row"><span>{product.category} • {product.unit ?? 'Khối lượng chưa cập nhật'}</span></div>
          <ProductRating rating={product.rating} showValue={false} size="sm" />
        </div>
        <h4 className="product-name"><Link href={`/products/${product.slug}`}>{productName}</Link></h4>
        <p className="product-card-description text-xs text-stone-500 line-clamp-2 leading-relaxed">{product.description}</p>
        <div className="product-card-pricing"><div className="product-prices"><strong className="!text-[#9B2424]">{formatCurrency(product.price)}</strong>{product.originalPrice != null && <del className="!text-stone-400">{formatCurrency(product.originalPrice)}</del>}</div></div>
        <Link
          href={`/products/${product.slug}`}
          aria-disabled={product.stock === 0}
          tabIndex={product.stock === 0 ? -1 : undefined}
          onClick={(event) => { if (product.stock === 0) event.preventDefault(); }}
          className={`product-card-action !rounded-xl !bg-[#9B2424] !text-white !shadow-xs transition-all duration-300 hover:!bg-[#831D1D] hover:!shadow-sm${product.stock === 0 ? ' is-out-of-stock' : ''}`}
        >
          {product.stock === 0 ? (locale === 'en' ? 'Out of stock' : 'Tạm hết hàng') : <>{t('shopNow')} <ArrowRight size={16} /></>}
        </Link>
      </div>
      {quickViewOpen && <ProductQuickView product={product} onClose={() => setQuickViewOpen(false)} />}
    </article>
  );
}