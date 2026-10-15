'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef } from 'react';

type PointerPoint = { x: number; y: number };

function distanceBetween(first: PointerPoint, second: PointerPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export default function ProductImageGallery({ image, images, name }: { image: string; images: string[]; name: string }) {
  const galleryImages = [image, ...images.filter((item) => item !== image)];
  const [activeImage, setActiveImage] = useState(image);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const pointers = useRef(new Map<number, PointerPoint>());
  const pinchStart = useRef({ distance: 0, scale: 1 });
  const isUnoptimized = (source: string) => source.startsWith('data:') || /^https?:\/\//i.test(source);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinchStart.current = { distance: distanceBetween(first, second), scale: zoomScale };
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size < 2 || !pinchStart.current.distance) return;
    const [first, second] = [...pointers.current.values()];
    const nextScale = pinchStart.current.scale * distanceBetween(first, second) / pinchStart.current.distance;
    setZoomScale(Math.min(4, Math.max(1, nextScale)));
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current.distance = 0;
  }

  function changeImage(source: string) {
    setActiveImage(source);
    setZoomScale(1);
  }

  useEffect(() => {
    if (!zoomOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [zoomOpen]);

  return (
    <div className="detail-gallery">
      <button className="detail-media" type="button" onClick={() => { setZoomScale(1); setZoomOpen(true); }} aria-label={`Phóng to ảnh ${name}`}>
        <Image src={activeImage} alt={name} width={1200} height={1104} sizes="(max-width: 768px) 100vw, 55vw" unoptimized={isUnoptimized(activeImage)} />
        <span className="detail-zoom-button" aria-hidden="true"><Maximize2 size={18} /></span>
      </button>
      {galleryImages.length > 1 && galleryImages.map((galleryImage, index) => (
        <button
          className={`detail-gallery-thumb${activeImage === galleryImage ? ' is-active' : ''}`}
          key={`${galleryImage}-${index}`}
          type="button"
          onClick={() => changeImage(galleryImage)}
          aria-label={`Xem ảnh ${index + 1} của ${name}`}
          aria-pressed={activeImage === galleryImage}
        >
          <Image src={galleryImage} alt={`${name}, ảnh ${index + 1}`} width={220} height={220} sizes="(max-width: 768px) 20vw, 12vw" unoptimized={isUnoptimized(galleryImage)} />
        </button>
      ))}
      {zoomOpen && (
        <div className="product-image-lightbox" role="dialog" aria-modal="true" aria-label={`Ảnh sản phẩm ${name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setZoomOpen(false); }}>
          <button className="product-image-lightbox-close" type="button" onClick={() => setZoomOpen(false)} aria-label="Đóng ảnh phóng to"><X size={22} /></button>
          <div
            className="product-image-lightbox-stage"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            aria-label="Dùng hai ngón tay để phóng to hoặc thu nhỏ ảnh"
          >
            <Image src={activeImage} alt={name} width={1800} height={1656} sizes="100vw" unoptimized={isUnoptimized(activeImage)} draggable={false} style={{ transform: `scale(${zoomScale})` }} />
          </div>
          <div className="product-image-lightbox-controls" aria-label="Điều khiển phóng to ảnh">
            <button type="button" onClick={() => setZoomScale((scale) => Math.max(1, scale - 0.5))} disabled={zoomScale <= 1} aria-label="Thu nhỏ ảnh"><ZoomOut size={19} /></button>
            <span>{Math.round(zoomScale * 100)}%</span>
            <button type="button" onClick={() => setZoomScale((scale) => Math.min(4, scale + 0.5))} disabled={zoomScale >= 4} aria-label="Phóng to ảnh"><ZoomIn size={19} /></button>
            <button type="button" onClick={() => setZoomScale(1)} disabled={zoomScale === 1} aria-label="Đặt lại kích thước ảnh"><RotateCcw size={17} /></button>
          </div>
        </div>
      )}
    </div>
  );
}