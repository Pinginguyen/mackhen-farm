'use client';

import { useMemo, useState } from 'react';

import ProductRating from '@/components/ProductRating';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';

type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function ProductReviewsSection({
  productId,
  initialRating,
  initialReviews,
}: {
  productId: string;
  initialRating: number;
  initialReviews: Review[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const averageRating = useMemo(() => {
    if (!reviews.length) return initialRating;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [initialRating, reviews]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId,
          customerName: name.trim(),
          orderCode: orderCode.trim(),
          phone: phone.trim(),
          rating,
          comment: comment.trim(),
        }),
      });
      const result = await response.json() as { review?: Review; error?: string };

      if (!response.ok || !result.review) {
        setMessage(result.error ?? 'Không thể gửi đánh giá.');
        return;
      }

      const nextReview: Review = {
        ...result.review,
        customerName: result.review.customerName || name.trim() || 'Khách hàng',
        createdAt: result.review.createdAt || new Date().toISOString(),
      };
      setReviews((current) => [nextReview, ...current]);
      setMessage('Cảm ơn bạn! Đánh giá của bạn đã được thêm ngay lập tức.');
      setName('');
      setPhone('');
      setOrderCode('');
      setComment('');
      setRating(5);
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-card product-reviews">
      <div className="section-heading review-heading">
        <div>
          <p className="eyebrow">Đánh giá khách hàng</p>
          <h2>{averageRating.toFixed(1)} / 5</h2>
        </div>
        <ProductRating rating={averageRating} />
      </div>

      <div className="review-list">
        {reviews.length ? (
          reviews.map((review) => (
            <article className="review-item-card" key={review.id}>
              <div className="review-header">
                <div className="review-avatar" aria-hidden="true">{review.customerName.trim().charAt(0).toUpperCase() || 'K'}</div>
                <div className="review-user-meta">
                  <strong>{review.customerName}</strong>
                  <div className="review-meta-row">
                    <ProductRating rating={review.rating} showValue={false} size="sm" />
                    <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                <span className="review-purchased-badge">Đã mua hàng</span>
              </div>
              <p>{review.comment}</p>
            </article>
          ))
        ) : (
          <p>Chưa có đánh giá cho sản phẩm này.</p>
        )}
      </div>

      <form className="form-list review-form" onSubmit={submit}>
        <h3>Viết đánh giá</h3>
        <div className="field">
          <label htmlFor="review-name">Họ tên</label>
          <input id="review-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="review-phone">Số điện thoại đặt hàng</label>
          <ValidatedPhoneInput id="review-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="review-order-code">Mã đơn hàng</label>
          <input id="review-order-code" value={orderCode} onChange={(event) => setOrderCode(event.target.value)} required />
        </div>
        <div className="field">
          <label>Chọn số sao</label>
          <div className="review-stars-picker" role="group" aria-label="Chọn số sao đánh giá" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={value <= (hoverRating || rating) ? 'is-selected' : ''}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onFocus={() => setHoverRating(value)}
                onBlur={() => setHoverRating(0)}
                aria-label={`${value} sao`}
                aria-pressed={rating === value}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="review-comment">Nội dung nhận xét</label>
          <textarea id="review-comment" rows={4} value={comment} onChange={(event) => setComment(event.target.value)} minLength={3} maxLength={1000} required />
        </div>
        <button className="primary-action" type="submit" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  );
}
