'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import ProductRating from '@/components/ProductRating';

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
  image: string;
  images?: string[];
  highlight: string;
};

export default function ProductCatalogFilter({ products, initialQuery = '' }: { products: CatalogProduct[]; initialQuery?: string }) {
  const [filter, setFilter] = useState<'ALL' | 'PLANT' | 'SPICE'>('ALL');
  const [priceFilter, setPriceFilter] = useState<'ALL' | 'UNDER_50' | '50_100' | 'OVER_150'>('ALL');
  const [proteinOnly, setProteinOnly] = useState(false);
  const [query, setQuery] = useState(initialQuery);
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
    { id: 'ALL' as const, label: `Tất cả sản phẩm (${products.length})` },
    { id: 'PLANT' as const, label: `Khô bò thực vật High-Protein (${plantProducts.length})` },
    { id: 'SPICE' as const, label: `Gia vị & Chẳm chéo Tây Bắc (${spiceProducts.length})` },
  ];

  return (
    <>
      <div className="catalog-filter-tabs" role="tablist" aria-label="Lọc danh mục sản phẩm">
        {tabs.map((tab) => <button type="button" key={tab.id} role="tab" aria-selected={filter === tab.id} className={filter === tab.id ? 'is-active' : ''} onClick={() => setFilter(tab.id)}>{tab.label}</button>)}
      </div>
      <div className="catalog-facet-filters">
        <label className="field">Mức giá<select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value as typeof priceFilter)}><option value="ALL">Tất cả</option><option value="UNDER_50">Dưới 50k</option><option value="50_100">50k - 100k</option><option value="OVER_150">Combo trên 150k</option></select></label>
        <label className="catalog-protein-toggle"><input type="checkbox" checked={proteinOnly} onChange={(event) => setProteinOnly(event.target.checked)} />Giàu đạm (&gt;20g Protein)</label>
        <label className="catalog-search-field"><span className="visually-hidden">Tìm trong danh mục</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm sản phẩm trong danh mục" /></label>
        <span className="catalog-filter-count">{visibleProducts.length} sản phẩm</span>
      </div>
      <div className="product-grid catalog-products" key={`${filter}-${priceFilter}-${proteinOnly}-${normalizedQuery}`}>
        {visibleProducts.map((product, index) => (
          <article key={product.id} className={`product-card${product.stock === 0 ? ' is-out-of-stock' : ''}`} style={{ animationDelay: `${index * 35}ms` }}>
            <div className="image-box">
              <img src={product.image} alt={product.name} />
              <div className="product-badges">
                {product.stock === 0 && <span className="product-badge out-of-stock-badge">Tạm hết hàng</span>}
                {product.protein != null && <span className="product-badge nutrition-badge">{product.protein} Protein</span>}
                <span className="product-badge">{product.highlight}</span>
              </div>
            </div>
            <div className="card-body">
              <div className="product-card-header">
                <div className="meta-row"><span>{product.category} • {product.unit ?? 'Khối lượng chưa cập nhật'}</span></div>
                <ProductRating rating={product.rating} showValue={false} size="sm" />
              </div>
              <h4 className="product-name"><Link href={`/products/${product.slug}`}>{product.name}</Link></h4>
              <p className="product-card-description text-xs text-stone-500 line-clamp-2 leading-relaxed">{product.description}</p>
              <div className="product-card-pricing">
                <div className="product-prices"><strong>{product.price.toLocaleString('vi-VN')}đ</strong>{product.originalPrice != null && <del>{product.originalPrice.toLocaleString('vi-VN')}đ</del>}</div>
              </div>
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
          </article>
        ))}
        {!visibleProducts.length && <p className="empty-state">Danh mục hiện chưa có sản phẩm.</p>}
      </div>
    </>
  );
}