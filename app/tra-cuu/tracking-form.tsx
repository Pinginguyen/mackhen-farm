'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Check, House, PackageCheck, Truck } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';
import WarrantyRequest from './warranty-request';

type TrackedItem = { productId: string; productName: string; quantity: number; price: number };
type TrackingTimelineItem = { label: string };

type TrackedOrder = {
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  trackingCode: string | null;
  carrier: 'GHTK' | 'SPX' | 'VIETTEL_POST' | null;
  createdAt: string;
  deliveredAt: string | null;
  warrantyRequest: { reason: string; status: string; createdAt: string } | null;
  items: TrackedItem[];
  timeline: TrackingTimelineItem[];
};

const steps = [
  { label: 'Đã nhận đơn', icon: Check },
  { label: 'Đang đóng gói', icon: Box },
  { label: 'Đang vận chuyển', icon: Truck },
  { label: 'Giao thành công', icon: House },
];

function normalizeOrder(value: unknown): TrackedOrder | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const order = value as Partial<TrackedOrder>;
  if (typeof order.orderCode !== 'string' || !order.orderCode.trim()) return null;

  const items = Array.isArray(order.items)
    ? order.items.filter((item): item is TrackedItem => Boolean(item && typeof item.productId === 'string' && typeof item.productName === 'string'))
    : [];
  const timeline = Array.isArray(order.timeline)
    ? order.timeline.filter((item): item is TrackingTimelineItem => Boolean(item && typeof item.label === 'string'))
    : [];
  const carrier = ['GHTK', 'SPX', 'VIETTEL_POST'].includes(order.carrier ?? '')
    ? order.carrier as TrackedOrder['carrier']
    : null;

  return {
    orderCode: order.orderCode,
    orderStatus: typeof order.orderStatus === 'string' ? order.orderStatus : 'PENDING',
    paymentStatus: typeof order.paymentStatus === 'string' ? order.paymentStatus : 'PENDING',
    totalAmount: typeof order.totalAmount === 'number' && Number.isFinite(order.totalAmount) ? order.totalAmount : 0,
    trackingCode: typeof order.trackingCode === 'string' ? order.trackingCode : null,
    carrier,
    createdAt: typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString(),
    deliveredAt: typeof order.deliveredAt === 'string' ? order.deliveredAt : null,
    warrantyRequest: order.warrantyRequest ?? null,
    items,
    timeline,
  };
}

function normalizeOrders(value: unknown): TrackedOrder[] {
  return Array.isArray(value)
    ? value.map(normalizeOrder).filter((order): order is TrackedOrder => order !== null)
    : [];
}

function activeStep(status: string): number {
  if (['DELIVERED', 'COMPLETED'].includes(status)) return 3;
  if (status === 'SHIPPING') return 2;
  if (['CONFIRMED', 'PAID', 'PROCESSING'].includes(status)) return 1;
  return 0;
}

function ReviewAfterDelivery({ order, productId }: { order: TrackedOrder; productId: string }) {
  const [message, setMessage] = useState('');
  const productName = order?.items?.find((item) => item.productId === productId)?.productName ?? 'sản phẩm';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode: order.orderCode, phone: form.get('phone'), productId, rating: Number(form.get('rating')), comment: form.get('comment') }),
      });
      const result = await response.json() as { error?: unknown; message?: unknown };
      setMessage(response.ok ? 'Cảm ơn bạn đã đánh giá.' : getErrorMessage(result?.error ?? result, 'Không thể gửi đánh giá.'));
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    }
  }

  return <form className="tracking-review" onSubmit={submit}><h4>Đánh giá {productName}</h4><div className="field"><label>Số điện thoại đặt hàng<input name="phone" type="tel" required /></label></div><div className="field"><label>Số sao<select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></label></div><div className="field"><label>Bình luận<input name="comment" minLength={3} maxLength={1000} required /></label></div><button className="secondary-action" type="submit">Gửi đánh giá</button>{message && <p role="status">{message}</p>}</form>;
}

export default function TrackingForm() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const lookupRef = useRef({ orderCode: '', phone: '' });

  useEffect(() => {
    if (!orders.length) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/tracking', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderCode: lookupRef.current.orderCode || undefined, phone: lookupRef.current.phone || undefined }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = await response.json() as { items?: unknown } | null;
        const refreshedOrders = normalizeOrders(result?.items);
        if (refreshedOrders.length) setOrders(refreshedOrders);
      } catch {
        if (!controller.signal.aborted) return;
      }
    };
    const interval = window.setInterval(refresh, 30000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [orders.length]);

  async function findOrders(orderCode: string, enteredPhone: string) {
    setError('');
    setLoading(true);
    setOrders([]);
    lookupRef.current = { orderCode, phone: enteredPhone };
    setPhone(enteredPhone);
    try {
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode: orderCode || undefined, phone: enteredPhone || undefined }),
      });
      const result = await response.json() as { items?: unknown; error?: unknown; message?: unknown } | null;
      if (!response.ok) setError(getErrorMessage(result?.error ?? result, 'Không thể tra cứu đơn hàng.'));
      else {
        const matchingOrders = normalizeOrders(result?.items);
        if (!matchingOrders.length) setError('Không tìm thấy đơn hàng phù hợp. Vui lòng kiểm tra thông tin và thử lại.');
        else setOrders(matchingOrders);
      }
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  function readSearchValues() {
    const formData = new FormData(formRef.current ?? undefined);
    return {
      orderCode: String(formData.get('orderCode') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
    };
  }

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = readSearchValues();
    await findOrders(values.orderCode, values.phone);
  }

  async function retryLookup() {
    const values = readSearchValues();
    await findOrders(values.orderCode || lookupRef.current.orderCode, values.phone || lookupRef.current.phone);
  }

  return (
    <div className="tracking-content">
      <form ref={formRef} className="tracking-search" onSubmit={lookup}>
        <div className="field">
          <label htmlFor="tracking-code">Mã đơn hàng</label>
          <input id="tracking-code" name="orderCode" placeholder="MKF-123456" defaultValue={searchParams.get('orderCode') ?? ''} />
        </div>
        <span>hoặc</span>
        <div className="field">
          <label htmlFor="tracking-phone">Số điện thoại</label>
          <input id="tracking-phone" name="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <button className="primary-action" disabled={loading}>{loading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng'}</button>
      </form>

      {error && (
        <div className="tracking-not-found" role="alert">
          <p>{error}</p>
          <button className="secondary-action" type="button" onClick={() => void retryLookup()} disabled={loading}>
            {loading ? 'Đang thử lại...' : 'Thử lại'}
          </button>
        </div>
      )}

      {orders.map((order) => {
        const orderItems = order?.items ?? [];
        const timeline = order?.timeline?.length ? order.timeline : steps;
        const orderStatus = order?.orderStatus ?? 'PENDING';
        const current = activeStep(orderStatus);
        const delivered = ['DELIVERED', 'COMPLETED'].includes(orderStatus);
        const progress = orderStatus === 'CANCELLED' ? 0 : (current / Math.max(1, timeline.length - 1)) * 100;
        const productIds = [...new Set(orderItems.map((item) => item.productId).filter(Boolean))];

        return (
          <article className="tracking-order" key={order.orderCode}>
            <header>
              <div><p className="eyebrow">Mã đơn</p><h2>{order.orderCode}</h2></div>
              <strong>{order.totalAmount.toLocaleString('vi-VN')}đ</strong>
            </header>

            {orderStatus === 'CANCELLED' ? (
              <p className="form-error">Đơn hàng đã hủy.</p>
            ) : (
              <div className="tracking-timeline">
                <div className="tracking-progress"><span style={{ width: `${progress}%` }} /></div>
                <ol className="tracking-steps">
                  {timeline.map((step, index) => {
                    const Icon = steps[index]?.icon ?? Check;
                    return (
                      <li className={index <= current ? 'is-complete' : ''} key={`${step.label}-${index}`}>
                        <span><Icon size={17} /></span>
                        <strong>{step.label}</strong>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <div className="tracking-carrier">
              <span>Đơn vị vận chuyển: {order.carrier === 'SPX' ? 'SPX Express' : order.carrier === 'GHTK' ? 'GHTK' : order.carrier === 'VIETTEL_POST' ? 'Viettel Post' : 'Chưa bàn giao'}</span>
              {order.trackingCode && <span>Mã vận đơn: <strong>{order.trackingCode}</strong></span>}
            </div>

            <div className="tracking-items">
              {orderItems.map((item) => (
                <div key={`${order.orderCode}-${item.productId}`}>
                  <span>{item.productName} × {item.quantity}</span>
                  <strong>{(item.price * item.quantity).toLocaleString('vi-VN')}đ</strong>
                </div>
              ))}
              {!orderItems.length && <p>Đơn hàng chưa có thông tin sản phẩm.</p>}
            </div>

            {delivered && (
              <>
                <WarrantyRequest orderCode={order.orderCode} phone={phone} deliveredAt={order.deliveredAt ?? order.createdAt} existingReason={order.warrantyRequest?.reason} />
                <div className="delivered-reviews">
                  <h3>Chia sẻ trải nghiệm</h3>
                  {productIds.map((productId) => <ReviewAfterDelivery key={productId} order={order} productId={productId} />)}
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}