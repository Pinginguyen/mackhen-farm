'use client';

import dynamic from 'next/dynamic';

const Hero3DCanvas = dynamic(() => import('./Hero3DCanvas'), {
  ssr: false,
  loading: () => <div className="hero3d-skeleton" aria-hidden="true" />,
});

export default function Hero3DCanvasLoader() {
  return <Hero3DCanvas />;
}