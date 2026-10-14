'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
  highlight: string;
};

export default function ProductCatalogFilter({ products }: { products: CatalogProduct[] }) {
  const [filter, setFilter] = useState<'ALL' | 'PLANT' | 'SPICE'>('ALL');
  const plantProducts = products.filter((product) => product.category !== 'Gia vị Tây Bắc');
  const spiceProducts = products.filter((product) => product.category === 'Gia vị Tây Bắc');
  const visibleProducts = filter === 'PLANT' ? plantProducts : filter === 'SPICE' ? spiceProducts : products;
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
      <div className="product-grid catalog-products" key={filter}>
        {visibleProducts.map((product, index) => (
          <article key={product.id} className="product-card" style={{ animationDelay: `${index * 35}ms` }}>
            <div className="image-box">
              <img src={product.image} alt={product.name} />
              <div className="product-badges">
                {product.protein != null && <span className="product-badge nutrition-badge">{product.protein} Protein</span>}
                <span className="product-badge">{product.highlight}</span>
              </div>
            </div>
            <div className="card-body">
              <div className="meta-row"><span>{product.category}</span><span>{product.unit ?? 'Khối lượng chưa cập nhật'}</span></div>
              <h4 className="product-name"><Link href={`/products/${product.slug}`}>{product.name}</Link></h4>
              <p>{product.description}</p>
              <div className="card-footer">
                <div className="product-prices"><strong>{product.price.toLocaleString('vi-VN')}đ</strong>{product.originalPrice != null && <del>{product.originalPrice.toLocaleString('vi-VN')}đ</del>}</div>
                <span>{product.stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}</span>
              </div>
              <Link href={`/products/${product.slug}`} className="product-card-action">Chọn mua <ArrowRight size={16} /></Link>
            </div>
          </article>
        ))}
        {!visibleProducts.length && <p className="empty-state">Danh mục hiện chưa có sản phẩm.</p>}
      </div>
    </>
  );
}