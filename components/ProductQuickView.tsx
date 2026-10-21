'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { X } from 'lucide-react';

import AddToCart from '@/app/products/[slug]/add-to-cart';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function ProductQuickView({ product, onClose }: { product: CatalogProduct; onClose: () => void }) {
  const { formatCurrency, translateProductName } = useLocaleCurrency();
  const productName = translateProductName(product.name);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  const image = product.image;
  const isUnoptimized = image.startsWith('data:') || /^https?:\/\//i.test(image);

  return createPortal(
    <div className="quick-view-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="quick-view-modal" role="dialog" aria-modal="true" aria-labelledby="quick-view-title">
        <button className="quick-view-close" type="button" onClick={onClose} aria-label="Đóng xem nhanh"><X size={20} /></button>
        <div className="quick-view-layout">
          <div className="quick-view-image">
            <Image src={image} alt={productName} width={900} height={900} sizes="(max-width: 768px) 100vw, 50vw" unoptimized={isUnoptimized} />
          </div>
          <div className="quick-view-content">
            <p className="eyebrow">{product.category}</p>
            <h2 id="quick-view-title">{productName}</h2>
            <p className="quick-view-highlight">{product.highlight}</p>
            <p className="quick-view-price">{formatCurrency(product.price)}{product.originalPrice != null && <del>{formatCurrency(product.originalPrice)}</del>}</p>
            <p className="quick-view-description">{product.description}</p>
            <AddToCart productId={product.id} productSlug={product.slug} name={product.name} image={image} price={product.price} variants={[]} />
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}