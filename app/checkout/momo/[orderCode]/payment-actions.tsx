'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Smartphone } from 'lucide-react';

export default function MomoPaymentActions({ orderCode }: { orderCode: string }) {
  const [secondsLeft, setSecondsLeft] = useState(14 * 60 + 59);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const trackingUrl = `/tra-cuu?orderCode=${encodeURIComponent(orderCode)}&success=1`;

  return (
    <div className="momo-payment-actions">
      <p className={secondsLeft ? 'momo-countdown' : 'momo-countdown is-expired'} role="timer">
        {secondsLeft ? `Mã QR hết hạn sau ${minutes}:${seconds}` : 'Mã QR đã hết hạn'}
      </p>
      <a className="momo-open-app" href="momo://">
        <Smartphone size={18} aria-hidden="true" /> Mở App MoMo
      </a>
      <a className="momo-paid-button" href={trackingUrl}>
        Tôi đã chuyển tiền qua MoMo <ArrowRight size={18} aria-hidden="true" />
      </a>
    </div>
  );
}