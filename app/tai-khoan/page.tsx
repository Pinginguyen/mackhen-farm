import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import AccountDashboard from './account-dashboard';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) redirect('/dang-nhap?callbackUrl=%2Ftai-khoan');

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true, address: true, loyaltyPoints: true, lifetimePoints: true, membershipTier: true } });
  if (!user) redirect('/dang-nhap?callbackUrl=%2Ftai-khoan');

  const pointHistory = await prisma.pointHistory.findMany({
    where: { userId: session.userId },
    select: { id: true, points: true, type: true, description: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: session.userId },
          ...(user.phone ? [{ phone: user.phone }] : []),
          { customer: { is: { email: user.email } } },
        ],
      },
      select: { orderCode: true, createdAt: true, totalAmount: true, orderStatus: true, paymentStatus: true, items: { select: { titleSnapshot: true, skuSnapshot: true, quantity: true, unitPrice: true, finalPrice: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

  return <main className="page-shell"><AccountDashboard profile={user} pointHistory={pointHistory.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() }))} orders={orders.map((order) => ({ ...order, items: order.items.map((item) => ({ productName: item.titleSnapshot, productSlug: item.skuSnapshot ?? '', quantity: item.quantity, price: item.unitPrice, finalPrice: item.finalPrice })), createdAt: order.createdAt.toISOString() }))} initialTab={searchParams.tab === 'orders' ? 'orders' : 'profile'} /></main>;
}