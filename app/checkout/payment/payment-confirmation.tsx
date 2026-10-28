'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { celebratePayment } from '@/lib/payment-celebration';
import { useLocaleCurrency } from '@/lib/i18n-context';

type PaymentItem = { productId: string; productName: string; variantLabel: string | null; quantity: number; price: number };

export default function PaymentConfirmation({
  orderId,
  orderCode,
  totalAmount,
  createdAt,
  items = [],
  isLocalOnly = false,
  expiresAt,
  alreadyConfirmed,
  paymentMethod,
  redirectToTracking = false,
}: {
  orderId?: string;
  orderCode: string;
  totalAmount?: number;
  createdAt?: string;
  items?: PaymentItem[];
  isLocalOnly?: boolean;
  expiresAt: string;
  alreadyConfirmed: boolean;
  paymentMethod?: 'VIETQR';
  redirectToTracking?: boolean;
}) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(899);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(alreadyConfirmed);
  const [message, setMessage] = useState('');

  function persistOrder(status: 'PENDING' | 'PAID') {
    if (totalAmount === undefined) return;
    try {
      window.localStorage.setItem('current_order', JSON.stringify({
        orderId: orderId ?? null,
        orderCode,
        totalAmount,
        paymentMethod: paymentMethod ?? 'VIETQR',
        orderStatus: status === 'PAID' ? 'PROCESSING' : 'PENDING',
        paymentStatus: status,
        trackingCode: null,
        carrier: null,
        createdAt: createdAt ?? new Date().toISOString(),
        deliveredAt: null,
        warrantyRequest: null,
        items,
        localOnly: isLocalOnly,
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      // Storage may be disabled; the server remains the source of truth.
    }
  }

  useEffect(() => {
    persistOrder(confirmed ? 'PAID' : 'PENDING');
  }, [confirmed, items, isLocalOnly, orderCode, orderId, paymentMethod, totalAmount, createdAt]);

  useEffect(() => {
    const updateCountdown = () => setSecondsLeft(Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000)));
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  async function confirmTransfer() {
    if (isLocalOnly) {
      persistOrder('PENDING');
      setMessage(isEN ? 'Order details were saved on this device for reference. Payment is still unverified.' : 'Đã lưu thông tin trên thiết bị để tra cứu. Thanh toán vẫn chưa được xác minh.');
      router.push(`/tra-cuu?orderCode=${encodeURIComponent(orderCode)}`);
      return;
    }

    if (!orderId) {
      setMessage(isEN ? 'Could not verify the transaction for this order.' : 'Không thể xác minh giao dịch cho đơn hàng này.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/confirm-payment`, { method: 'POST' });
      const result = await response.json() as { confirmed?: boolean; message?: string; error?: { message?: string } };
      if (!response.ok || result.confirmed !== true) {
        setMessage(isEN ? 'Payment confirmation has not been received from the system.' : result.message ?? result.error?.message ?? 'Chưa nhận được xác nhận thanh toán từ hệ thống.');
        return;
      }
      setConfirmed(true);
      celebratePayment(orderCode);
      persistOrder('PAID');
      setMessage(isEN ? 'Payment has been confirmed. Your order is now being processed.' : 'Thanh toán đã được ghi nhận; đơn hàng chuyển sang trạng thái đang xử lý.');
      router.push(redirectToTracking
        ? `/tra-cuu?orderCode=${encodeURIComponent(orderCode)}`
        : `/cam-on?orderCode=${encodeURIComponent(orderCode)}`);
    } catch {
      setMessage(isEN ? 'Could not connect. Please try again.' : 'Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="payment-confirmation">
      <p className={secondsLeft ? 'payment-countdown' : 'payment-expired'}>
        {secondsLeft ? `${isEN ? 'QR code expires in' : 'Mã QR hết hạn sau'} ${minutes}:${seconds}` : isEN ? 'QR code has expired' : 'Mã QR đã hết hạn'}
      </p>
      <button className="primary-action payment-confirm-button micro-tactile" type="button" onClick={confirmTransfer} disabled={submitting || confirmed || secondsLeft === 0}>
        {confirmed ? (isEN ? 'Payment confirmed' : 'Đã xác nhận thanh toán') : submitting ? (isEN ? 'Confirming...' : 'Đang xác nhận...') : (isEN ? 'I have made the transfer' : 'Tôi đã chuyển khoản')}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}