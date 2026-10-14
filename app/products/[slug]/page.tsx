import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiRequestError, fetchApi } from '@/lib/server-api';
import { formatCurrency, type Product } from '@/lib/store-data';
import { FALLBACK_NUTRITION, NUTRITION_MAP } from '@/lib/nutritionData';
import AddToCart from './add-to-cart';
import ReviewForm from './review-form';
import Header from '@/components/layout/Header';

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

  const isSeasoning = product.category === 'Gia vị Tây Bắc';
  const nutrition = NUTRITION_MAP[product.slug] ?? FALLBACK_NUTRITION;
  const isLongShelfLifeSpice = ['hat-mac-khen-rung-sao-kho-son-la', 'hat-doi-rung-nep-thuong-hang', 'muoi-cham-cheo-hat-doi-rang-kho'].includes(product.slug);
  const ingredientSummary = isSeasoning
    ? product.slug === 'cham-cheo-uot-chuan-vi-dien-bien'
      ? 'Chẳm chéo ướt theo công thức Điện Biên; xem thành phần chi tiết trên nhãn sản phẩm.'
      : product.slug === 'hat-mac-khen-rung-sao-kho-son-la'
        ? 'Hạt mắc khén rừng sao khô Sơn La.'
        : product.slug === 'hat-doi-rung-nep-thuong-hang'
          ? 'Hạt dổi rừng nếp tuyển chọn.'
          : 'Muối chẳm chéo và hạt dổi rang khô.'
    : 'Phụ phẩm bã đậu nành upcycled, bột củ năng, hạt mắc khén, hạt dổi nướng và mật mía tự nhiên.';

  return (
    <main className="page-shell">
      <Header />

      <section className="detail-section">
        <div className="detail-grid">
          <div className="detail-gallery">
            <div className="detail-media">
              <img src={product.image} alt={product.name} />
            </div>
            {(product.images ?? []).filter((image) => image !== product.image).map((image, index) => (
              <div className="detail-gallery-thumb" key={`${image}-${index}`}>
                <img src={image} alt={`${product.name} - ảnh ${index + 2}`} />
              </div>
            ))}
          </div>
          <div className="detail-copy">
            <span className="pill">{product.highlight}</span>
            <p className="eyebrow">{product.category}</p>
            <h1>{product.name}</h1>
            <div className="detail-prices">
              <strong>{formatCurrency(product.price)}</strong>
              {product.originalPrice != null && <del>{formatCurrency(product.originalPrice)}</del>}
            </div>
            <p>{product.description}</p>
            <div className="product-details-grid">
              <section className="product-info-block nutrition-facts">
                <h2>Bảng giá trị dinh dưỡng</h2>
                <p>Trên 100g</p>
                <table>
                  <tbody>
                    <tr><th>Năng lượng</th><td>{nutrition.calories}</td></tr>
                    <tr><th>Đạm thực vật</th><td>{nutrition.protein}</td></tr>
                    <tr><th>Chất béo (Lipid)</th><td>{nutrition.fat}</td></tr>
                    <tr><th>Cholesterol</th><td>{nutrition.cholesterol}</td></tr>
                    <tr><th>Chất xơ tiêu hóa</th><td>{nutrition.fiber}</td></tr>
                    <tr><th>Carbohydrate</th><td>{nutrition.carbs}</td></tr>
                    <tr><th>Natri</th><td>{nutrition.sodium}</td></tr>
                  </tbody>
                </table>
              </section>
              <section className="product-info-block">
                <h2>Thành phần &amp; nguồn gốc nguyên liệu</h2>
                <p>{ingredientSummary}</p>
                {!isSeasoning && <p>Không sử dụng chất bảo quản hóa học tổng hợp hoặc mỡ động vật.</p>}
              </section>
              <section className="product-info-block">
                <h2>Quy chuẩn đóng gói &amp; bảo quản</h2>
                <p>Quy cách: {product.unit ?? 'Theo thông tin trên bao bì'}.</p>
                {!isSeasoning && <p>Túi zip tráng màng nhôm 3 lớp cản sáng, kèm gói khử oxy chuyên dụng.</p>}
                <p>Hạn sử dụng: {isLongShelfLifeSpice ? '12 tháng với gia vị hạt, khi bảo quản đúng cách.' : '6 tháng ở nhiệt độ thường, khi bảo quản đúng cách.'}</p>
                <p>{isSeasoning ? 'Dùng làm gia vị chấm hoặc nêm món ăn; đóng kín bao bì sau khi mở.' : 'Mở túi dùng trực tiếp; ngon hơn khi thêm vài giọt chanh hoặc chấm chẳm chéo. Kéo kín miệng zip sau khi mở.'}</p>
              </section>
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
