import Link from 'next/link';
import { cookies } from 'next/headers';

import { fetchApiWithFallback } from '@/lib/server-api';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import CheckoutForm from './checkout-form';
import Header from '@/components/layout/Header';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';

export default async function CheckoutPage() {
  const { data: cart, unavailable } = await fetchApiWithFallback('/api/cart', { items: [] as { productId: string; productSlug: string; variantId: string | null; name: string; quantity: number; total: number }[], subtotal: 0, shipping: 0, total: 0 });
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  const profile = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true, address: true } }) : null;
  const initialCustomer = profile ? { ...profile, phone: profile.phone ?? '', address: profile.address ?? '' } : undefined;
  const freeShippingApplied = cart.subtotal >= FREE_SHIPPING_THRESHOLD;
  return (
    <main className="page-shell">
      <Header />

      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Checkout</p>
            <h2>Thanh toán & giao hàng</h2>
          </div>
        </div>

        <div className="checkout-layout">
          <div>
            {unavailable && <p className="empty-state" role="status">Không thể tải giỏ hàng vì cơ sở dữ liệu hiện không khả dụng.</p>}
            <CheckoutForm items={cart.items} initialCustomer={initialCustomer ?? undefined} subtotal={cart.subtotal} shipping={cart.shipping} />
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
                <span>Thành tiền</span>
                <strong>{cart.total.toLocaleString('vi-VN')}đ</strong>
              </div>
            </div>
            {freeShippingApplied && <p className="automatic-shipping-banner" role="status">Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ).</p>}
            {!freeShippingApplied && cart.items.length > 0 && cart.shipping === 0 && <p className="free-shipping-note">Bạn được MIỄN PHÍ VẬN CHUYỂN toàn quốc (0đ).</p>}
            <div className="cart-footer">
              <Link href="/cart" className="secondary-action">
                Quay lại giỏ hàng
              </Link>
              <span className="primary-action">{cart.items.length ? 'Nhập thông tin để xác nhận' : 'Giỏ hàng đang trống'}</span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
