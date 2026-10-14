'use client';

import dynamic from 'next/dynamic';

const Hero3DCanvas = dynamic(() => import('./Hero3DCanvas'), { ssr: false });

export default function Hero3DCanvasLoader() {
  return <Hero3DCanvas />;
}