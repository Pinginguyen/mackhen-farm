'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const progressRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const progressBar = progressRef.current;
    const progressFill = progressFillRef.current;
    if (!progressBar || !progressFill) return;

    const updateProgress = (progress: number) => {
      const normalizedProgress = Math.min(1, Math.max(0, progress));
      const percent = Math.round(normalizedProgress * 100);
      progressFill.style.transform = `scaleX(${normalizedProgress})`;
      progressBar.setAttribute('aria-valuenow', String(percent));
      progressBar.setAttribute('aria-valuetext', `${percent}%`);
    };

    let frameId = 0;
    let lenis: Lenis | null = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const updateNativeProgress = () => {
        const scrollLimit = document.documentElement.scrollHeight - window.innerHeight;
        updateProgress(scrollLimit > 0 ? window.scrollY / scrollLimit : 0);
      };

      updateNativeProgress();
      window.addEventListener('scroll', updateNativeProgress, { passive: true });
      window.addEventListener('resize', updateNativeProgress, { passive: true });

      return () => {
        window.removeEventListener('scroll', updateNativeProgress);
        window.removeEventListener('resize', updateNativeProgress);
      };
    }

    lenis = new Lenis({
      lerp: 0.12,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
      anchors: true,
      respectReducedMotion: true,
    });

    const unsubscribe = lenis.on('scroll', (instance) => updateProgress(instance.progress));
    const handleResize = () => {
      lenis?.resize();
      if (lenis) updateProgress(lenis.progress);
    };

    const raf = (time: number) => {
      lenis?.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    updateProgress(lenis.progress);
    frameId = window.requestAnimationFrame(raf);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      unsubscribe();
      lenis?.destroy();
    };
  }, []);

  return (
    <>
      <div ref={progressRef} className="scroll-progress" role="progressbar" aria-label="Tiến trình cuộn trang" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
        <span ref={progressFillRef} />
      </div>
      {children}
    </>
  );
}