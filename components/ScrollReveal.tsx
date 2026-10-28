'use client';

import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';

type RevealGroup = {
  selector: string;
  stagger?: boolean;
  highlight?: boolean;
};

export default function ScrollReveal({ groups }: { groups: RevealGroup[] }) {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const observedElements: HTMLElement[] = [];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        element.dataset.scrollReveal = entry.isIntersecting ? 'visible' : 'pending';
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
  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.li>
  );
}