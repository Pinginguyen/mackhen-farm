'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateProductName } from '@/lib/translations';

const ProductCylinder3D = dynamic(() => import('./ProductCylinder3D'), {
  ssr: false,
  loading: () => <div className="product-cylinder-skeleton" aria-hidden="true"><span /></div>,
});

export default function ProductCylinder3DLoader({ products }: { products: CatalogProduct[] }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const { currency, formatCurrency } = useLocaleCurrency();
  const isEN = currency !== 'VND';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateDevice = () => setMobile(mediaQuery.matches);
    updateDevice();
    mediaQuery.addEventListener('change', updateDevice);
    return () => mediaQuery.removeEventListener('change', updateDevice);
  }, []);

  useEffect(() => {
    if (mobile || !shellRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(shellRef.current);
    return () => observer.disconnect();
  }, [mobile]);

  if (mobile) return <section className="home-cylinder-mobile" aria-labelledby="product-cylinder-mobile-title">
    <p className="home-cylinder-kicker">MẮC KHÉN FARM</p>
    <h2 id="product-cylinder-mobile-title">{isEN ? 'NORTHWEST SPECIALTIES' : 'ĐẶC SẢN TÂY BẮC'}</h2>
    <div className="home-cylinder-mobile-grid">{products.slice(0, 4).map((product) => <Link className="home-cylinder-mobile-item" href={`/products/${product.slug}`} key={product.id}>
      <Image src={product.image} alt={translateProductName(product.name, isEN ? 'en' : 'vi')} width={640} height={480} sizes="(max-width: 640px) 50vw, 25vw" loading="lazy" />
      <strong>{translateProductName(product.name, isEN ? 'en' : 'vi')}</strong>
      <span>{formatCurrency(product.price)}</span>
    </Link>)}</div>
  </section>;

  return <div ref={shellRef} className="product-cylinder-loader-shell">
    {nearViewport ? <ProductCylinder3D products={products} /> : <div className="product-cylinder-skeleton" aria-hidden="true"><span /></div>}
  </div>;
}