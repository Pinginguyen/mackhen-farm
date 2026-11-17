'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const Hero3DCanvas = dynamic(() => import('./Hero3DCanvas'), {
  ssr: false,
  loading: () => <div className="hero3d-skeleton" aria-hidden="true" />,
});

export default function Hero3DCanvasLoader() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);

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
    }, { rootMargin: '120px' });
    observer.observe(shellRef.current);
    return () => observer.disconnect();
  }, [mobile]);

  return <div ref={shellRef} className="hero3d-loader-shell">
    {mobile
      ? <Image className="hero3d-mobile-image" src="/products/xe-soi.jpg" alt="Khô mắc khén xé sợi cay nồng" fill sizes="100vw" quality={60} />
      : nearViewport ? <Hero3DCanvas /> : <div className="hero3d-skeleton" aria-hidden="true" />}
  </div>;
}