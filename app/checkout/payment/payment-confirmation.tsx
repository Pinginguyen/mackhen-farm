'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentConfirmation({
  orderId,
  orderCode,
  expiresAt,
  alreadyConfirmed,
  paymentMethod,
}: {
  orderId: string;
  orderCode: string;
  expiresAt: string;
  alreadyConfirmed: boolean;
  paymentMethod?: 'VIETQR' | 'MOMO';
}) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(alreadyConfirmed);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const updateCountdown = () => setSecondsLeft(Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000)));
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  async function confirmTransfer() {
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/confirm-payment`, { method: 'POST' });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'Không thể xác nhận đơn hàng.');
        return;
      }
      setConfirmed(true);
      setMessage('Thanh toán đã được ghi nhận; đơn hàng chuyển sang trạng thái đang xử lý.');
      router.push(`/cam-on?orderCode=${encodeURIComponent(orderCode)}`);
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="payment-confirmation">
      <p className={secondsLeft ? 'payment-countdown' : 'payment-expired'}>
        {secondsLeft ? `Mã QR hết hạn sau ${minutes}:${seconds}` : 'Mã QR đã hết hạn'}
      </p>
      <button className="primary-action" type="button" onClick={confirmTransfer} disabled={submitting || confirmed || secondsLeft === 0}>
        {confirmed ? 'Đã xác nhận thanh toán' : submitting ? 'Đang xác nhận...' : paymentMethod === 'MOMO' ? 'Thanh toán MoMo thành công (Test)' : 'Tôi đã chuyển khoản'}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}