'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import type { CatalogProduct } from '@/components/ProductCatalogFilter';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger, useGSAP);

const featuredSlugs = [
  'mac-khen-xe-soi-cay-nong',
  'mac-khen-mieng-deo-tieu-rung',
  'mac-khen-chay-toi-gion-cay',
  'hat-mac-khen-rung-sao-kho-son-la',
];

export default function HorizontalShowcase({ products }: { products: CatalogProduct[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLParagraphElement>(null);
  const { locale, formatCurrency, translateProductName } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);
  const featuredProducts = [
    ...featuredSlugs.map((slug) => products.find((product) => product.slug === slug)).filter((product): product is CatalogProduct => Boolean(product)),
    ...products.filter((product) => !featuredSlugs.includes(product.slug)),
  ].slice(0, 4);

  useGSAP(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    const parallax = parallaxRef.current;
    if (!section || !pin || !track || !parallax) return;

    const getDistance = () => Math.max(0, track.scrollWidth - pin.clientWidth);
    if (!getDistance()) return;

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        pin,
        start: 'top top',
        end: () => `+=${getDistance()}`,
        scrub: 0.8,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    timeline.to(track, { x: () => -getDistance(), ease: 'none' }, 0);
    timeline.to(parallax, { x: () => -getDistance() * 0.24, ease: 'none' }, 0);
  }, { scope: sectionRef, dependencies: [featuredProducts.length], revertOnUpdate: true });

  if (!featuredProducts.length) return null;

  return (
    <section ref={sectionRef} className="horizontal-showcase" aria-labelledby="horizontal-showcase-title">
      <div ref={pinRef} className="horizontal-showcase-pin">
        <div className="horizontal-showcase-heading">
          <div>
            <p className="eyebrow">{text('HƯƠNG VỊ TÂY BẮC')}</p>
            <h2 id="horizontal-showcase-title">{text('Bốn nét vị, một miền hương')}</h2>
          </div>
          <span>{text('Kéo xuống để khám phá')}</span>
        </div>
        <p ref={parallaxRef} className="horizontal-showcase-parallax" aria-hidden="true">{locale === 'en' ? 'MAC KHEN · NORTHWEST · UPCYCLED' : 'MẮC KHÉN · TÂY BẮC · UPCYCLED'}</p>
        <div className="horizontal-showcase-window">
          <div ref={trackRef} className="horizontal-showcase-track">
            {featuredProducts.map((product, index) => (
              <article className="horizontal-showcase-card" key={product.id}>
                <Link href={`/products/${product.slug}`} className="horizontal-showcase-image-link" aria-label={translateProductName(product.name)}>
                  <img src={product.image} alt={translateProductName(product.name)} loading={index === 0 ? 'eager' : 'lazy'} />
                </Link>
                <div className="horizontal-showcase-card-copy">
                  <span>{String(index + 1).padStart(2, '0')} / 04</span>
                  <div>
                    <h3>{translateProductName(product.name)}</h3>
                    <p>{text(product.highlight)}</p>
                  </div>
                  <strong>{formatCurrency(product.price)}</strong>
                  <Link href={`/products/${product.slug}`} aria-label={`${text('Xem sản phẩm')} ${translateProductName(product.name)}`}><ArrowUpRight size={19} /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}