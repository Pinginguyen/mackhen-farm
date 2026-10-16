import Link from 'next/link';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { readCartSnapshot } from '@/lib/cart-server';
import CheckoutForm, { BuyNowCartRecovery } from './checkout-form';
import CheckoutEmptyState from '@/components/CheckoutEmptyState';
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
  const orderSummary = <>
    <h3>Đơn hàng</h3>
    <div className="summary-list">
      {cart.items.map((item) => <div className="item" key={`${item.productId}-${item.variantId ?? 'single'}`}><span>{item.name ?? 'Sản phẩm'} x{item.quantity ?? 1}</span><strong>{(item.total ?? 0).toLocaleString('vi-VN')}đ</strong></div>)}
      <div className="item"><span>Vận chuyển</span><strong>{freeShippingApplied ? <><del>35.000đ</del> 0đ</> : cart.shipping === 0 ? 'Miễn phí · 0đ' : `${cart.shipping.toLocaleString('vi-VN')}đ`}</strong></div>
      <div className="item"><span>Tạm tính trước mã giảm giá</span><strong>{cart.total.toLocaleString('vi-VN')}đ</strong></div>
    </div>
    {freeShippingApplied && <p className="automatic-shipping-banner" role="status">Hệ thống đã tự động chọn ưu đãi tốt nhất: Miễn phí vận chuyển toàn quốc (-35.000đ).</p>}
    {!freeShippingApplied && cart.shipping === 0 && <p className="free-shipping-note">Bạn được MIỄN PHÍ VẬN CHUYỂN toàn quốc (0đ).</p>}
    <div className="cart-footer"><Link href="/cart" className="secondary-action">Quay lại giỏ hàng</Link></div>
  </>;
  return (
    <main className="page-shell checkout-page">
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Checkout</p>
            <h2>Thanh toán & giao hàng</h2>
          </div>
        </div>

        {buyNow && <BuyNowCartRecovery items={cart.items} />}
        <div className={`checkout-layout${cart.unavailable || cart.items.length === 0 ? ' is-empty' : ''}`}>
          <div>
            {cart.unavailable || cart.items.length === 0 ? (
              <CheckoutEmptyState unavailable={cart.unavailable} buyNow={buyNow} />
            ) : (
              <CheckoutForm items={cart.items} initialCustomer={initialCustomer ?? undefined} subtotal={cart.subtotal} shipping={cart.shipping} buyNow={buyNow} initialPaymentMethod={searchParams?.paymentMethod === 'COD' ? 'COD' : 'VIETQR'} mobileSummary={orderSummary} />
            )}
          </div>

          {!cart.unavailable && cart.items.length > 0 && <aside className="summary-card checkout-desktop-summary">{orderSummary}</aside>}
        </div>
      </section>
    </main>
  );
}
