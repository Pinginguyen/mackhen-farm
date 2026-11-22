'use client';
import { useEffect } from 'react';

export default function SmoothScroll() {
  useEffect(() => {
    let disposed = false;
    let cleanup = () => undefined;

    void Promise.all([
      import('lenis'),
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([lenisModule, gsapModule, scrollTriggerModule]) => {
      if (disposed) return;

      const Lenis = lenisModule.default;
      const gsap = gsapModule.default;
      const { ScrollTrigger } = scrollTriggerModule;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      const updateScrollTrigger = () => ScrollTrigger.update();
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on('scroll', updateScrollTrigger);
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.add(tick);
      ScrollTrigger.refresh();

      cleanup = () => {
        lenis.off('scroll', updateScrollTrigger);
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    }).catch((error: unknown) => {
      if (!disposed) console.warn('Smooth scrolling could not be initialized.', error);
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return null;
}