'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Ticket, X } from 'lucide-react';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import { getErrorMessage } from '@/lib/error-message';
import { createAbortSignal } from '@/lib/request-timeout';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';
import VietnamAddressFields from './vietnam-address-fields';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { formatApproxVnd } from '@/lib/translations';

type CheckoutItem = { id: string; productId: string; productSlug: string; variantId: string | null; quantity: number; unitPrice: number };
type BuyNowSnapshot = { productId: string; variantId: string | null; quantity: number };

type InitialCustomer = { name: string; email: string; phone: string; address: string };
type AvailableVoucher = { id: string; code: string; discountType: 'PERCENTAGE' | 'FIXED'; value: number; maxDiscount: number | null; minSpend: number; expiresAt: string | null; freeShipping: boolean; firstOrderOnly: boolean };

export function BuyNowCartRecovery({ items }: { items: CheckoutItem[] }) {
  const router = useRouter();
  const attempted = useRef(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (attempted.current) return;

    let snapshot: BuyNowSnapshot | null = null;
    try {
      const rawSnapshot = window.sessionStorage.getItem('buy_now_item');
      if (rawSnapshot) {
        const parsed = JSON.parse(rawSnapshot) as Partial<BuyNowSnapshot>;
        if (typeof parsed.productId === 'string' && parsed.productId && Number.isSafeInteger(parsed.quantity) && Number(parsed.quantity) > 0) {
          snapshot = { productId: parsed.productId, variantId: parsed.variantId ?? null, quantity: Number(parsed.quantity) };
        }
      }
    } catch {
      snapshot = null;
    }

    if (!snapshot) {
      if (items.length === 0) setMessage('Phiên Mua ngay không còn dữ liệu. Hãy quay lại chọn sản phẩm.');
      return;
    }

    const cartMatchesSnapshot = items.length === 1
      && items[0].productId === snapshot.productId
      && items[0].variantId === snapshot.variantId
      && items[0].quantity === snapshot.quantity;
    if (cartMatchesSnapshot) return;

    attempted.current = true;
    let cancelled = false;
    setMessage('Đang đồng bộ sản phẩm Mua ngay...');

    void (async () => {
      try {
        const response = await fetch('/api/cart/items', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: snapshot.productId, variantId: snapshot.variantId ?? undefined, quantity: snapshot.quantity, buyNow: true }),
        });
        if (!response.ok) throw new Error('Unable to synchronize buy-now cart.');
        if (!cancelled) router.refresh();
      } catch {
        if (!cancelled) setMessage('Không thể khôi phục sản phẩm Mua ngay. Hãy quay lại trang sản phẩm và chọn lại.');
      }
    })();

    return () => { cancelled = true; };
  }, [items, router]);

  return message ? <p className="checkout-service-notice" role="status">{message}</p> : null;
}

function clearBuyNowSnapshot() {
  try {
    window.sessionStorage.removeItem('buy_now_item');
  } catch {
    return;
  }
}

function clearLocalCartSnapshot() {
  try {
    window.localStorage.removeItem('bohoch_cart_quantities');
    window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: 0 } }));
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

export default function CheckoutForm({ items, initialCustomer, subtotal, shipping, checkoutUnavailable = false, buyNow = false, initialPaymentMethod = 'VIETQR', mobileSummary }: { items: CheckoutItem[]; initialCustomer?: InitialCustomer; subtotal: number; shipping: number; checkoutUnavailable?: boolean; buyNow?: boolean; initialPaymentMethod?: 'COD' | 'VIETQR'; mobileSummary?: ReactNode }) {
  const { locale, currency, formatCurrency, t } = useLocaleCurrency();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitLock = useRef(false);
  const idempotencyKeyRef = useRef('');
  const idempotencyBodyRef = useRef('');
  const [voucher, setVoucher] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [voucherFeedback, setVoucherFeedback] = useState<{ type: 'success' | 'error'; text: string; requiresLogin?: boolean } | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [voucherPickerOpen, setVoucherPickerOpen] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<AvailableVoucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherListError, setVoucherListError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);
  const [shippingCountry, setShippingCountry] = useState('VN');
  const [buyNowSnapshot, setBuyNowSnapshot] = useState<BuyNowSnapshot | null>(null);
  const [buyNowLoaded, setBuyNowLoaded] = useState(!buyNow);
  const normalizedVoucher = voucher.trim().toUpperCase();
  const freeShippingApplied = subtotal >= FREE_SHIPPING_THRESHOLD;
  const discount = appliedVoucher ? voucherDiscount : 0;
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

  async function applyVoucher(selectedCode = normalizedVoucher) {
    const code = selectedCode.trim().toUpperCase();
    if (!code) return;
    setVoucher(code);
    const phone = String(new FormData(formRef.current ?? undefined).get('phone') ?? '');
    setApplyingVoucher(true);
    setAppliedVoucher('');
    setVoucherDiscount(0);
    setVoucherFeedback(null);
    try {
      const response = await fetch('/api/checkout/voucher', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ voucherCode: code, phone, buyNow }),
      });
      const result = await response.json() as { discount?: number; error?: { code?: string; message?: string } };
      if (!response.ok || typeof result.discount !== 'number') {
        setVoucherFeedback({
          type: 'error',
          text: result.error?.message ?? 'Mã giảm giá không tồn tại hoặc đã hết hạn.',
          requiresLogin: result.error?.code === 'VOUCHER_LOGIN_REQUIRED',
        });
        return;
      }
      setAppliedVoucher(code);
      setVoucherDiscount(result.discount);
      setVoucherFeedback({ type: 'success', text: locale === 'en' ? `Code ${code} applied: ${formatCurrency(result.discount)} off.` : `Đã áp dụng mã ${code}: giảm ${formatCurrency(result.discount)}.` });
    } catch {
      setVoucherFeedback({ type: 'error', text: 'Không thể kiểm tra mã giảm giá. Vui lòng thử lại.' });
    } finally {
      setApplyingVoucher(false);
    }
  }

  async function openVoucherPicker() {
    setVoucherPickerOpen(true);
    setLoadingVouchers(true);
    setVoucherListError('');
    try {
      const response = await fetch('/api/vouchers', { cache: 'no-store' });
      const result = await response.json() as { items?: AvailableVoucher[]; error?: string | { message?: string } };
      if (!response.ok || !result.items) {
        const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message;
        throw new Error(errorMessage ?? 'Không thể tải danh sách voucher.');
      }
      setAvailableVouchers(result.items);
    } catch (error) {
      setVoucherListError(error instanceof Error ? error.message : 'Không thể tải danh sách voucher.');
    } finally {
      setLoadingVouchers(false);
    }
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (shippingCountry !== 'VN') return;
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
    try {
      const requestBody = JSON.stringify({
        customerName: form.get('name'),
        phone: form.get('phone'),
        address: [form.get('province'), form.get('district'), form.get('ward'), form.get('address')].filter(Boolean).join(', '),
        discountCode: appliedVoucher,
        customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
        delivery: { address: [form.get('province'), form.get('district'), form.get('ward'), form.get('address')].filter(Boolean).join(', ') },
        paymentMethod,
        note: form.get('notes'),
        voucherCode: appliedVoucher,
        items: checkoutItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          productSlug: item.productSlug,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        buyNow,
      });
      if (!idempotencyKeyRef.current || idempotencyBodyRef.current !== requestBody) {
        idempotencyKeyRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `mkf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        idempotencyBodyRef.current = requestBody;
      }
      const requestTimeout = createAbortSignal(15_000);
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKeyRef.current },
          body: requestBody,
          signal: requestTimeout.signal,
        });
        const result = await response.json() as {
          success?: boolean;
          orderId?: string;
          orderCode?: string;
          redirectUrl?: string;
          error?: unknown;
        };

        if (!response.ok) {
          const serverError = result.error && typeof result.error === 'object' ? result.error as { code?: string; message?: string } : null;
          if (serverError?.code === 'VOUCHER_NOT_ELIGIBLE') {
            setVoucher('');
            setAppliedVoucher('');
            setVoucherDiscount(0);
            setVoucherFeedback({ type: 'error', text: serverError.message ?? 'Mã giảm giá không còn đủ điều kiện và đã được hủy.' });
          }
          const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
          submitLock.current = false;
          setSubmitting(false);
          setRetryAvailable(retryable);
          setMessage(retryable
            ? getErrorMessage(result.error, 'Hệ thống đang xử lý đơn hàng. Chưa nhận được xác nhận; bấm kiểm tra trạng thái để thử lại an toàn, tránh gửi yêu cầu mới.')
            : getErrorMessage(result.error, 'Không thể tạo đơn hàng. Vui lòng kiểm tra thông tin và thử lại.'));
          return;
        }

        if (result.success !== true || !result.orderId || !result.orderCode || !result.redirectUrl) {
          throw new Error('Checkout response did not confirm a persisted order.');
        }

        const destination = new URL(result.redirectUrl, window.location.origin);
        if (destination.origin !== window.location.origin) {
          throw new Error('Checkout returned an unsafe redirect URL.');
        }

        rememberUserOrder(result.orderCode);
        if (paymentMethod === 'COD') {
          clearLocalCartSnapshot();
          if (buyNow) clearBuyNowSnapshot();
        }
        router.push(`${destination.pathname}${destination.search}${destination.hash}`);
        return;
      } finally {
        requestTimeout.clear();
      }
    } catch (error) {
      const timeoutReached = error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name);
      submitLock.current = false;
      setSubmitting(false);
      setRetryAvailable(true);
      setMessage(timeoutReached
        ? 'Yêu cầu thanh toán đã hết thời gian chờ. Đơn có thể đã được ghi nhận; hãy kiểm tra trạng thái hoặc thử lại bằng cùng mã yêu cầu để tránh tạo trùng.'
        : 'Hệ thống đang xử lý đơn hàng nhưng phản hồi chậm. Đơn có thể đã được ghi nhận; hãy kiểm tra lại trạng thái bằng cùng mã yêu cầu, tránh tạo trùng.');
    }
  }

  return (
    <form ref={formRef} className="form-list" onSubmit={submitOrder}>
      <div className="field checkout-country-field"><label htmlFor="shipping-country">Quốc gia giao hàng</label><select id="shipping-country" value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)}><option value="VN">Việt Nam</option><option value="SG">Singapore</option><option value="MY">Malaysia</option></select></div>
      {shippingCountry !== 'VN' && <p className="checkout-cross-border-notice" role="status">Hệ thống vận chuyển xuyên biên giới (Cross-border Shipping) đang trong giai đoạn tích hợp đối tác. Phí vận chuyển sẽ được tự động quy đổi sang SGD/MYR.</p>}
      <div className="field"><label htmlFor="name">Họ tên</label><input id="name" name="name" autoComplete="name" defaultValue={initialCustomer?.name} required /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={initialCustomer?.email} /></div>
      <div className="field"><label htmlFor="phone">Điện thoại</label><ValidatedPhoneInput id="phone" name="phone" autoComplete="tel" defaultValue={initialCustomer?.phone} required /></div>
      <VietnamAddressFields initialAddress={initialCustomer?.address} />
      {freeShippingApplied && <p className="automatic-shipping-banner" role="status">Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ).</p>}
      <div className="checkout-voucher-entry">
        <label className="field" htmlFor="voucher">Mã giảm giá</label>
        <div className="checkout-voucher-controls">
          <input id="voucher" name="voucher" value={voucher} onChange={(event) => { setVoucher(event.target.value); setAppliedVoucher(''); setVoucherDiscount(0); setVoucherFeedback(null); }} placeholder="Nhập mã giảm giá..." />
          <button type="button" className="secondary-action" onClick={() => void applyVoucher()} disabled={!voucher.trim() || applyingVoucher}>{applyingVoucher ? 'Đang kiểm tra...' : 'Áp dụng'}</button>
        </div>
        <button type="button" className="checkout-voucher-picker-trigger" onClick={() => void openVoucherPicker()}><Ticket size={16} /> Chọn voucher</button>
      </div>
      {voucherPickerOpen && <div className="voucher-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVoucherPickerOpen(false); }}>
        <section className="voucher-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="voucher-picker-title">
          <header><div><p className="eyebrow">Ưu đãi dành cho bạn</p><h2 id="voucher-picker-title">Chọn voucher</h2></div><button type="button" className="voucher-picker-close" aria-label="Đóng" onClick={() => setVoucherPickerOpen(false)}><X size={19} /></button></header>
          {loadingVouchers ? <p className="voucher-picker-message">Đang tải voucher...</p>
            : voucherListError ? <p className="voucher-picker-message is-error" role="alert">{voucherListError}</p>
              : availableVouchers.length ? <div className="voucher-picker-list">{availableVouchers.map((item) => <article className="voucher-picker-item" key={item.id}>
                <div><strong>{item.freeShipping ? 'Miễn phí vận chuyển' : item.discountType === 'PERCENTAGE' ? `Giảm ${item.value}%` : `Giảm ${item.value.toLocaleString('vi-VN')}đ`}</strong><span>Mã <b>{item.code}</b> · Đơn từ {item.minSpend.toLocaleString('vi-VN')}đ</span>{item.firstOrderOnly && <small>Dành cho đơn hàng đầu tiên</small>}{item.expiresAt && <small>Hạn đến {new Date(item.expiresAt).toLocaleDateString('vi-VN')}</small>}</div>
                <button type="button" className="secondary-action" disabled={applyingVoucher} onClick={() => { setVoucherPickerOpen(false); void applyVoucher(item.code); }}>Áp dụng</button>
              </article>)}</div>
                : <p className="voucher-picker-message">Hiện chưa có voucher công khai nào. Hãy quay lại sau nhé.</p>}
        </section>
      </div>}
      {voucherFeedback && <p className={voucherFeedback.type === 'success' ? 'checkout-voucher-success' : 'checkout-voucher-error'} role={voucherFeedback.type === 'success' ? 'status' : 'alert'}>{voucherFeedback.text}</p>}
      {voucherFeedback?.requiresLogin && <p className="checkout-voucher-error"><Link href={`/dang-nhap?callbackUrl=${encodeURIComponent(buyNow ? '/checkout?mode=buy_now' : '/checkout')}`}>Đăng nhập</Link> · <Link href={`/dang-ky?callbackUrl=${encodeURIComponent(buyNow ? '/checkout?mode=buy_now' : '/checkout')}`}>Tạo tài khoản</Link></p>}
      {appliedVoucher && <div className="checkout-discount-summary"><span>{locale === 'en' ? 'Discount' : 'Giảm giá'}</span><strong>−{formatCurrency(discount)}</strong><span>{locale === 'en' ? 'Total after discount' : 'Tổng thanh toán sau giảm'}</span><strong>{formatCurrency(checkoutTotal)}{currency === 'SGD' && <> ({formatApproxVnd(checkoutTotal)})</>}</strong>{currency === 'SGD' && <small>Thanh toán quy đổi theo tỷ giá liên ngân hàng</small>}</div>}
      <fieldset className="payment-method-options"><legend>Phương thức thanh toán</legend>
        <label className={paymentMethod === 'COD' ? 'is-selected' : ''}><input type="radio" name="method" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /><span><strong>COD</strong><small>Thanh toán khi nhận hàng</small></span></label>
        <label className={paymentMethod === 'VIETQR' ? 'is-selected' : ''}><input type="radio" name="method" value="VIETQR" checked={paymentMethod === 'VIETQR'} onChange={() => setPaymentMethod('VIETQR')} /><span><strong>VietQR</strong><small>Quét mã, chuyển khoản ngân hàng</small></span></label>
        <label className="payment-method-disabled"><input type="radio" name="method" value="HITPAY" disabled /><span><strong>Thanh toán Quốc tế (Singapore / Malaysia)</strong><small>(Hỗ trợ ShopeePay, PayNow, GrabPay qua cổng HitPay)</small><small className="payment-sandbox-badge">[ Đang thử nghiệm Sandbox - Giai đoạn 2 ]</small></span></label>
      </fieldset>
      <div className="field"><label htmlFor="notes">Ghi chú</label><textarea id="notes" name="notes" rows={4} /></div>
      {mobileSummary && <div className="checkout-mobile-summary summary-card">{mobileSummary}</div>}
      <button className="primary-action" type="submit" disabled={checkoutUnavailable || !items.length || shippingCountry !== 'VN' || (buyNow && (!buyNowLoaded || !buyNowSnapshot)) || submitting}>
        {submitting
          ? <><LoaderCircle className="checkout-loading-icon" size={18} aria-hidden="true" />Đang khởi tạo giao dịch an toàn...</>
          : retryAvailable ? 'Kiểm tra trạng thái / Thử lại an toàn' : checkoutUnavailable ? 'Tạm thời chưa thể xác nhận' : t('placeOrder')}
      </button>
      {message && <p className="checkout-inline-error" role={retryAvailable ? 'status' : 'alert'}>{message}</p>}
    </form>
  );
}