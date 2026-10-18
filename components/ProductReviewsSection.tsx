'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, Star, Store } from 'lucide-react';

import ProductRating from '@/components/ProductRating';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';
import { getErrorMessage } from '@/lib/error-message';

type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  adminReply: string | null;
  adminReplyAt: string | null;
  replies: ReviewReply[];
};

type ReviewReply = { id: string; authorName: string; authorRole: string; content: string; createdAt: string };

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [threadReplyOpen, setThreadReplyOpen] = useState<string | null>(null);
  const [adminReplyOpen, setAdminReplyOpen] = useState<string | null>(null);
  const [adminReplyDraft, setAdminReplyDraft] = useState('');
  const [pendingReply, setPendingReply] = useState<string | null>(null);
  const reviewPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result: { user?: { role?: string } | null }) => { if (active) setIsAdmin(result.user?.role === 'ADMIN'); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('review') !== '1') return;
    setOrderCode(searchParams.get('orderCode') ?? '');
    setPhone(searchParams.get('phone') ?? '');
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

  async function submitThreadReply(event: React.FormEvent<HTMLFormElement>, reviewId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPendingReply(reviewId);
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/replies`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ authorName: form.get('authorName'), content: form.get('content') }),
      });
      const result = await response.json() as { reply?: ReviewReply; error?: unknown };
      if (!response.ok || !result.reply) {
        setMessage(getErrorMessage(result.error, 'Không thể gửi bình luận.'));
        return;
      }
      setReviews((current) => current.map((review) => review.id === reviewId ? { ...review, replies: [...review.replies, result.reply!] } : review));
      setThreadReplyOpen(null);
      setMessage('Bình luận của bạn đã được thêm.');
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setPendingReply(null);
    }
  }

  async function saveAdminReply(reviewId: string, value: string) {
    setPendingReply(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}/reply`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminReply: value }),
      });
      const result = await response.json() as { item?: { adminReply: string | null; adminReplyAt: string | null }; error?: unknown };
      if (!response.ok || !result.item) {
        setMessage(getErrorMessage(result.error, 'Không thể lưu phản hồi của shop.'));
        return;
      }
      setReviews((current) => current.map((review) => review.id === reviewId ? { ...review, ...result.item } : review));
      setAdminReplyOpen(null);
      setAdminReplyDraft('');
      setMessage(value.trim() ? 'Đã lưu phản hồi của shop.' : 'Đã xóa phản hồi của shop.');
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setPendingReply(null);
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
            <strong className="review-average-score whitespace-nowrap shrink-0">{averageRating.toFixed(1)}</strong>
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
                {review.adminReply && <div className="review-merchant-reply">
                  <header><Store size={15} aria-hidden="true" /><strong>Phản hồi từ Mắc Khén Farm</strong><time dateTime={review.adminReplyAt ?? undefined}>{review.adminReplyAt ? new Date(review.adminReplyAt).toLocaleString('vi-VN') : ''}</time></header>
                  <p>{review.adminReply}</p>
                </div>}
                {isAdmin && <button type="button" className="review-admin-reply-toggle" onClick={() => { setAdminReplyDraft(review.adminReply ?? ''); setAdminReplyOpen(adminReplyOpen === review.id ? null : review.id); }}>
                  <MessageCircle size={14} aria-hidden="true" /> {review.adminReply ? 'Phản hồi / Sửa phản hồi' : 'Phản hồi'}
                </button>}
                {isAdmin && adminReplyOpen === review.id && <form className="review-admin-reply-form" onSubmit={(event) => { event.preventDefault(); void saveAdminReply(review.id, adminReplyDraft); }}>
                  <label htmlFor={`merchant-reply-${review.id}`}>Phản hồi chính thức của shop</label>
                  <textarea id={`merchant-reply-${review.id}`} rows={3} maxLength={2000} value={adminReplyDraft} onChange={(event) => setAdminReplyDraft(event.target.value)} />
                  <div><button type="submit" disabled={pendingReply === review.id || !adminReplyDraft.trim()}><Send size={14} />{pendingReply === review.id ? 'Đang lưu...' : 'Gửi phản hồi'}</button>{review.adminReply && <button type="button" className="review-admin-reply-clear" disabled={pendingReply === review.id} onClick={() => void saveAdminReply(review.id, '')}>Xóa phản hồi</button>}</div>
                </form>}
                {!!review.replies.length && <div className="review-thread-replies">
                  {review.replies.map((reply) => <article className={reply.authorRole === 'ADMIN' ? 'is-admin-reply' : ''} key={reply.id}>
                    <header>{reply.authorRole === 'ADMIN' && <Store size={14} aria-hidden="true" />}<strong>{reply.authorRole === 'ADMIN' ? 'Mắc Khén Farm' : reply.authorName}</strong><time dateTime={reply.createdAt}>{new Date(reply.createdAt).toLocaleString('vi-VN')}</time></header>
                    <p>{reply.content}</p>
                  </article>)}
                </div>}
                <button type="button" className="review-thread-toggle" onClick={() => setThreadReplyOpen(threadReplyOpen === review.id ? null : review.id)}><MessageCircle size={14} />{threadReplyOpen === review.id ? 'Đóng thảo luận' : `Trả lời (${review.replies.length})`}</button>
                {threadReplyOpen === review.id && <form className="review-thread-form" onSubmit={(event) => void submitThreadReply(event, review.id)}>
                  <label>Tên hiển thị<input name="authorName" maxLength={100} required placeholder="Tên của bạn" /></label>
                  <label>Thảo luận<textarea name="content" rows={3} maxLength={1000} required placeholder="Hỏi thêm hoặc chia sẻ với người mua khác..." /></label>
                  <button type="submit" disabled={pendingReply === review.id}>{pendingReply === review.id ? 'Đang gửi...' : 'Gửi bình luận'}</button>
                </form>}
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
