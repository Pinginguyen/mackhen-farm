'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';

import ProductRating from '@/components/ProductRating';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';
import { getErrorMessage } from '@/lib/error-message';

type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function ProductReviewsSection({
  productId,
  productName,
  initialRating,
  initialReviews,
  initialReviewCount,
  initialRatingCounts,
}: {
  productId: string;
  productName: string;
  initialRating: number;
  initialReviews: Review[];
  initialReviewCount: number;
  initialRatingCounts: number[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [reviewCount, setReviewCount] = useState(initialReviewCount);
  const [ratingCounts, setRatingCounts] = useState(initialRatingCounts);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reviewPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('review') !== '1') return;
    setFormOpen(true);
    window.setTimeout(() => document.getElementById('review-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, []);

  useEffect(() => {
    if (reviewPanelRef.current) reviewPanelRef.current.inert = !formOpen;
  }, [formOpen]);

  const averageRating = useMemo(() => {
    const count = ratingCounts.reduce((sum, value) => sum + value, 0);
    if (!count) return initialRating;
    return ratingCounts.reduce((sum, value, index) => sum + value * (index + 1), 0) / count;
  }, [initialRating, ratingCounts]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

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
      const result = await response.json() as { review?: Review; error?: unknown };

      if (!response.ok || !result.review) {
        setMessage(getErrorMessage(result.error, 'Không thể gửi đánh giá.'));
        return;
      }

      const nextReview: Review = {
        ...result.review,
        customerName: result.review.customerName || name.trim() || 'Khách hàng',
        createdAt: result.review.createdAt || new Date().toISOString(),
      };
      setReviews((current) => [nextReview, ...current]);
      setReviewCount((current) => current + 1);
      setRatingCounts((current) => current.map((count, index) => index + 1 === rating ? count + 1 : count));
      setMessage('Cảm ơn bạn! Đánh giá của bạn đã được thêm ngay lập tức.');
      setName('');
      setPhone('');
      setOrderCode('');
      setComment('');
      setRating(5);
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const visibleRatingCount = ratingCounts.reduce((sum, value) => sum + value, 0);
  const ratingLabels: Record<number, string> = { 1: 'Rất thất vọng', 2: 'Chưa hài lòng', 3: 'Bình thường / Tạm ổn', 4: 'Hài lòng', 5: 'Tuyệt vời / Rất thích' };
  return (
    <section className="page-card product-reviews" aria-labelledby="product-reviews-title">
      <header className="reviews-section-heading">
        <p className="eyebrow">Đánh giá khách hàng</p>
        <h2 id="product-reviews-title">Người mua nói gì</h2>
      </header>

      <div className="reviews-layout">
        <aside className="review-summary-panel" aria-label="Tổng quan đánh giá">
          <div className="review-score-row">
            <strong className="review-average-score">{averageRating.toFixed(1)}</strong>
            <div>
              <ProductRating rating={averageRating} showValue={false} />
              <p>Dựa trên {reviewCount} lượt đánh giá từ người mua thực tế</p>
            </div>
          </div>
          <div className="review-breakdown" aria-label="Phân bố số sao">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingCounts[star - 1] ?? 0;
              const percentage = visibleRatingCount ? Math.round((count / visibleRatingCount) * 100) : 0;
              return (
                <div className="review-breakdown-row" key={star}>
                  <span>{star} ★</span>
                  <div className="review-breakdown-track" role="progressbar" aria-label={`${star} sao`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  <small><span>{percentage}%</span><span>{count}</span></small>
                </div>
              );
            })}
          </div>
          <button className="review-write-toggle" type="button" aria-expanded={formOpen} aria-controls="review-form-panel" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? 'Đóng biểu mẫu' : 'Viết đánh giá của bạn'}
          </button>
        </aside>

        <div className="review-content-column">
          <div ref={reviewPanelRef} id="review-form-panel" className={`review-form-panel${formOpen ? ' is-open' : ''}`} aria-hidden={!formOpen}>
            <form className="review-form" onSubmit={submit}>
              <div className="review-form-heading">
                <div><p className="eyebrow">Chia sẻ trải nghiệm</p><h3>Đánh giá sản phẩm</h3></div>
                <span className="review-product-badge">{productName}</span>
              </div>
              <div className="review-form-short-fields">
                <div className="field">
                  <label htmlFor="review-name">Họ và tên</label>
                  <input id="review-name" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="review-phone">Số điện thoại đặt hàng</label>
                  <ValidatedPhoneInput id="review-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
                </div>
              </div>
              <div className="field">
                <label htmlFor="review-order-code">Mã đơn hàng</label>
                <input id="review-order-code" value={orderCode} onChange={(event) => setOrderCode(event.target.value)} placeholder="MKF-123456 · Tra cứu trên phiếu xác nhận đơn" required />
              </div>
              <div className="review-rating-control">
                <div className="review-rating-prompt"><span>Đánh giá của bạn</span><small>{ratingLabels[hoverRating || rating]}</small></div>
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
                    ><Star size={34} strokeWidth={1.8} aria-hidden="true" /></button>
                  ))}
                </div>
              </div>
              <div className="field review-comment-field">
                <label htmlFor="review-comment">Bình luận</label>
                <textarea id="review-comment" rows={4} value={comment} onChange={(event) => setComment(event.target.value)} minLength={10} maxLength={500} required placeholder="Hãy chia sẻ cảm nhận thực tế về hương vị, độ dai ngon và chất lượng đóng gói sản phẩm để giúp các khách hàng khác nhé..." />
                <small>{comment.length}/500 ký tự · Tối thiểu 10 ký tự</small>
              </div>
              <button className="review-submit-button" type="submit" disabled={isSubmitting || comment.trim().length < 10}>
                {isSubmitting && <span className="review-submit-spinner" aria-hidden="true" />}
                {isSubmitting ? 'Đang gửi đánh giá...' : 'Gửi đánh giá'}
              </button>
              {message && <p className="review-submit-message" role="status">{message}</p>}
            </form>
          </div>

          <div className="review-list">
            {reviews.length ? reviews.map((review) => (
              <article className="review-item-card" key={review.id}>
                <header className="review-card-header">
                  <div className="review-avatar" aria-hidden="true">{review.customerName.trim().charAt(0).toUpperCase() || 'K'}</div>
                  <div className="review-user-meta">
                    <strong>{review.customerName}</strong>
                    <span className="review-purchased-badge"><span aria-hidden="true">✓</span> Đã mua hàng tại Mắc Khén Farm</span>
                  </div>
                </header>
                <div className="review-card-rating-row">
                  <ProductRating rating={review.rating} showValue={false} size="sm" />
                  <span aria-hidden="true">·</span>
                  <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</time>
                </div>
                <p className="review-comment-text">{review.comment}</p>
              </article>
            )) : (
              <p className="review-empty-state">Chưa có đánh giá cho sản phẩm này. Hãy là người đầu tiên chia sẻ trải nghiệm.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
