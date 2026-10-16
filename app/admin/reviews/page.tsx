import { fetchApiWithFallback } from '@/lib/server-api';
import ReviewsManager, { type AdminReview } from './reviews-manager';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const { data, unavailable } = await fetchApiWithFallback<{ items: AdminReview[] }>('/api/admin/reviews', { items: [] });
  return (
    <main className="page-shell">
      <section className="page-card admin-reviews-page">
        <div className="page-title"><div><p className="eyebrow">Chăm sóc người mua</p><h1>Đánh giá khách hàng</h1></div></div>
        {unavailable && <p className="empty-state" role="status">Chưa thể tải danh sách đánh giá.</p>}
        <ReviewsManager initialReviews={data.items} />
      </section>
    </main>
  );
}
