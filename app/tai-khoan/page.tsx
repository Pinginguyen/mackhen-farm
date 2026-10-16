import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import AccountDashboard from './account-dashboard';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) redirect('/dang-nhap?callbackUrl=%2Ftai-khoan');

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true, address: true } });
  if (!user) redirect('/dang-nhap?callbackUrl=%2Ftai-khoan');

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: session.userId },
          ...(user.phone ? [{ phone: user.phone }] : []),
          { customer: { is: { email: user.email } } },
        ],
      },
      select: { orderCode: true, createdAt: true, totalAmount: true, orderStatus: true, paymentStatus: true, items: { select: { productName: true, quantity: true, price: true, product: { select: { slug: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

  return <main className="page-shell"><AccountDashboard profile={user} orders={orders.map((order) => ({ ...order, items: order.items.map(({ product, ...item }) => ({ ...item, productSlug: product.slug })), createdAt: order.createdAt.toISOString() }))} initialTab={searchParams.tab === 'orders' ? 'orders' : 'profile'} /></main>;
}