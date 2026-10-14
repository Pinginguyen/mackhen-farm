import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import Header from '@/components/layout/Header';
import AccountDashboard from './account-dashboard';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) redirect('/dang-nhap?callbackUrl=%2Ftai-khoan');

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true, address: true } }),
    prisma.order.findMany({
      where: { userId: session.userId },
      select: { orderCode: true, createdAt: true, totalAmount: true, orderStatus: true, items: { select: { productName: true, quantity: true, price: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);
  if (!user) redirect('/dang-nhap?callbackUrl=%2Ftai-khoan');

  return <main className="page-shell"><Header /><AccountDashboard profile={user} orders={orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() }))} initialTab={searchParams.tab === 'orders' ? 'orders' : 'profile'} /></main>;
}