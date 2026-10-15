'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { calculateVoucherDiscount } from '@/lib/vouchers';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import { getErrorMessage } from '@/lib/error-message';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';
import VietnamAddressFields from './vietnam-address-fields';

type CheckoutItem = { id: string; productId: string; productSlug: string; variantId: string | null; quantity: number; unitPrice: number };
type BuyNowSnapshot = { productId: string; variantId: string | null; quantity: number };

type InitialCustomer = { name: string; email: string; phone: string; address: string };

function clearBuyNowSnapshot() {
  try {
    window.sessionStorage.removeItem('buy_now_item');
  } catch {
    return;
  }
}

function rememberUserOrder(orderCode: string) {
  if (!/^MKF-\d{6}$/.test(orderCode)) return;
  try {
    const saved = JSON.parse(window.localStorage.getItem('user_orders') ?? '[]') as unknown;
    const orderCodes = Array.isArray(saved) ? saved.filter((code): code is string => typeof code === 'string' && /^MKF-\d{6}$/.test(code)) : [];
    window.localStorage.setItem('user_orders', JSON.stringify([...new Set([...orderCodes, orderCode])].slice(-100)));
  } catch {
    return;
  }
}

export default function CheckoutForm({ items, initialCustomer, subtotal, shipping, checkoutUnavailable = false, buyNow = false }: { items: CheckoutItem[]; initialCustomer?: InitialCustomer; subtotal: number; shipping: number; checkoutUnavailable?: boolean; buyNow?: boolean }) {
  const [message, setMessage] = useState('');
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitLock = useRef(false);
  const idempotencyKeyRef = useRef('');
  const [voucher, setVoucher] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [voucherFeedback, setVoucherFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('VIETQR');
  const [buyNowSnapshot, setBuyNowSnapshot] = useState<BuyNowSnapshot | null>(null);
  const [buyNowLoaded, setBuyNowLoaded] = useState(!buyNow);
  const normalizedVoucher = voucher.trim().toUpperCase();
  const freeShippingApplied = subtotal >= FREE_SHIPPING_THRESHOLD;
  const discount = appliedVoucher ? calculateVoucherDiscount(appliedVoucher, subtotal, shipping) ?? 0 : 0;
  const checkoutTotal = Math.max(0, subtotal + shipping - discount);

  useEffect(() => {
    if (!buyNow) return;
    try {
      const rawSnapshot = window.sessionStorage.getItem('buy_now_item');
      if (rawSnapshot) {
        const snapshot = JSON.parse(rawSnapshot) as Partial<BuyNowSnapshot>;
        if (typeof snapshot.productId === 'string' && Number.isSafeInteger(snapshot.quantity) && Number(snapshot.quantity) > 0) {
          setBuyNowSnapshot({ productId: snapshot.productId, variantId: snapshot.variantId ?? null, quantity: Number(snapshot.quantity) });
        }
      } else {
        setMessage('Phiên mua nhanh đã hết. Vui lòng quay lại trang sản phẩm và chọn Mua ngay.');
      }
    } catch {
      setBuyNowSnapshot(null);
    } finally {
      setBuyNowLoaded(true);
    }
  }, [buyNow]);

  useEffect(() => {
    try {
      const pendingVoucher = window.sessionStorage.getItem('checkout_voucher');
      if (!pendingVoucher) return;
      window.sessionStorage.removeItem('checkout_voucher');
      const code = pendingVoucher.trim().toUpperCase();
      if (calculateVoucherDiscount(code, subtotal, shipping) !== null) {
        setVoucher(code);
        setAppliedVoucher(code);
        setVoucherFeedback({ type: 'success', text: `Đã áp dụng mã ${code}: Giảm 10%.` });
      }
    } catch {
      return;
    }
  }, [shipping, subtotal]);

  function applyVoucher() {
    const code = normalizedVoucher;
    const amount = calculateVoucherDiscount(code, subtotal, shipping);
    if (!code || amount === null) {
      setAppliedVoucher('');
      setVoucherFeedback({ type: 'error', text: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.' });
      return;
    }
    setAppliedVoucher(code);
    setVoucherFeedback({
      type: 'success',
      text: code === 'GIAM10' ? 'Đã áp dụng mã GIAM10: Giảm 10%.' : `Đã áp dụng mã ${code}: Giảm ${amount.toLocaleString('vi-VN')}đ phí vận chuyển.`,
    });
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setMessage('');
    setRetryAvailable(false);
    const checkoutItems = buyNow && buyNowSnapshot
      ? items.filter((item) => item.productId === buyNowSnapshot.productId && item.variantId === buyNowSnapshot.variantId && item.quantity === buyNowSnapshot.quantity)
      : items;
    if (buyNow && (!buyNowSnapshot || checkoutItems.length !== 1)) {
      submitLock.current = false;
      setSubmitting(false);
      setMessage('Sản phẩm mua nhanh không còn khớp với phiên thanh toán. Vui lòng chọn mua lại sản phẩm.');
      return;
    }
    const form = new FormData(event.currentTarget);
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `mkf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    let result: {
      orderId?: string;
      orderCode?: string;
      total?: number;
      success?: boolean;
      redirectUrl?: string;
      order?: { code?: string; total?: number; paymentMethod?: string };
      error?: unknown;
    } = {};
    let response: Response = new Response(null, { status: 503 });
    try {
      const requestBody = JSON.stringify({
        customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
        delivery: { address: [form.get('province'), form.get('district'), form.get('ward'), form.get('address')].filter(Boolean).join(', ') },
        paymentMethod,
        note: form.get('notes'),
        voucherCode: appliedVoucher || (freeShippingApplied ? 'FREESHIP169' : ''),
        items: checkoutItems.map((item) => ({ id: item.id, quantity: item.quantity })),
        buyNow,
      });
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKeyRef.current },
            body: requestBody,
          });
          result = await response.json() as typeof result;
          if (response.status !== 503 || attempt === 1) break;
        } catch (requestError) {
          if (attempt === 1) throw requestError;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } catch {
      submitLock.current = false;
      setSubmitting(false);
      setRetryAvailable(true);
      setMessage('Chưa nhận được xác nhận đặt hàng. Chưa phát sinh thanh toán; thông tin vẫn được giữ để thử lại.');
      return;
    }

    const resultOrderCode = result.order?.code ?? result.orderCode ?? result.orderId ?? '';
    if (response.ok && resultOrderCode) rememberUserOrder(resultOrderCode);
    if (result.success === true || result.redirectUrl) {
      if (buyNow) clearBuyNowSnapshot();
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      if (paymentMethod === 'COD') {
        window.location.assign(`/tra-cuu?orderCode=${encodeURIComponent(resultOrderCode)}&success=1`);
        return;
      }

      const destination = result.redirectUrl
        ?? `/checkout/vietqr/${encodeURIComponent(resultOrderCode)}?demo=1&amount=${result.order?.total ?? result.total ?? 0}`;
      window.location.assign(destination);
      return;
    }

    if (!response.ok || !result.orderId) {
      submitLock.current = false;
      setSubmitting(false);
      const temporaryFailure = response.status === 503;
      setRetryAvailable(temporaryFailure);
      setMessage(temporaryFailure
        ? 'Chưa nhận được xác nhận đặt hàng. Chưa phát sinh thanh toán; giỏ hàng và thông tin vẫn được giữ.'
        : getErrorMessage(result.error, 'Không thể tạo đơn hàng.'));
      return;
    }

    if (buyNow) clearBuyNowSnapshot();

    if (paymentMethod === 'MOMO') {
      window.location.assign(`/checkout/momo/${encodeURIComponent(result.orderCode ?? result.orderId)}?amount=${result.total ?? Math.round(subtotal + shipping - (discount ?? 0))}`);
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

    window.location.assign(`/tra-cuu?orderCode=${encodeURIComponent(result.orderCode ?? '')}&success=1`);
  }

  return (
    <form ref={formRef} className="form-list" onSubmit={submitOrder}>
      <div className="field"><label htmlFor="name">Họ tên</label><input id="name" name="name" autoComplete="name" defaultValue={initialCustomer?.name} required /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={initialCustomer?.email} /></div>
      <div className="field"><label htmlFor="phone">Điện thoại</label><ValidatedPhoneInput id="phone" name="phone" autoComplete="tel" defaultValue={initialCustomer?.phone} required /></div>
      <VietnamAddressFields initialAddress={initialCustomer?.address} />
      {freeShippingApplied && <p className="automatic-shipping-banner" role="status">Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ).</p>}
      <div className="checkout-voucher-entry">
        <label className="field" htmlFor="voucher">Mã giảm giá</label>
        <div className="checkout-voucher-controls">
          <input id="voucher" name="voucher" value={voucher} onChange={(event) => { setVoucher(event.target.value); setAppliedVoucher(''); setVoucherFeedback(null); }} placeholder="GIAM10 hoặc FREESHIP" />
          <button type="button" className="secondary-action" onClick={applyVoucher} disabled={!voucher.trim()}>Áp dụng</button>
        </div>
      </div>
      {voucherFeedback && <p className={voucherFeedback.type === 'success' ? 'checkout-voucher-success' : 'checkout-voucher-error'} role={voucherFeedback.type === 'success' ? 'status' : 'alert'}>{voucherFeedback.text}</p>}
      {appliedVoucher && <div className="checkout-discount-summary"><span>Giảm giá</span><strong>−{discount.toLocaleString('vi-VN')}đ</strong><span>Tổng thanh toán sau giảm</span><strong>{checkoutTotal.toLocaleString('vi-VN')}đ</strong></div>}
      <fieldset className="payment-method-options"><legend>Phương thức thanh toán</legend>
        <label className={paymentMethod === 'COD' ? 'is-selected' : ''}><input type="radio" name="method" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /><span><strong>COD</strong><small>Thanh toán khi nhận hàng</small></span></label>
        <label className={paymentMethod === 'VIETQR' ? 'is-selected' : ''}><input type="radio" name="method" value="VIETQR" checked={paymentMethod === 'VIETQR'} onChange={() => setPaymentMethod('VIETQR')} /><span><strong>VietQR</strong><small>Quét mã, chuyển khoản ngân hàng</small></span></label>
        <label className={paymentMethod === 'MOMO' ? 'is-selected' : ''}><input type="radio" name="method" value="MOMO" checked={paymentMethod === 'MOMO'} onChange={() => setPaymentMethod('MOMO')} /><span><strong>MoMo Sandbox</strong><small>Mô phỏng thanh toán để kiểm thử</small></span></label>
      </fieldset>
      <div className="field"><label htmlFor="notes">Ghi chú</label><textarea id="notes" name="notes" rows={4} /></div>
      <button className="primary-action" type="submit" disabled={checkoutUnavailable || !items.length || (buyNow && (!buyNowLoaded || !buyNowSnapshot)) || submitting}>{submitting ? <><LoaderCircle className="checkout-loading-icon" size={18} aria-hidden="true" />Đang xử lý đơn hàng...</> : checkoutUnavailable ? 'Tạm thời chưa thể xác nhận' : 'Xác nhận đơn hàng'}</button>
      {message && <div className={retryAvailable ? 'checkout-retry-notice' : undefined} role="status"><p>{message}</p>{retryAvailable && <button className="checkout-retry-button" type="button" onClick={() => formRef.current?.requestSubmit()} disabled={submitting}>Thử lại</button>}</div>}
    </form>
  );
}