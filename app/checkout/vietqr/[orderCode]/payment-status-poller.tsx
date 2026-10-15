'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

export default function PaymentStatusPoller({ orderCode, orderId, initiallyPaid = false, children }: { orderCode: string; orderId: string; initiallyPaid?: boolean; children: ReactNode }) {
  const router = useRouter();
  const [paid, setPaid] = useState(initiallyPaid);

  useEffect(() => {
    if (!paid) return;
    void fetch(`/api/orders/${encodeURIComponent(orderCode)}/clear-cart`, { method: 'POST' }).then((response) => {
      if (!response.ok) return;
      try {
        window.localStorage.removeItem('bohoch_cart_quantities');
        window.sessionStorage.removeItem('buy_now_item');
      } catch {
        return;
      }
    }).catch(() => undefined);
  }, [orderCode, paid]);

  useEffect(() => {
    if (paid) {
      router.push(`/order-success?orderId=${encodeURIComponent(orderId)}`);
      return;
    }

    let active = true;
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`, { cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json() as { status?: string; paymentStatus?: string };
        if (active && (result.status === 'PAID' || result.paymentStatus === 'PAID')) setPaid(true);
      } catch {
        return;
      }
    };

    void checkStatus();
    const interval = window.setInterval(() => { void checkStatus(); }, 2000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [orderCode, orderId, paid, router]);

  return (
    <div className="payment-qr-layout" data-payment-paid={paid ? 'true' : undefined}>
      {paid && <div className="payment-success-overlay" role="status" aria-live="assertive">
        <CheckCircle2 size={78} strokeWidth={1.7} aria-hidden="true" />
        <h2>ĐÃ NHẬN THANH TOÁN THÀNH CÔNG!</h2>
        <p>Đơn hàng {orderCode} đang được xác nhận.</p>
        <span>Đang chuyển đến xác nhận đơn hàng...</span>
      </div>}
      {!paid && children}
    </div>
  );
}