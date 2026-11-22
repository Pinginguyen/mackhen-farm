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
import FlashSaleCountdown, { useFlashSaleStatus } from '@/components/product/FlashSaleCountdown';
import { getEffectivePrice } from '@/lib/pricing';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function ProductCard({ product, index }: { product: CatalogProduct; index: number }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickAdded, setQuickAdded] = useState(false);
  const { locale, formatCurrency, translateProductName, t } = useLocaleCurrency();
  const productName = translateProductName(product.name);
  const hasSalePrice = product.originalPrice != null && product.originalPrice > product.price;
  const saleStatus = useFlashSaleStatus(hasSalePrice ? product.flashSaleEndsAt : null);
  const displayedPrice = getEffectivePrice(product);
  const displayedOriginalPrice = saleStatus.expired ? null : product.originalPrice;
  const secondImage = product.images?.find((image) => image && image !== product.image);
  const imageIsUnoptimized = (image: string) => image.startsWith('data:') || /^https?:\/\//i.test(image);
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
      window.setTimeout(() => setQuickAdded(false), 1600);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể kết nối để cập nhật giỏ hàng.');
    } finally {
      setQuickAdding(false);
    }
  }

  return (
    <article className={`product-card artisan-product-card group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md${product.stock === 0 ? ' is-out-of-stock' : ''}`} style={{ animationDelay: `${index * 35}ms` }}>
      <div className={`image-box product-card-media${secondImage ? ' has-secondary' : ''}`}>
        <Link className="product-card-image-link aspect-[16/10] w-full overflow-hidden bg-stone-100" href={`/products/${product.slug}`} aria-label={`${t('products')}: ${productName}`}>
          <Image className="product-card-image is-primary" src={product.image} alt={productName} width={800} height={600} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={index < 2} unoptimized={imageIsUnoptimized(product.image)} />
          {secondImage && <Image className="product-card-image is-secondary" src={secondImage} alt={`${productName}, alternate view`} width={800} height={600} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" unoptimized={imageIsUnoptimized(secondImage)} />}
        </Link>
        <div className="product-badges">
          {product.stock === 0 && <span className="product-badge out-of-stock-badge">Tạm hết hàng</span>}
          {product.badge?.trim() && !(saleStatus.expired && product.originalPrice != null) && <span className="product-highlight-badge">{product.badge}</span>}
        </div>
        {product.stock > 0 && <button className="product-card-quick-view" type="button" onClick={() => setQuickViewOpen(true)} aria-label={`${locale === 'en' ? 'Quick view' : 'Xem nhanh'} ${productName}`}><Eye size={16} />{locale === 'en' ? 'Quick view' : 'Xem nhanh'}</button>}
        {product.stock > 0 && <div className="product-card-hover-overlay">
          <div className="artisan-quick-macros" aria-label={locale === 'en' ? 'Product highlights' : 'Điểm nổi bật sản phẩm'}>
            {proteinAmount && <span>{proteinAmount}g Protein</span>}
            {product.category !== 'Gia vị Tây Bắc' && <><span>Không Cholesterol</span><span>Upcycled Food</span></>}
          </div>
          <button className="artisan-quick-add" type="button" onClick={() => void addQuickly()} disabled={quickAdding}>
            <ShoppingBag size={15} aria-hidden="true" /> {quickAdded ? (locale === 'en' ? 'Added' : 'Đã thêm') : quickAdding ? (locale === 'en' ? 'Adding...' : 'Đang thêm...') : (locale === 'en' ? 'Quick add to cart' : 'Thêm nhanh vào giỏ')}
          </button>
        </div>}
      </div>
      <div className="card-body">
        <div className="product-card-header">
          <div className="meta-row"><span>{product.category} • {product.unit ?? 'Khối lượng chưa cập nhật'}</span></div>
          <ProductRating rating={product.rating} showValue={false} size="sm" />
        </div>
        <h4 className="product-name h-[2.85rem] line-clamp-2 text-sm font-bold leading-snug text-stone-900 sm:text-base"><Link href={`/products/${product.slug}`}>{productName}</Link></h4>
        {product.stock > 0 && product.stock <= 5 && <p className="product-low-stock">🔥 {locale === 'en' ? `Only ${product.stock} left in stock` : `Chỉ còn lại ${product.stock} sản phẩm trong kho!`}</p>}
        <TasteSensoryMeter
          compact
          spiciness={product.spiciness}
          chewiness={product.chewiness}
          aroma={product.aroma}
          labelAxis1={product.labelAxis1}
          labelAxis2={product.labelAxis2}
          labelAxis3={product.labelAxis3}
          valueAxis1={product.valueAxis1}
          valueAxis2={product.valueAxis2}
          valueAxis3={product.valueAxis3}
        />
        <p className="product-card-description text-xs text-stone-500 line-clamp-2 leading-relaxed">{product.description}</p>
        <div className="product-card-purchase mt-auto flex flex-nowrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
        <div className="product-card-pricing min-w-0 flex-1"><div className="product-prices flex-nowrap gap-2 whitespace-nowrap"><strong>{formatCurrency(displayedPrice)}</strong>{displayedOriginalPrice != null && <del className="!text-stone-400">{formatCurrency(displayedOriginalPrice)}</del>}</div>{saleStatus.remainingSeconds != null && saleStatus.active && <FlashSaleCountdown seconds={saleStatus.remainingSeconds} locale={locale} />}</div>
        <Link
          href={`/products/${product.slug}`}
          aria-disabled={product.stock === 0}
          tabIndex={product.stock === 0 ? -1 : undefined}
          onClick={(event) => { if (product.stock === 0) event.preventDefault(); }}
          className={`product-card-action flex shrink-0 items-center gap-1 whitespace-nowrap${product.stock === 0 ? ' is-out-of-stock' : ''}`}
        >
          {product.stock === 0 ? (locale === 'en' ? 'Out of stock' : 'Tạm hết hàng') : <><span>{locale === 'en' ? 'Shop now' : 'Chọn mua'}</span><ArrowRight size={16} aria-hidden="true" /></>}
        </Link>
        </div>
      </div>
      {quickViewOpen && <ProductQuickView product={product} onClose={() => setQuickViewOpen(false)} />}
    </article>
  );
}