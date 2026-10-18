import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { normalizeNutritionFacts, type Product } from '@/lib/store-data';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import AddToCart from './add-to-cart';
import ProductImageGallery from './product-image-gallery';
import ProductRating from '@/components/ProductRating';
import ProductReviewsSection from '@/components/ProductReviewsSection';
import ProductHighlights from '@/components/ProductHighlights';

type ProductReview = { id: string; customerName: string; rating: number; comment: string; createdAt: string; adminReply: string | null; adminReplyAt: string | null; replies: { id: string; authorName: string; authorRole: string; content: string; createdAt: string }[] };

function normalizeProductLookup(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  let product: Product | null = null;
  let inactiveInDatabase = false;
  let reviews: ProductReview[] = [];
  let reviewCount = 0;
  let ratingCounts = [0, 0, 0, 0, 0];
  try {
    const databaseProduct = await prisma.product.findFirst({
      where: { OR: [{ slug: params.slug }, { id: params.slug }] },
      include: { variants: true, reviews: { orderBy: { createdAt: 'desc' }, take: 20, include: { replies: { orderBy: { createdAt: 'asc' }, select: { id: true, authorName: true, authorRole: true, content: true, createdAt: true } } } } },
    });
    if (databaseProduct) {
      inactiveInDatabase = !databaseProduct.active;
      product = {
        ...databaseProduct,
        highlights: databaseProduct.highlights ?? [],
        nutritionFacts: normalizeNutritionFacts(databaseProduct.nutritionFacts),
        status: databaseProduct.stock > 0 ? 'Còn hàng' : 'Sắp hết',
        variants: databaseProduct.variants.map((variant) => ({
          ...variant,
          label: variant.title,
          stock: variant.inventory,
          status: variant.inventory > 0 ? 'Còn hàng' : 'Sắp hết',
        })),
      };
      reviews = databaseProduct.reviews.map((review) => ({
        id: review.id,
        customerName: review.customerName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        adminReply: review.adminReply,
        adminReplyAt: review.adminReplyAt?.toISOString() ?? null,
        replies: review.replies.map((reply) => ({ ...reply, createdAt: reply.createdAt.toISOString() })),
      }));
      try {
        const ratingGroups = await prisma.review.groupBy({
          by: ['rating'],
          where: { productId: databaseProduct.id },
          _count: { _all: true },
        });
        ratingGroups.forEach((group) => {
          ratingCounts[group.rating - 1] = group._count._all;
          reviewCount += group._count._all;
        });
      } catch {
        reviewCount = reviews.length;
        ratingCounts = [1, 2, 3, 4, 5].map((rating) => reviews.filter((review) => review.rating === rating).length);
      }
    }
  } catch {
    console.warn('Không kết nối được DB, dùng dữ liệu chi tiết sản phẩm mặc định');
  }

  if (inactiveInDatabase) notFound();
  if (!product) {
    const lookup = normalizeProductLookup(params.slug);
    const fallback = DEFAULT_PRODUCTS.find((item) => item.slug === params.slug || item.id === params.slug || normalizeProductLookup(item.name) === lookup);
    if (!fallback) notFound();
    product = {
      ...fallback,
      status: fallback.stock > 0 ? 'Còn hàng' : 'Sắp hết',
      variants: [],
    };
  }

  const isSeasoning = product.category === 'Gia vị Tây Bắc';
  const isLongShelfLifeSpice = ['hat-mac-khen-rung-sao-kho-son-la', 'hat-doi-rung-nep-thuong-hang', 'muoi-cham-cheo-hat-doi-rang-kho'].includes(product.slug);
  return (
    <main className="page-shell product-detail-page">
      <section className="detail-section">
        <div className="detail-grid">
          <ProductImageGallery image={product.image} images={product.images ?? []} name={product.name} />
          <div className="detail-copy">
            <div className="detail-header-row">
              <div className="detail-title-stack">
                <h1>{product.name}</h1>
              </div>
              <div className="detail-header-tags">
                <span className="pill">{product.category}</span>
                {product.badge?.trim() && <span className="product-highlight-badge">{product.badge}</span>}
                {product.protein && <span className="detail-protein-tag">{product.protein} Protein</span>}
                <span className="pill">{product.highlight}</span>
              </div>
            </div>
            <div className="detail-summary-row">
              <div className="detail-status-badge">{product.stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}</div>
              <span>{product.unit ?? 'Theo quy cách đóng gói'}</span>
              <ProductRating rating={product.rating} size="sm" />
            </div>
            <AddToCart productId={product.id} productSlug={product.slug} name={product.name} image={product.image} price={product.price} originalPrice={product.originalPrice} unit={product.unit} variants={product.variants} />
            <p className="detail-description">{product.description}</p>
            <div className="product-details-grid">
              {product.nutritionFacts?.enabled && <section className="product-info-block nutrition-facts">
                <h2>Bảng giá trị dinh dưỡng</h2>
                <p>{product.nutritionFacts.servingSize}</p>
                <div className="mobile-table-scroll w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table>
                  <tbody>
                    <tr><th>Năng lượng</th><td>{product.nutritionFacts.calories}</td></tr>
                    <tr><th>Đạm thực vật</th><td>{product.nutritionFacts.protein}</td></tr>
                    <tr><th>Chất béo (Lipid)</th><td>{product.nutritionFacts.fat}</td></tr>
                    <tr><th>Cholesterol</th><td>{product.nutritionFacts.cholesterol}</td></tr>
                    <tr><th>Chất xơ (Fiber)</th><td>{product.nutritionFacts.fiber}</td></tr>
                    <tr><th>Carbohydrate</th><td>{product.nutritionFacts.carbohydrates}</td></tr>
                    <tr><th>Natri (Sodium)</th><td>{product.nutritionFacts.sodium}</td></tr>
                  </tbody>
                </table>
                </div>
              </section>}
              {product.ingredients?.trim() && <section className="product-info-block">
                <h2>Thành phần &amp; nguồn gốc nguyên liệu</h2>
                <p className="whitespace-pre-line">{product.ingredients.trim()}</p>
              </section>}
              <section className="product-info-block">
                <h2>Quy chuẩn đóng gói &amp; bảo quản</h2>
                <p>Quy cách: {product.unit ?? 'Theo thông tin trên bao bì'}.</p>
                {!isSeasoning && <p>Túi zip tráng màng nhôm 3 lớp cản sáng, kèm gói khử oxy chuyên dụng.</p>}
                <p>Hạn sử dụng: {isLongShelfLifeSpice ? '12 tháng với gia vị hạt, khi bảo quản đúng cách.' : '6 tháng ở nhiệt độ thường, khi bảo quản đúng cách.'}</p>
                <p>{isSeasoning ? 'Dùng làm gia vị chấm hoặc nêm món ăn; đóng kín bao bì sau khi mở.' : 'Mở túi dùng trực tiếp; ngon hơn khi thêm vài giọt chanh hoặc chấm chẳm chéo. Kéo kín miệng zip sau khi mở.'}</p>
              </section>
            </div>

            <ProductHighlights highlights={product.highlights} />
          </div>
        </div>
      </section>
      <ProductReviewsSection
        productId={product.id}
        productName={product.name}
        initialRating={product.rating}
        initialReviews={reviews}
        initialReviewCount={reviewCount}
        initialRatingCounts={ratingCounts}
      />
    </main>
  );
}
