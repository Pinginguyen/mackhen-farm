'use client';

import { useState } from 'react';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function ReviewForm({ productId }: { productId: string }) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
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
        setMessage(result.error ?? (isEN ? 'Could not submit your review.' : 'Không thể gửi đánh giá.'));
        return;
      }
      setMessage(isEN ? 'Thank you for reviewing this product. Reload the page to see your review.' : 'Cảm ơn bạn đã đánh giá sản phẩm. Tải lại trang để xem đánh giá.');
      event.currentTarget.reset();
      setRating(5);
    } catch {
      setMessage(isEN ? 'Connection failed. Please try again.' : 'Không thể kết nối. Vui lòng thử lại.');
    }
  }

  return (
    <form className="form-list review-form" onSubmit={submit}>
      <h3>{isEN ? 'Review a delivered order' : 'Đánh giá đơn hàng đã giao'}</h3>
      <div className="field">
        <label htmlFor="review-order">{isEN ? 'Order number' : 'Mã đơn hàng'}</label>
        <input id="review-order" name="orderCode" required />
      </div>
      <div className="field">
        <label htmlFor="review-phone">{isEN ? 'Order phone number' : 'Số điện thoại đặt hàng'}</label>
        <ValidatedPhoneInput id="review-phone" name="phone" required />
      </div>
      <div className="field">
          <label>{isEN ? 'Your rating' : 'Đánh giá của bạn'}</label>
        <div className="review-stars-picker" aria-label={isEN ? 'Select a star rating' : 'Chọn số sao đánh giá'}>
          {[5, 4, 3, 2, 1].map((value) => (
            <button
              key={value}
              type="button"
              className={rating === value ? 'is-selected' : ''}
              onClick={() => setRating(value)}
              aria-label={isEN ? `${value} stars` : `${value} sao`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="review-comment">{isEN ? 'Review' : 'Bình luận'}</label>
        <textarea id="review-comment" name="comment" minLength={3} maxLength={1000} required />
      </div>
      <button className="primary-action" type="submit">{isEN ? 'Submit review' : 'Gửi đánh giá'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}