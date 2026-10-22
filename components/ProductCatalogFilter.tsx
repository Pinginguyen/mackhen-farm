'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import ProductRating from '@/components/ProductRating';
import type { NutritionFacts } from '@/lib/store-data';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number | null;
  unit: string | null;
  protein: string | null;
  rating: number;
  stock: number;
  description: string;
  ingredients?: string | null;
  image: string;
  images?: string[];
  highlight: string;
  badge?: string | null;
  nutritionFacts?: NutritionFacts | null;
};

export default function ProductCatalogFilter({ products, initialQuery = '' }: { products: CatalogProduct[]; initialQuery?: string }) {
  const [filter, setFilter] = useState<'ALL' | 'PLANT' | 'SPICE'>('ALL');
  const [priceFilter, setPriceFilter] = useState<'ALL' | 'UNDER_50' | '50_100' | 'OVER_150'>('ALL');
  const [proteinOnly, setProteinOnly] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const { locale, formatCurrency, translateProductName, t } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  const plantProducts = products.filter((product) => product.category !== 'Gia vị Tây Bắc');
  const spiceProducts = products.filter((product) => product.category === 'Gia vị Tây Bắc');
  const categoryProducts = filter === 'PLANT' ? plantProducts : filter === 'SPICE' ? spiceProducts : products;
  const normalizedQuery = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi');
  const visibleProducts = categoryProducts.filter((product) => {
    const productSearchText = `${product.name} ${product.category} ${product.description}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi');
    const matchesSearch = !normalizedQuery || productSearchText.includes(normalizedQuery);
    const matchesPrice = priceFilter === 'ALL'
      || (priceFilter === 'UNDER_50' && product.price < 50000)
      || (priceFilter === '50_100' && product.price >= 50000 && product.price <= 100000)
      || (priceFilter === 'OVER_150' && product.price > 150000);
    const proteinGrams = Number(product.protein?.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
    return matchesSearch && matchesPrice && (!proteinOnly || proteinGrams > 20);
  });
  const tabs = [
    { id: 'ALL' as const, label: `${text('Tất cả sản phẩm')} (${products.length})` },
    { id: 'PLANT' as const, label: `${text('Khô bò thực vật High-Protein')} (${plantProducts.length})` },
    { id: 'SPICE' as const, label: `${text('Gia vị & Chẳm chéo Tây Bắc')} (${spiceProducts.length})` },
  ];

  return (
    <>
      <div className="catalog-filter-tabs" role="tablist" aria-label={text('Lọc danh mục sản phẩm')}>
        {tabs.map((tab) => <button type="button" key={tab.id} role="tab" aria-selected={filter === tab.id} className={filter === tab.id ? 'is-active' : ''} onClick={() => setFilter(tab.id)}>{tab.label}</button>)}
      </div>
      <div className="catalog-facet-filters">
        <label className="field">{text('Mức giá')}<select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value as typeof priceFilter)}><option value="ALL">{text('Tất cả')}</option><option value="UNDER_50">{text('Dưới 50k')}</option><option value="50_100">{text('50k - 100k')}</option><option value="OVER_150">{text('Combo trên 150k')}</option></select></label>
        <label className="catalog-protein-toggle"><input type="checkbox" checked={proteinOnly} onChange={(event) => setProteinOnly(event.target.checked)} />{text('Giàu đạm (>20g Protein)')}</label>
        <label className="catalog-search-field"><span className="visually-hidden">{text('Tìm trong danh mục')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text('Tìm sản phẩm trong danh mục')} /></label>
        <span className="catalog-filter-count">{visibleProducts.length} {text('sản phẩm')}</span>
      </div>
      <div className="product-grid catalog-products" key={`${filter}-${priceFilter}-${proteinOnly}-${normalizedQuery}`}>
        {visibleProducts.map((product, index) => (
          <article key={product.id} className={`product-card !rounded-2xl !border !border-stone-200/60 !bg-white !shadow-xs transition-all duration-300 hover:!shadow-md hover:!-translate-y-1${product.stock === 0 ? ' is-out-of-stock' : ''}`} style={{ animationDelay: `${index * 35}ms` }}>
            <div className="image-box group !overflow-hidden !rounded-xl">
              <img className="transition-transform duration-500 group-hover:!scale-105" src={product.image} alt={translateProductName(product.name)} />
              <div className="product-badges">
                {product.stock === 0 && <span className="product-badge out-of-stock-badge !min-h-0 !px-2.5 !py-0.5 !rounded-full !border !border-stone-200/70 !text-[11px] !font-semibold !tracking-wide">{text('Tạm hết hàng')}</span>}
                {product.protein != null && <span className="product-badge nutrition-badge !min-h-0 !px-2.5 !py-0.5 !rounded-full !border !border-stone-200/70 !text-[11px] !font-semibold !tracking-wide">{text(product.protein)} Protein</span>}
                {product.badge?.trim() && <span className="product-highlight-badge !px-2.5 !py-0.5 !rounded-full !border !border-stone-200/70 !text-[11px] !font-semibold !tracking-wide">{text(product.badge)}</span>}
                <span className="product-badge !min-h-0 !px-2.5 !py-0.5 !rounded-full !border !border-stone-200/70 !text-[11px] !font-semibold !tracking-wide">{text(product.highlight)}</span>
              </div>
            </div>
            <div className="card-body">
              <div className="product-card-header">
                <div className="meta-row"><span>{text(product.category)} • {text(product.unit ?? 'Khối lượng chưa cập nhật')}</span></div>
                <ProductRating rating={product.rating} showValue={false} size="sm" />
              </div>
              <h4 className="product-name"><Link href={`/products/${product.slug}`}>{translateProductName(product.name)}</Link></h4>
              <p className="product-card-description text-xs text-stone-500 line-clamp-2 leading-relaxed">{text(product.description)}</p>
              <div className="product-card-pricing">
                <div className="product-prices"><strong className="!text-[#9B2424]">{formatCurrency(product.price)}</strong>{product.originalPrice != null && <del className="!text-stone-400">{formatCurrency(product.originalPrice)}</del>}</div>
              </div>
              <Link
                href={`/products/${product.slug}`}
                aria-disabled={product.stock === 0}
                tabIndex={product.stock === 0 ? -1 : undefined}
                onClick={(event) => { if (product.stock === 0) event.preventDefault(); }}
                className={`product-card-action !rounded-xl !bg-[#9B2424] !text-white !shadow-xs transition-all duration-300 hover:!bg-[#831D1D] hover:!shadow-sm${product.stock === 0 ? ' is-out-of-stock' : ''}`}
              >
                {product.stock === 0 ? text('Tạm hết hàng') : <>{t('shopNow')} <ArrowRight size={16} /></>}
              </Link>
            </div>
          </article>
        ))}
        {!visibleProducts.length && <p className="empty-state">{text('Danh mục hiện chưa có sản phẩm.')}</p>}
      </div>
    </>
  );
}