import Link from 'next/link';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { readCartSnapshot } from '@/lib/cart-server';
import CheckoutForm, { BuyNowCartRecovery } from './checkout-form';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';

export default async function CheckoutPage({ searchParams }: { searchParams?: { mode?: string; paymentMethod?: string } }) {
  const buyNow = searchParams?.mode === 'buy_now';
  const cart = await readCartSnapshot({ buyNow });
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

        {buyNow && <BuyNowCartRecovery items={cart.items} />}
        <div className="checkout-layout">
          <div>
            {cart.unavailable || cart.items.length === 0 ? (
              <div className="checkout-empty-state">
                <p className={cart.unavailable ? 'checkout-service-notice' : 'empty-state'} role="status">
                  {cart.unavailable
                    ? 'Chưa tải được giỏ hàng. Đơn chưa được tạo; hãy thử tải lại sau ít phút.'
                    : buyNow
                      ? 'Đang kiểm tra và đồng bộ phiên Mua ngay. Nếu vẫn chưa có sản phẩm, hãy quay lại chọn sản phẩm.'
                      : 'Giỏ hàng hiện chưa có sản phẩm nên chưa thể tạo đơn.'}
                </p>
                <div className="cart-footer">
                  <Link href="/products" className="primary-action">Quay lại mua sắm</Link>
                  <Link href="/cart" className="secondary-action">Mở giỏ hàng</Link>
                  <Link href="/tra-cuu" className="secondary-action">Tra cứu đơn hàng</Link>
                </div>
                <button className="primary-action" type="button" disabled aria-disabled="true">Không thể đặt đơn hàng trống</button>
              </div>
            ) : (
              <CheckoutForm items={cart.items} initialCustomer={initialCustomer ?? undefined} subtotal={cart.subtotal} shipping={cart.shipping} buyNow={buyNow} initialPaymentMethod={searchParams?.paymentMethod === 'COD' ? 'COD' : 'VIETQR'} />
            )}
          </div>

          <aside className="summary-card">
            <h3>Đơn hàng</h3>
            {!Array.isArray(cart.items) || cart.items.length === 0 ? (
              <div className="summary-list">
                <div className="item"><span>Chưa có sản phẩm nào trong đơn hàng.</span><strong>0đ</strong></div>
                <Link href="/products" className="primary-action">Quay lại mua sắm</Link>
              </div>
            ) : (
              <>
                <div className="summary-list">
                  {cart.items.map((item) => <div className="item" key={`${item.productId}-${item.variantId ?? 'single'}`}><span>{item.name ?? 'Sản phẩm'} x{item.quantity ?? 1}</span><strong>{(item.total ?? 0).toLocaleString('vi-VN')}đ</strong></div>)}
                  <div className="item">
                    <span>Vận chuyển</span>
                    <strong>{freeShippingApplied ? <><del>35.000đ</del> 0đ</> : cart.shipping === 0 ? 'Miễn phí · 0đ' : `${cart.shipping.toLocaleString('vi-VN')}đ`}</strong>
                  </div>
                  <div className="item">
                    <span>Tạm tính trước mã giảm giá</span>
                    <strong>{cart.total.toLocaleString('vi-VN')}đ</strong>
                  </div>
                </div>
                {freeShippingApplied && <p className="automatic-shipping-banner" role="status">Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ).</p>}
                {!freeShippingApplied && cart.shipping === 0 && <p className="free-shipping-note">Bạn được MIỄN PHÍ VẬN CHUYỂN toàn quốc (0đ).</p>}
                <div className="cart-footer">
                  <Link href="/cart" className="secondary-action">Quay lại giỏ hàng</Link>
                </div>
              </>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
