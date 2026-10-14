import Link from 'next/link';

import { fetchApiWithFallback } from '@/lib/server-api';
import { formatCurrency } from '@/lib/store-data';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import Header from '@/components/layout/Header';
import CartItems from './cart-items';

export default async function CartPage() {
  const { data: cart, unavailable } = await fetchApiWithFallback('/api/cart', { items: [] as { id: string; name: string; image: string; quantity: number; total: number; stock: number; variantId: string | null; variantLabel: string | null; variants: { id: string; label: string; price: number; weight: string; stock: number }[] }[], subtotal: 0, shipping: 0, total: 0 });
  const freeShipping = cart.items.length > 0 && cart.shipping === 0;
  const progress = Math.min(100, Math.round((cart.subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subtotal);
  const freeShippingApplied = cart.subtotal >= FREE_SHIPPING_THRESHOLD;
  return (
    <main className="page-shell">
      <Header />

      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Giỏ hàng</p>
            <h2>Đơn hàng của bạn</h2>
          </div>
        </div>

        <div className="checkout-layout">
          {unavailable && <p className="empty-state" role="status">Không thể tải giỏ hàng vì cơ sở dữ liệu hiện không khả dụng.</p>}
          <div>
            {cart.items.length > 0 && <section className={`free-shipping-progress${freeShipping ? ' is-free' : ''}`} aria-live="polite"><p>{freeShipping ? 'Chúc mừng bạn đã được FREESHIP toàn quốc!' : `Mua thêm ${formatCurrency(remaining)} để được MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC`}</p><div className="free-shipping-track" role="progressbar" aria-label="Tiến trình đạt miễn phí vận chuyển" aria-valuemin={0} aria-valuemax={FREE_SHIPPING_THRESHOLD} aria-valuenow={Math.min(cart.subtotal, FREE_SHIPPING_THRESHOLD)}><span style={{ width: `${progress}%` }} /></div><small>{formatCurrency(Math.min(cart.subtotal, FREE_SHIPPING_THRESHOLD))} / {formatCurrency(FREE_SHIPPING_THRESHOLD)}</small></section>}
            {cart.items.length ? <CartItems items={cart.items} /> : <p className="empty-state">Giỏ hàng của bạn đang trống.</p>}
          </div>

          <aside className="summary-card">
            <h3>Tổng thanh toán</h3>
            <div className="summary-list">
              <div className="item">
                <span>Tạm tính</span>
                <strong>{formatCurrency(cart.subtotal)}</strong>
              </div>
              <div className="item">
                <span>Vận chuyển</span>
                <strong>{freeShippingApplied ? <><del>{formatCurrency(35000)}</del> 0đ</> : cart.items.length && cart.shipping === 0 ? 'Miễn phí · 0đ' : formatCurrency(cart.shipping)}</strong>
              </div>
              <div className="item">
                <span>Thành tiền</span>
                <strong>{formatCurrency(cart.total)}</strong>
              </div>
            </div>
            {freeShippingApplied && <p className="automatic-shipping-banner" role="status">Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ).</p>}
            {!freeShippingApplied && cart.items.length > 0 && cart.shipping === 0 && <p className="free-shipping-note">Bạn được MIỄN PHÍ VẬN CHUYỂN toàn quốc (0đ).</p>}
            <div className="cart-footer">
              <Link href="/products" className="secondary-action">
                Tiếp tục mua
              </Link>
              <Link href="/checkout" aria-disabled={!cart.items.length} className="primary-action">
                Thanh toán
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
