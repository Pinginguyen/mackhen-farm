'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

type TrackedOrder = {
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  trackingCode: string | null;
  carrier: 'GHTK' | 'SPX' | null;
  createdAt: string;
  items: { productId: string; productName: string; quantity: number; price: number }[];
};

const steps = ['Đã đặt hàng', 'Đang đóng gói', 'Đang giao hàng', 'Giao hàng thành công'];

function activeStep(status: string): number {
  if (['DELIVERED', 'COMPLETED'].includes(status)) return 3;
  if (status === 'SHIPPING') return 2;
  if (['CONFIRMED', 'PAID', 'PROCESSING'].includes(status)) return 1;
  return 0;
}

function ReviewAfterDelivery({ order, productId }: { order: TrackedOrder; productId: string }) {
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode: order.orderCode, phone: form.get('phone'), productId, rating: Number(form.get('rating')), comment: form.get('comment') }),
      });
      const result = await response.json() as { error?: string };
      setMessage(response.ok ? 'Cảm ơn bạn đã đánh giá.' : result.error ?? 'Không thể gửi đánh giá.');
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    }
  }

  return <form className="tracking-review" onSubmit={submit}><h4>Đánh giá {order.items.find((item) => item.productId === productId)?.productName}</h4><div className="field"><label>Số điện thoại đặt hàng<input name="phone" type="tel" required /></label></div><div className="field"><label>Số sao<select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></label></div><div className="field"><label>Bình luận<input name="comment" minLength={3} maxLength={1000} required /></label></div><button className="secondary-action" type="submit">Gửi đánh giá</button>{message && <p role="status">{message}</p>}</form>;
}

export default function TrackingForm() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/tracking', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderCode: form.get('orderCode'), phone: form.get('phone') }) });
      const result = await response.json() as { items?: TrackedOrder[]; error?: string };
      if (!response.ok) setError(result.error ?? 'Không thể tra cứu đơn hàng.');
      else if (!result.items?.length) setError('Không tìm thấy đơn hàng phù hợp.');
      else setOrders(result.items);
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="tracking-content"><form className="tracking-search" onSubmit={lookup}><div className="field"><label htmlFor="tracking-code">Mã đơn hàng</label><input id="tracking-code" name="orderCode" placeholder="MKF-123456" defaultValue={searchParams.get('orderCode') ?? ''} /></div><span>hoặc</span><div className="field"><label htmlFor="tracking-phone">Số điện thoại</label><input id="tracking-phone" name="phone" type="tel" /></div><button className="primary-action" disabled={loading}>{loading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng'}</button></form>{error && <p role="alert">{error}</p>}{orders.map((order) => { const current = activeStep(order.orderStatus); const delivered = ['DELIVERED', 'COMPLETED'].includes(order.orderStatus); return <article className="tracking-order" key={order.orderCode}><header><div><p className="eyebrow">Mã đơn</p><h2>{order.orderCode}</h2></div><strong>{order.totalAmount.toLocaleString('vi-VN')}đ</strong></header>{order.orderStatus === 'CANCELLED' ? <p className="form-error">Đơn hàng đã hủy.</p> : <ol className="tracking-steps">{steps.map((step, index) => <li className={index <= current ? 'is-complete' : ''} key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}</ol>}<div className="tracking-carrier"><span>Đơn vị vận chuyển: {order.carrier === 'SPX' ? 'SPX Express' : order.carrier === 'GHTK' ? 'GHTK' : 'Chưa bàn giao'}</span>{order.trackingCode && <span>Mã vận đơn: <strong>{order.trackingCode}</strong></span>}</div><div className="tracking-items">{order.items.map((item) => <div key={`${order.orderCode}-${item.productId}`}><span>{item.productName} × {item.quantity}</span><strong>{(item.price * item.quantity).toLocaleString('vi-VN')}đ</strong></div>)}</div>{delivered && <div className="delivered-reviews"><h3>Chia sẻ trải nghiệm</h3>{[...new Set(order.items.map((item) => item.productId))].map((productId) => <ReviewAfterDelivery key={productId} order={order} productId={productId} />)}</div>}</article>; })}</div>;
}