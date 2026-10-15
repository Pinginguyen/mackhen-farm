import { fetchApiWithFallback } from '@/lib/server-api';
import CartContent from './cart-content';

export default async function CartPage() {
  const { data: cart } = await fetchApiWithFallback('/api/cart', { items: [] as { id: string; productId: string; productSlug: string; name: string; image: string; quantity: number; unitPrice: number; total: number; stock: number; variantId: string | null; variantLabel: string | null; variants: { id: string; label: string; price: number; weight: string; stock: number }[] }[], subtotal: 0, shipping: 0, total: 0 });
  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Giỏ hàng</p>
            <h2>Đơn hàng của bạn</h2>
          </div>
        </div>

        <CartContent initialItems={cart.items} />
      </section>
    </main>
  );
}
