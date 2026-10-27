'use client';

import { useState } from 'react';
import type { PointerEvent } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function BeforeAfterSlider() {
  const [position, setPosition] = useState(50);
  const { locale } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextPosition = ((event.clientX - bounds.left) / bounds.width) * 100;
    setPosition(Math.min(95, Math.max(5, nextPosition)));
  }

  function startPointerDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  }

  function movePointerDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
  }

  return (
    <section className="before-after-section" aria-labelledby="before-after-title">
      <div className="before-after-heading">
        <p className="eyebrow">{text('UPCYCLING · TÂY BẮC')}</p>
        <h2 id="before-after-title">{text('Từ phụ phẩm đến món ngon')}</h2>
        <p>{text('Bã đậu nành địa phương được tái chế thành món ăn giàu đạm, đậm vị mắc khén.')}</p>
      </div>
      <div className="before-after-frame" onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} style={{ '--split': `${position}%` } as React.CSSProperties}>
        <div className="before-after-image before-after-raw">
          <img src="/products/soy-pulp.svg" alt={text('Bã đậu nành thô, nguyên liệu upcycled')} />
        </div>
        <div className="before-after-image before-after-finished">
          <img src="/products/xe-soi.jpg" alt={text('Khô bò thực vật Mắc Khén thành phẩm')} />
        </div>
        <span className="before-after-label before-after-label-raw">{text('NGUYÊN LIỆU')}</span>
        <span className="before-after-label before-after-label-finished">{text('THÀNH PHẨM')}</span>
        <span className="before-after-divider" aria-hidden="true"><span><ArrowLeftRight size={17} /></span></span>
        <input
          className="before-after-range"
          type="range"
          min="5"
          max="95"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label={text('Kéo để so sánh nguyên liệu và thành phẩm')}
          aria-valuetext={`${position}%`}
        />
      </div>
    </section>
  );
}