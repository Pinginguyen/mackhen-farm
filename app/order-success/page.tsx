import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { ensureCustomerReferralCode } from '@/lib/referral';
import ReferralShareCard from '@/components/ReferralShareCard';

export const dynamic = 'force-dynamic';

export default async function OrderSuccessPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = searchParams.orderId?.trim() ?? '';
  let orderCode = orderId;
  let referralCode: string | null = null;

  if (orderId) {
    try {
      const order = await prisma.order.findFirst({
        where: { OR: [{ id: orderId }, { orderCode: orderId }] },
        select: { orderCode: true, userId: true },
      });
      if (order) {
        orderCode = order.orderCode;
        const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
        if (session?.userId === order.userId) {
          try {
            referralCode = await ensureCustomerReferralCode(session.userId);
          } catch {
            referralCode = null;
          }
        }
      }
    } catch {
      // Keep the provided identifier available for order lookup if the database is unavailable.
    }
  }

  return (
    <main className="page-shell auth-shell">
      <section className="page-card auth-card">
        <p className="eyebrow">Mắc Khén Farm</p>
        <h1>Thanh toán thành công</h1>
        <p>{orderCode ? `Đơn hàng ${orderCode} đã được ghi nhận thanh toán.` : 'Đơn hàng đã được ghi nhận thanh toán.'} Cảm ơn bạn đã mua sắm tại Mắc Khén Farm.</p>
        {referralCode && <ReferralShareCard referralCode={referralCode} />}
        <div className="hero-actions">
          {orderCode && <Link className="order-success-track-button" href={`/tra-cuu?orderCode=${encodeURIComponent(orderCode)}`}>Theo dõi đơn hàng</Link>}
          <Link className="secondary-action" href="/">Về trang chủ</Link>
        </div>
      </section>
    </main>
  );
}