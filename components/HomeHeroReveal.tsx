'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function HomeHeroReveal() {
  useGSAP(() => {
    gsap.registerPlugin(useGSAP);

    const hero = document.querySelector<HTMLElement>('.home-page .hero');
    if (!hero) return;

    const content = gsap.utils.toArray<HTMLElement>(
      '.hero-copy .hero-badges > *, .hero-copy > h1, .hero-copy > p, .hero-actions > *',
      hero,
    );
    const heroImage = hero.querySelector<HTMLElement>('.hero-media .photo-card');
    const reveal = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top 80%',
        toggleActions: 'play reverse play reverse',
      },
    });

    if (content.length) {
      reveal.fromTo(content,
        { y: 40, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.15, ease: 'power4.out', clearProps: 'opacity,transform' },
      );
    }

    if (heroImage) {
      reveal.fromTo(heroImage,
        { scale: 0.92, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 1.2, ease: 'power3.out', clearProps: 'opacity,transform' },
        0,
      );
    }
  }, []);

  return null;
}