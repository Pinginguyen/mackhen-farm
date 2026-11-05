'use client';

import { useEffect, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

export default function ProductImageGallery({ image, images, name }: { image: string; images: string[]; name: string }) {
  const galleryImages = [image, ...images.filter((item) => item !== image)];
  const [activeImage, setActiveImage] = useState(image);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [lens, setLens] = useState<{ x: number; y: number; xPercent: number; yPercent: number } | null>(null);

  function moveLens(event: React.MouseEvent<HTMLButtonElement>) {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    setLens({ x, y, xPercent: x / bounds.width * 100, yPercent: y / bounds.height * 100 });
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
      <button className="detail-media group !overflow-hidden !rounded-3xl !border !border-white/70 !bg-white/35 !shadow-[0_25px_60px_-15px_rgba(132,30,30,0.18)] !backdrop-blur-md" type="button" onClick={() => setZoomOpen(true)} onMouseMove={moveLens} onMouseLeave={() => setLens(null)} aria-label={`Phóng to ảnh ${name}`}>
        <img className="!rounded-3xl" src={activeImage} alt={name} />
        <span className={`product-optical-lens${lens ? ' is-visible' : ''}`} aria-hidden="true" style={lens ? { left: lens.x, top: lens.y, backgroundImage: `url("${activeImage}")`, backgroundPosition: `${lens.xPercent}% ${lens.yPercent}%` } : undefined} />
        <span className="detail-zoom-button !bottom-4 !right-4 !h-12 !w-12 !border-white/60 !bg-[#142820]/70 !shadow-lg !backdrop-blur-md transition-all duration-300 group-hover:!scale-105 group-hover:!bg-[#841E1E]" aria-hidden="true"><Maximize2 size={19} /></span>
      </button>
      {galleryImages.length > 1 && galleryImages.map((galleryImage, index) => (
        <button
          className={`detail-gallery-thumb${activeImage === galleryImage ? ' is-active' : ''}`}
          key={`${galleryImage}-${index}`}
          type="button"
          onClick={() => setActiveImage(galleryImage)}
          aria-label={`Xem ảnh ${index + 1} của ${name}`}
          aria-pressed={activeImage === galleryImage}
        >
          <img src={galleryImage} alt="" />
        </button>
      ))}
      {zoomOpen && (
        <div className="product-image-lightbox" role="dialog" aria-modal="true" aria-label={`Ảnh sản phẩm ${name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setZoomOpen(false); }}>
          <button className="product-image-lightbox-close" type="button" onClick={() => setZoomOpen(false)} aria-label="Đóng ảnh phóng to"><X size={22} /></button>
          <img src={activeImage} alt={name} />
        </div>
      )}
    </div>
  );
}