'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Eye, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

import ProductRating from '@/components/ProductRating';
import TasteSensoryMeter from '@/components/product/TasteSensoryMeter';
import ProductQuickView from '@/components/ProductQuickView';
import { recordCroEvent } from '@/components/CroEventTracker';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function ProductCard({ product, index }: { product: CatalogProduct; index: number }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickAdded, setQuickAdded] = useState(false);
  const { locale, formatCurrency, translateProductName, t } = useLocaleCurrency();
  const productName = translateProductName(product.name);
  const secondImage = product.images?.find((image) => image && image !== product.image);
  const imageIsUnoptimized = (image: string) => image.startsWith('data:') || /^https?:\/\//i.test(image);
  const proteinGrams = Number(product.protein?.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
  const proteinAmount = product.protein?.match(/\d+(?:\.\d+)?/)?.[0];

  async function addQuickly() {
    if (quickAdding || product.stock < 1) return;
    setQuickAdding(true);
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.slug, quantity: 1 }),
      });
      const result = await response.json() as { error?: { message?: string }; cartCount?: number };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể thêm sản phẩm vào giỏ.');
      recordCroEvent('ADD_TO_CART', product.id);
      window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: result.cartCount } }));
      window.dispatchEvent(new Event('mackhen:cart-drawer-open'));
      setQuickAdded(true);
      toast.success(locale === 'en' ? 'Added to your cart.' : 'Đã thêm sản phẩm vào giỏ hàng.');
      window.setTimeout(() => setQuickAdded(false), 1600);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể kết nối để cập nhật giỏ hàng.');
    } finally {
      setQuickAdding(false);
    }
  }

  return (
    <article className={`product-card artisan-product-card group${product.stock === 0 ? ' is-out-of-stock' : ''}`} style={{ animationDelay: `${index * 35}ms` }}>
      <div className={`image-box product-card-media${secondImage ? ' has-secondary' : ''}`}>
        <Link className="product-card-image-link" href={`/products/${product.slug}`} aria-label={`${t('products')}: ${productName}`}>
          <Image className="product-card-image is-primary" src={product.image} alt={productName} width={800} height={600} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={index < 2} unoptimized={imageIsUnoptimized(product.image)} />
          {secondImage && <Image className="product-card-image is-secondary" src={secondImage} alt={`${productName}, alternate view`} width={800} height={600} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" unoptimized={imageIsUnoptimized(secondImage)} />}
        </Link>
        <div className="product-badges">
          {product.stock === 0 && <span className="product-badge out-of-stock-badge">Tạm hết hàng</span>}
          {product.badge?.trim() && <span className="product-highlight-badge">{product.badge}</span>}
        </div>
        {product.stock > 0 && <button className="product-card-quick-view" type="button" onClick={() => setQuickViewOpen(true)} aria-label={`${locale === 'en' ? 'Quick view' : 'Xem nhanh'} ${productName}`}><Eye size={16} />{locale === 'en' ? 'Quick view' : 'Xem nhanh'}</button>}
        <div className="artisan-stamp-row" aria-label={locale === 'en' ? 'Product provenance and qualities' : 'Nguồn gốc và đặc tính sản phẩm'}>
          {product.badgeText?.trim() && <span>{product.badgeText}</span>}
          {proteinGrams >= 20 && <span>💪 High-Protein</span>}
          <span>⛰ Sơn La</span>
        </div>
        <div className="artisan-quick-macros" aria-label={locale === 'en' ? 'Product highlights' : 'Điểm nổi bật sản phẩm'}>
          {proteinAmount && <span>{proteinAmount}g Protein</span>}
          {product.category !== 'Gia vị Tây Bắc' && <><span>Không Cholesterol</span><span>Upcycled Food</span></>}
        </div>
        {product.stock > 0 && <button className="artisan-quick-add" type="button" onClick={() => void addQuickly()} disabled={quickAdding}>
          <ShoppingBag size={15} aria-hidden="true" /> {quickAdded ? (locale === 'en' ? 'Added' : 'Đã thêm') : quickAdding ? (locale === 'en' ? 'Adding...' : 'Đang thêm...') : (locale === 'en' ? 'Quick add to cart' : 'Thêm nhanh vào giỏ')}
        </button>}
      </div>
      <div className="card-body">
        <div className="product-card-header">
          <div className="meta-row"><span>{product.category} • {product.unit ?? 'Khối lượng chưa cập nhật'}</span></div>
          <ProductRating rating={product.rating} showValue={false} size="sm" />
        </div>
        <h4 className="product-name"><Link href={`/products/${product.slug}`}>{productName}</Link></h4>
        <TasteSensoryMeter compact spiciness={product.spiciness} chewiness={product.chewiness} aroma={product.aroma} />
        <p className="product-card-description text-xs text-stone-500 line-clamp-2 leading-relaxed">{product.description}</p>
        <div className="product-card-pricing"><div className="product-prices"><strong>{formatCurrency(product.price)}</strong>{product.originalPrice != null && <del className="!text-stone-400">{formatCurrency(product.originalPrice)}</del>}</div></div>
        <Link
          href={`/products/${product.slug}`}
          aria-disabled={product.stock === 0}
          tabIndex={product.stock === 0 ? -1 : undefined}
          onClick={(event) => { if (product.stock === 0) event.preventDefault(); }}
          className={`product-card-action${product.stock === 0 ? ' is-out-of-stock' : ''}`}
        >
          {product.stock === 0 ? (locale === 'en' ? 'Out of stock' : 'Tạm hết hàng') : <>{t('shopNow')} <ArrowRight size={16} /></>}
        </Link>
      </div>
      {quickViewOpen && <ProductQuickView product={product} onClose={() => setQuickViewOpen(false)} />}
    </article>
  );
}