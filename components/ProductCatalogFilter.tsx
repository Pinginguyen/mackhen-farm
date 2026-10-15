'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';

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
  highlights?: string[];
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
          <ProductCard key={product.id} product={product} index={index} />
        ))}
        {!visibleProducts.length && <p className="empty-state">Danh mục hiện chưa có sản phẩm.</p>}
      </div>
    </>
  );
}