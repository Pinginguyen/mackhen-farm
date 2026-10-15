import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatCurrency, type Product } from '@/lib/store-data';
import { FALLBACK_NUTRITION, NUTRITION_MAP } from '@/lib/nutritionData';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';
import AddToCart from './add-to-cart';
import ProductImageGallery from './product-image-gallery';
import ProductRating from '@/components/ProductRating';
import ProductReviewsSection from '@/components/ProductReviewsSection';

type ProductReview = { id: string; customerName: string; rating: number; comment: string; createdAt: string };

function normalizeProductLookup(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  let product: Product | null = null;
  let inactiveInDatabase = false;
  let reviews: ProductReview[] = [];
  try {
    const databaseProduct = await prisma.product.findFirst({
      where: { OR: [{ slug: params.slug }, { id: params.slug }] },
      include: { variants: true, reviews: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (databaseProduct) {
      inactiveInDatabase = !databaseProduct.active;
      product = {
        ...databaseProduct,
        status: databaseProduct.stock > 0 ? 'Còn hàng' : 'Sắp hết',
        variants: databaseProduct.variants.map((variant) => ({
          ...variant,
          status: variant.stock > 0 ? 'Còn hàng' : 'Sắp hết',
        })),
      };
      reviews = databaseProduct.reviews.map((review) => ({ ...review, createdAt: review.createdAt.toISOString() }));
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
                {product.protein && <span className="detail-protein-tag">{product.protein} Protein</span>}
                <span className="pill">{product.highlight}</span>
              </div>
            </div>
            <div className="detail-summary-row">
              <div className="detail-status-badge">{product.stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}</div>
              <span>{product.unit ?? 'Theo quy cách đóng gói'}</span>
              <ProductRating rating={product.rating} size="sm" />
            </div>
            <div className="detail-prices">
              <strong>{formatCurrency(product.price)}</strong>
              {product.originalPrice != null && <del>{formatCurrency(product.originalPrice)}</del>}
            </div>
            <p className="detail-description">{product.description}</p>
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

            <AddToCart productId={product.id} productSlug={product.slug} name={product.name} image={product.image} price={product.price} variants={product.variants} isSeasoning={isSeasoning} />
          </div>
        </div>
      </section>
      <ProductReviewsSection
        productId={product.id}
        initialRating={product.rating}
        initialReviews={reviews}
      />
    </main>
  );
}
