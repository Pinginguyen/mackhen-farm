'use client';

import { useState } from 'react';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';

export default function ReviewForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, orderCode: form.get('orderCode'), phone: form.get('phone'), rating, comment: form.get('comment') }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? 'Không thể gửi đánh giá.');
        return;
      }
      setMessage('Cảm ơn bạn đã đánh giá sản phẩm. Tải lại trang để xem đánh giá.');
      event.currentTarget.reset();
      setRating(5);
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    }
  }

  return (
    <form className="form-list review-form" onSubmit={submit}>
      <h3>Đánh giá đơn hàng đã giao</h3>
      <div className="field">
        <label htmlFor="review-order">Mã đơn hàng</label>
        <input id="review-order" name="orderCode" required />
      </div>
      <div className="field">
        <label htmlFor="review-phone">Số điện thoại đặt hàng</label>
        <ValidatedPhoneInput id="review-phone" name="phone" required />
      </div>
      <div className="field">
        <label>Đánh giá của bạn</label>
        <div className="review-stars-picker" aria-label="Chọn số sao đánh giá">
          {[5, 4, 3, 2, 1].map((value) => (
            <button
              key={value}
              type="button"
              className={rating === value ? 'is-selected' : ''}
              onClick={() => setRating(value)}
              aria-label={`${value} sao`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="review-comment">Bình luận</label>
        <textarea id="review-comment" name="comment" minLength={3} maxLength={1000} required />
      </div>
      <button className="primary-action" type="submit">Gửi đánh giá</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}