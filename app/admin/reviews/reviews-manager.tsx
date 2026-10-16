'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, Star } from 'lucide-react';

export type AdminReview = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  adminReply: string | null;
  adminReplyAt: string | null;
  product: { id: string; slug: string; name: string };
  order: { orderCode: string; phone: string } | null;
};

const filters = [
  { value: 'all', label: 'Tất cả' },
  { value: '5', label: '5 sao' },
  { value: 'low', label: '1–2 sao cần xử lý' },
];

export default function ReviewsManager({ initialReviews }: { initialReviews: AdminReview[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const visibleReviews = reviews.filter((review) => filter === 'all' || (filter === '5' ? review.rating === 5 : review.rating <= 2));

  async function saveReply(review: AdminReview, content: string) {
    setPending(review.id);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(review.id)}/reply`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminReply: content }),
      });
      const result = await response.json() as { item?: { adminReply: string | null; adminReplyAt: string | null }; error?: { message?: string } };
      if (!response.ok || !result.item) {
        setMessage(result.error?.message ?? 'Không thể lưu phản hồi.');
        return;
      }
      setReviews((current) => current.map((item) => item.id === review.id ? { ...item, ...result.item } : item));
      setOpenId(null);
      setMessage(content.trim() ? 'Đã lưu phản hồi.' : 'Đã xóa phản hồi.');
    } catch {
      setMessage('Không thể kết nối để gửi phản hồi.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="admin-reviews-manager" aria-label="Quản lý đánh giá">
      <div className="admin-review-filters" role="tablist" aria-label="Lọc đánh giá">
        {filters.map((item) => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? 'is-active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}
      </div>
      {message && <p className="admin-review-message" role="status">{message}</p>}
      <div className="admin-review-list">
        {visibleReviews.map((review) => <article className="admin-review-card" key={review.id}>
          <header><div><strong>{review.customerName}</strong><small>{review.order?.phone ?? 'Không có SĐT'} · {new Date(review.createdAt).toLocaleString('vi-VN')}</small></div><span className={`admin-review-status${review.adminReply ? ' is-replied' : ''}`}>{review.adminReply ? 'Đã phản hồi' : 'Chưa phản hồi'}</span></header>
          <div className="admin-review-product"><Link href={`/products/${encodeURIComponent(review.product.slug)}`}>{review.product.name}</Link><span>{review.order?.orderCode ?? 'Đánh giá sản phẩm'}</span></div>
          <p className="admin-review-rating" aria-label={`${review.rating} sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < review.rating ? 'currentColor' : 'none'} />)}<strong>{review.rating}/5</strong></p>
          <p className="admin-review-comment">{review.comment}</p>
          {review.adminReply && <blockquote>{review.adminReply}<small>{review.adminReplyAt ? new Date(review.adminReplyAt).toLocaleString('vi-VN') : ''}</small></blockquote>}
          <button type="button" className="admin-review-reply-button" onClick={() => { setDraft(review.adminReply ?? ''); setOpenId(openId === review.id ? null : review.id); }}><MessageCircle size={15} />{review.adminReply ? 'Sửa phản hồi' : 'Phản hồi'}</button>
          {openId === review.id && <form className="admin-review-reply-editor" onSubmit={(event) => { event.preventDefault(); void saveReply(review, draft); }}>
            <label htmlFor={`admin-review-reply-${review.id}`}>Phản hồi từ Mắc Khén Farm</label>
            <textarea id={`admin-review-reply-${review.id}`} rows={3} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} />
            <div><button type="submit" disabled={pending === review.id || !draft.trim()}>{pending === review.id ? 'Đang gửi...' : 'Gửi phản hồi'}</button>{review.adminReply && <button type="button" className="is-secondary" disabled={pending === review.id} onClick={() => void saveReply(review, '')}>Xóa phản hồi</button>}</div>
          </form>}
        </article>)}
        {!visibleReviews.length && <p className="empty-state">Không có đánh giá trong bộ lọc này.</p>}
      </div>
    </section>
  );
}
