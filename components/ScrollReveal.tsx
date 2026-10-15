'use client';

import { useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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

export function ScrollRevealItem({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : delay }}
    >
      {children}
    </motion.li>
  );
}