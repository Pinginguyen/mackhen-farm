'use client';

import { useState } from 'react';
import { calculateVoucherDiscount } from '@/lib/vouchers';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import VietnamAddressFields from './vietnam-address-fields';

type CheckoutItem = { productId: string; variantId: string | null; quantity: number };

type InitialCustomer = { name: string; email: string; phone: string; address: string };

export default function CheckoutForm({ items, initialCustomer, subtotal, shipping }: { items: CheckoutItem[]; initialCustomer?: InitialCustomer; subtotal: number; shipping: number }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voucher, setVoucher] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('VIETQR');
  const normalizedVoucher = voucher.trim().toUpperCase();
  const freeShippingApplied = subtotal >= FREE_SHIPPING_THRESHOLD;
  const discount = calculateVoucherDiscount(normalizedVoucher, subtotal, shipping);

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    let result: { orderId?: string; orderCode?: string; total?: number; error?: { message?: string } };
    let response: Response;
    try {
      response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
          delivery: { address: [form.get('province'), form.get('district'), form.get('ward'), form.get('address')].filter(Boolean).join(', ') },
          paymentMethod,
          note: form.get('notes'),
          voucherCode: normalizedVoucher || (freeShippingApplied ? 'FREESHIP169' : ''),
        }),
      });
      result = await response.json() as typeof result;
    } catch {
      setSubmitting(false);
      setMessage('Không thể kết nối để tạo đơn hàng. Vui lòng thử lại.');
      return;
    }
    setSubmitting(false);
    if (!response.ok || !result.orderId) {
      setMessage(result.error?.message ?? 'Không thể tạo đơn hàng.');
      return;
    }

    if (paymentMethod === 'MOMO') {
      window.location.assign(`/checkout/momo-mock/${encodeURIComponent(result.orderCode ?? result.orderId)}`);
      return;
    }

    if (paymentMethod === 'VIETQR') {
      setSubmitting(true);
      let destination = `/checkout/vietqr/${encodeURIComponent(result.orderCode ?? result.orderId)}`;
      try {
        const paymentResponse = await fetch('/api/payments/payos/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderId: result.orderId, amount: result.total }),
        });
        const payment = await paymentResponse.json() as { checkoutUrl?: string; fallbackUrl?: string };
        destination = payment.checkoutUrl ?? payment.fallbackUrl ?? destination;
      } catch {
        setMessage('PayOS chưa khả dụng. Đang chuyển sang thanh toán VietQR.');
      }
      window.location.assign(destination);
      return;
    }

    window.location.assign(`/cam-on?orderCode=${encodeURIComponent(result.orderCode ?? '')}`);
  }

  return (
    <form className="form-list" onSubmit={submitOrder}>
      <div className="field"><label htmlFor="name">Họ tên</label><input id="name" name="name" autoComplete="name" defaultValue={initialCustomer?.name} required /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={initialCustomer?.email} /></div>
      <div className="field"><label htmlFor="phone">Điện thoại</label><input id="phone" name="phone" autoComplete="tel" defaultValue={initialCustomer?.phone} required /></div>
      <VietnamAddressFields initialAddress={initialCustomer?.address} />
      {freeShippingApplied && <p className="automatic-shipping-banner" role="status">Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ).</p>}
      <div className="field"><label htmlFor="voucher">Mã giảm giá khác</label><input id="voucher" name="voucher" value={voucher} onChange={(event) => setVoucher(event.target.value)} placeholder="GIAM10" /></div>
      {normalizedVoucher && <p role="status">{discount !== null ? `Ước tính giảm ${discount.toLocaleString('vi-VN')}đ · thanh toán ${(subtotal + shipping - discount).toLocaleString('vi-VN')}đ` : 'Mã giảm giá không hợp lệ.'}</p>}
      <fieldset className="payment-method-options"><legend>Phương thức thanh toán</legend>
        <label className={paymentMethod === 'COD' ? 'is-selected' : ''}><input type="radio" name="method" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /><span><strong>COD</strong><small>Thanh toán khi nhận hàng</small></span></label>
        <label className={paymentMethod === 'VIETQR' ? 'is-selected' : ''}><input type="radio" name="method" value="VIETQR" checked={paymentMethod === 'VIETQR'} onChange={() => setPaymentMethod('VIETQR')} /><span><strong>VietQR</strong><small>Quét mã, chuyển khoản ngân hàng</small></span></label>
        <label className={paymentMethod === 'MOMO' ? 'is-selected' : ''}><input type="radio" name="method" value="MOMO" checked={paymentMethod === 'MOMO'} onChange={() => setPaymentMethod('MOMO')} /><span><strong>MoMo Sandbox</strong><small>Mô phỏng thanh toán để kiểm thử</small></span></label>
      </fieldset>
      <div className="field"><label htmlFor="notes">Ghi chú</label><textarea id="notes" name="notes" rows={4} /></div>
      <button className="primary-action" type="submit" disabled={!items.length || submitting}>{submitting ? 'Đang xử lý...' : 'Xác nhận đơn hàng'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}