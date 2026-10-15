import Link from 'next/link';
import { cookies } from 'next/headers';

import { fetchApiWithFallback } from '@/lib/server-api';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import CheckoutForm from './checkout-form';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';

export default async function CheckoutPage({ searchParams }: { searchParams?: { mode?: string } }) {
  const buyNow = searchParams?.mode === 'buy_now';
  const cartPath = buyNow ? '/api/cart?buyNow=1' : '/api/cart';
  const { data: cart, unavailable } = await fetchApiWithFallback(cartPath, { items: [] as { id: string; productId: string; productSlug: string; variantId: string | null; name: string; quantity: number; unitPrice: number; total: number }[], subtotal: 0, shipping: 0, total: 0 });
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  let profile = null;
  if (session) {
    try {
      profile = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true, address: true } });
    } catch {
      profile = null;
    }
  }
  const initialCustomer = profile ? { ...profile, phone: profile.phone ?? '', address: profile.address ?? '' } : undefined;
  const freeShippingApplied = cart.subtotal >= FREE_SHIPPING_THRESHOLD;
  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Checkout</p>
            <h2>Thanh toán & giao hàng</h2>
          </div>
        </div>

        <div className="checkout-layout">
          <div>
            {unavailable && <p className="checkout-service-notice" role="status">Chưa tải được giỏ hàng. Đơn chưa thể tạo; hãy thử tải lại trang sau ít phút.</p>}
            <CheckoutForm items={cart.items} initialCustomer={initialCustomer ?? undefined} subtotal={cart.subtotal} shipping={cart.shipping} checkoutUnavailable={unavailable} buyNow={buyNow} />
          </div>

          <aside className="summary-card">
            <h3>Đơn hàng</h3>
            <div className="summary-list">
              {cart.items.map((item) => <div className="item" key={`${item.productId}-${item.variantId}`}><span>{item.name} x{item.quantity}</span><strong>{item.total.toLocaleString('vi-VN')}đ</strong></div>)}
              <div className="item">
                <span>Vận chuyển</span>
                <strong>{freeShippingApplied ? <><del>35.000đ</del> 0đ</> : cart.shipping === 0 && cart.items.length ? 'Miễn phí · 0đ' : `${cart.shipping.toLocaleString('vi-VN')}đ`}</strong>
              </div>
              <div className="item">
                <span>Tạm tính trước mã giảm giá</span>
                <strong>{cart.total.toLocaleString('vi-VN')}đ</strong>
              </div>
            </div>
            {freeShippingApplied && <p className="automatic-shipping-banner" role="status">Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ).</p>}
            {!freeShippingApplied && cart.items.length > 0 && cart.shipping === 0 && <p className="free-shipping-note">Bạn được MIỄN PHÍ VẬN CHUYỂN toàn quốc (0đ).</p>}
            <div className="cart-footer">
              <Link href="/cart" className="secondary-action">
                Quay lại giỏ hàng
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
