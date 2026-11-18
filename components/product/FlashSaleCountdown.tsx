'use client';

import { useEffect, useState } from 'react';
import type { FlashSalePricing } from '@/lib/pricing';

export function useFlashSaleStatus(endsAt?: FlashSalePricing['flashSaleEndsAt']) {
  const endTime = endsAt instanceof Date ? endsAt.getTime() : endsAt ? Date.parse(endsAt) : Number.NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(endTime) || endTime <= Date.now()) return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endTime]);

  const remainingSeconds = Number.isFinite(endTime) ? Math.max(0, Math.ceil((endTime - now) / 1000)) : null;
  return { active: remainingSeconds !== null && remainingSeconds > 0, expired: remainingSeconds === 0, remainingSeconds };
}

export default function FlashSaleCountdown({ seconds, locale = 'vi' }: { seconds: number; locale?: 'vi' | 'en' }) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const time = [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');

  return <span className="flash-sale-countdown" aria-label={`${locale === 'en' ? 'Sale ends in' : 'Ưu đãi kết thúc sau'} ${time}`}>
    <span>{locale === 'en' ? 'Ends in' : 'Kết thúc sau'}</span>
    <strong>{time}</strong>
  </span>;
}
