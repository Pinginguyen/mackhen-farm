'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import Lenis from 'lenis';

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const progressRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const reducedMotion = useReducedMotion();
  const progressScale = reducedMotion ? scrollYProgress : springProgress;

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
    progressRef.current?.setAttribute('aria-valuenow', String(percent));
    progressRef.current?.setAttribute('aria-valuetext', `${percent}%`);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frameId = 0;
    let lenis: Lenis | null = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    lenis = new Lenis({
      duration: 1.2,
      easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.5,
      wheelMultiplier: 1,
      infinite: false,
      anchors: true,
      respectReducedMotion: true,
    });

    const handleResize = () => {
      lenis?.resize();
    };

    const raf = (time: number) => {
      lenis?.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    frameId = window.requestAnimationFrame(raf);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      lenis?.destroy();
    };
  }, []);

  return (
    <>
      <motion.div ref={progressRef} className="scroll-progress" style={{ scaleX: progressScale }} role="progressbar" aria-label="Tiến trình cuộn trang" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} />
      {children}
    </>
  );
}