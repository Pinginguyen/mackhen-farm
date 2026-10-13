import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ApiRequestError, fetchApi } from '@/lib/server-api';
import { formatCurrency, type Product } from '@/lib/store-data';
import AddToCart from './add-to-cart';
import ReviewForm from './review-form';

type ProductReview = { id: string; customerName: string; rating: number; comment: string; createdAt: string };

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  let product: (Product & { reviews?: ProductReview[] }) | undefined;
  let unavailable = false;
  try {
    ({ product } = await fetchApi<{ product: Product & { reviews?: ProductReview[] } }>(`/api/products/${encodeURIComponent(params.slug)}`));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status !== 404) unavailable = true;
    else notFound();
  }

  if (unavailable) {
    return <main className="page-shell"><p className="empty-state" role="status">Không thể tải sản phẩm vì cơ sở dữ liệu hiện không khả dụng.</p><Link href="/products" className="secondary-action">Quay lại sản phẩm</Link></main>;
  }
  if (!product) notFound();

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-badge">M</span>
          <div>
            <p className="eyebrow">Mắc Khén Farm - Nông sản sấy vị Tây Bắc</p>
            <h1>Mắc Khén Farm</h1>
          </div>
        </div>
        <nav className="main-nav" aria-label="Menu chính">
          <Link href="/">Trang chủ</Link>
          <Link href="/products">Sản phẩm</Link>
          <Link href="/cart">Giỏ hàng</Link>
          <Link href="/checkout">Thanh toán</Link>
        </nav>
      </header>

      <section className="detail-section">
        <div className="detail-grid">
          <div className="detail-media">
            <img src={product.image} alt={product.name} />
          </div>
          <div className="detail-copy">
            <span className="pill">{product.highlight}</span>
            <p className="eyebrow">{product.category}</p>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <div className="nutrition-row">
              <div><span>Đạm thực vật</span><strong>{product.protein ? `${product.protein}g` : 'Chưa công bố'}</strong></div>
              <div><span>Năng lượng</span><strong>{product.calories ? `${product.calories} kcal` : 'Chưa công bố'}</strong></div>
              <div><span>Khối lượng</span><strong>{product.weight ? `${product.weight}g` : product.unit}</strong></div>
            </div>

            <div className="variant-list">
              {product.variants.map((variant) => (
                <div key={variant.label} className="variant-pill">
                  <strong>{variant.label}</strong>
                  <span>{variant.weight}</span>
                  <div>{formatCurrency(variant.price)}</div>
                </div>
              ))}
            </div>

            <div className="inline-actions">
              <AddToCart productId={product.id} variants={product.variants} />
              <Link href="/products" className="secondary-action">
                Tiếp tục mua
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="page-card product-reviews">
        <div className="section-heading"><div><p className="eyebrow">Đánh giá khách hàng</p><h2>{product.rating.toFixed(1)} / 5</h2></div></div>
        {product.reviews?.length ? <div className="story-grid">{product.reviews.map((review) => <article className="story-item" key={review.id}><strong>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong><p>{review.comment}</p><span>{review.customerName}</span></article>)}</div> : <p>Chưa có đánh giá cho sản phẩm này.</p>}
        <ReviewForm productId={product.id} />
      </section>
    </main>
  );
}
