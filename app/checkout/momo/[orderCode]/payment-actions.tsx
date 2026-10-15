'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw, Smartphone } from 'lucide-react';

export default function MomoPaymentActions({ orderCode, mode, paymentComplete }: { orderCode: string; mode?: string; paymentComplete: boolean }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(14 * 60 + 59);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!paymentComplete) return;
    void fetch(`/api/orders/${encodeURIComponent(orderCode)}/clear-cart`, { method: 'POST' }).then((response) => {
      if (!response.ok) return;
      try {
        window.localStorage.removeItem('bohoch_cart_quantities');
        window.sessionStorage.removeItem('buy_now_item');
      } catch {
        return;
      }
    }).catch(() => undefined);
  }, [orderCode, paymentComplete]);

  async function checkPaymentStatus() {
    setChecking(true);
    setMessage('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`, { cache: 'no-store' });
      const result = await response.json() as { paymentStatus?: string };
      if (response.ok && result.paymentStatus === 'PAID') {
        router.refresh();
      } else {
        setMessage('Chưa nhận được xác nhận MoMo. Đơn vẫn đang chờ thanh toán.');
      }
    } catch {
      setMessage('Không thể kiểm tra trạng thái lúc này. Đơn vẫn đang chờ xác nhận.');
    } finally {
      setChecking(false);
    }
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const retryUrl = `/checkout/momo/${encodeURIComponent(orderCode)}${mode === 'buy_now' ? '?mode=buy_now' : ''}`;
  const checkoutUrl = `/checkout${mode === 'buy_now' ? '?mode=buy_now&paymentMethod=COD' : '?paymentMethod=COD'}`;

  if (paymentComplete) {
    return <div className="momo-payment-actions"><Link className="momo-paid-button" href={`/cam-on?orderCode=${encodeURIComponent(orderCode)}`}>Đã xác nhận thanh toán <ArrowRight size={18} aria-hidden="true" /></Link></div>;
  }

  return (
    <div className="momo-payment-actions">
      <p className={secondsLeft ? 'momo-countdown' : 'momo-countdown is-expired'} role="timer">
        {secondsLeft ? `Mã QR hết hạn sau ${minutes}:${seconds}` : 'Mã QR đã hết hạn'}
      </p>
      <a className="momo-open-app" href="momo://">
        <Smartphone size={18} aria-hidden="true" /> Mở App MoMo
      </a>
      <button className="momo-paid-button" type="button" onClick={() => void checkPaymentStatus()} disabled={checking}>
        <RefreshCw size={17} aria-hidden="true" /> {checking ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái thanh toán'}
      </button>
      {message && <p role="status">{message}</p>}
      <div className="hero-actions">
        <Link className="primary-action" href={retryUrl}>Thanh toán lại</Link>
        <Link className="secondary-action" href={checkoutUrl}>Đổi phương thức sang COD</Link>
      </div>
    </div>
  );
}