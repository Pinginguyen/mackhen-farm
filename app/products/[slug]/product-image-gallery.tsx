'use client';

import { useEffect, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

export default function ProductImageGallery({ image, images, name }: { image: string; images: string[]; name: string }) {
  const galleryImages = [image, ...images.filter((item) => item !== image)];
  const [activeImage, setActiveImage] = useState(image);
  const [zoomOpen, setZoomOpen] = useState(false);

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
      <button className="detail-media" type="button" onClick={() => setZoomOpen(true)} aria-label={`Phóng to ảnh ${name}`}>
        <img src={activeImage} alt={name} />
        <span className="detail-zoom-button" aria-hidden="true"><Maximize2 size={18} /></span>
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