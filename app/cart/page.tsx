import { readCartSnapshot } from '@/lib/cart-server';
import CartContent from './cart-content';

export default async function CartPage() {
  const cart = await readCartSnapshot();
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
