'use client';

import { useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateProductName } from '@/lib/translations';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { products: CatalogProduct[] };

export default function ProductCylinder3D({ products }: Props) {
  const { locale, currency, formatCurrency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLElement>(null);
  const count = products.length;

  useGSAP(() => {
    if (!containerRef.current || count === 0) return;

    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: '+=2000',
      pin: true,
      scrub: 0.8,
      onUpdate: (self) => {
        const nextIndex = Math.min(Math.floor(self.progress * count), count - 1);
        setActiveIndex((current) => current === nextIndex ? current : nextIndex);
      },
    });
  }, { scope: containerRef, dependencies: [count], revertOnUpdate: true });

  if (!products.length) return null;

  const currentIndex = activeIndex % count;

  function getOffset(index: number) {
    let offset = (index - currentIndex) % count;
    if (offset > count / 2) offset -= count;
    if (offset < -count / 2) offset += count;
    return offset;
  }

  function moveToProduct(direction: -1 | 1) {
    setActiveIndex((index) => (index + direction + count) % count);
  }

  function activateCard(event: MouseEvent<HTMLElement>, index: number) {
    if (index === currentIndex) return;
    event.preventDefault();
    setActiveIndex(index);
  }

  return (
    <section ref={containerRef} className="home-cylinder-section" aria-labelledby="product-cylinder-title">
      <div className="home-cylinder-heading">
        <p className="home-cylinder-kicker">MẮC KHÉN FARM</p>
        <h2 id="product-cylinder-title">{isEN ? '360° NORTHWEST PRODUCT SHOWCASE' : 'TRIỂN LÃM NÔNG SẢN TÂY BẮC 360°'}</h2>
      </div>

      <div className="product-cylinder-stage" role="region" aria-roledescription="carousel" aria-label={isEN ? 'Northwest products' : 'Sản phẩm Tây Bắc'}>
        <div className="product-cylinder-track">
          {products.map((product, index) => {
            const offset = getOffset(index);
            const distance = Math.abs(offset);
            const isFront = offset === 0;
            const isVisible = distance <= 2;
            const productName = translateProductName(product.name, isEN ? 'en' : 'vi');
            let transform = `translateX(${offset * 180}px) translateZ(-180px) rotateY(${-offset * 35}deg) scale(0.5)`;
            let opacity = 0;
            let zIndex = 0;
            let filter = 'brightness(50%)';

            if (isFront) {
              transform = 'translate3d(0px, 0px, 0px) rotateY(0deg) scale(1.08)';
              opacity = 1;
              zIndex = 30;
              filter = 'brightness(100%)';
            } else if (distance === 1) {
              transform = `translateX(${offset * 220}px) translateZ(0px) rotateY(${-offset * 25}deg) scale(0.85)`;
              opacity = 0.75;
              zIndex = 20;
              filter = 'brightness(85%)';
            } else if (distance === 2) {
              transform = `translateX(${offset * 180}px) translateZ(-100px) rotateY(${-offset * 35}deg) scale(0.68)`;
              opacity = 0.4;
              zIndex = 10;
              filter = 'brightness(60%)';
            }

            const cardStyle = { transform, opacity, zIndex, filter, pointerEvents: isVisible ? 'auto' : 'none' } as CSSProperties;

            return (
              <article
                className={`product-cylinder-card${isFront ? ' is-front' : ''}${isVisible && !isFront ? ' is-side-card' : ''}`}
                key={product.id}
                aria-hidden={!isVisible}
                style={cardStyle}
                onClick={(event) => activateCard(event, index)}
              >
                <Link className="product-cylinder-image-link" href={`/products/${product.slug}`} tabIndex={isVisible ? 0 : -1} aria-label={`${isEN ? 'View' : 'Xem'} ${productName}`} onClick={(event) => activateCard(event, index)}>
                  <img src={product.image} alt={productName} loading={index < 3 ? 'eager' : 'lazy'} decoding="async" />
                </Link>
                <div className="product-cylinder-copy">
                  <span className="product-cylinder-category">{isEN ? 'NORTHWEST SPECIALTY' : 'ĐẶC SẢN TÂY BẮC'}</span>
                  <h3>{productName}</h3>
                  <strong>{formatCurrency(product.price)}</strong>
                  {isFront && <Link className="product-cylinder-link" href={`/products/${product.slug}`}>
                    {isEN ? 'View details / Shop now' : 'Xem chi tiết / Chọn mua'} <span aria-hidden="true">↗</span>
                  </Link>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="product-cylinder-controls">
        <button className="product-cylinder-arrow" type="button" aria-label={isEN ? 'Previous product' : 'Sản phẩm trước'} onClick={() => moveToProduct(-1)}>
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <div className="product-cylinder-counter" aria-live="polite">
          {String(currentIndex + 1).padStart(2, '0')} <span>/</span> {String(count).padStart(2, '0')}
        </div>
        <button className="product-cylinder-arrow" type="button" aria-label={isEN ? 'Next product' : 'Sản phẩm tiếp theo'} onClick={() => moveToProduct(1)}>
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}