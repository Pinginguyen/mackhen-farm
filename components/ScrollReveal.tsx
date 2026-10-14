'use client';

import { useEffect } from 'react';

type RevealGroup = {
  selector: string;
  stagger?: boolean;
  highlight?: boolean;
};

export default function ScrollReveal({ groups }: { groups: RevealGroup[] }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const observedElements: HTMLElement[] = [];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        element.dataset.scrollReveal = 'visible';
        observer.unobserve(element);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

    groups.forEach(({ selector, stagger, highlight }) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        element.dataset.scrollReveal = 'pending';
        if (highlight) element.dataset.highlightOnReveal = 'true';
        if (stagger) element.style.setProperty('--scroll-reveal-delay', `${index * 100}ms`);
        observedElements.push(element);
        observer.observe(element);
      });
    });

    return () => {
      observer.disconnect();
      observedElements.forEach((element) => {
        delete element.dataset.scrollReveal;
        delete element.dataset.highlightOnReveal;
        element.style.removeProperty('--scroll-reveal-delay');
      });
    };
  }, [groups]);

  return null;
}