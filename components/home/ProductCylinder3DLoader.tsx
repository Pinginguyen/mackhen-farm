'use client';

import dynamic from 'next/dynamic';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';

const ProductCylinder3D = dynamic(() => import('./ProductCylinder3D'), {
  ssr: false,
  loading: () => <div className="product-cylinder-skeleton" aria-hidden="true"><span /></div>,
});

export default function ProductCylinder3DLoader({ products }: { products: CatalogProduct[] }) {
  return <ProductCylinder3D products={products} />;
}