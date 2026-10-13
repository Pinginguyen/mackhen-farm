import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function VietQrPaymentPage({ searchParams }: { searchParams: { orderId?: string } }) {
  if (!searchParams.orderId) notFound();
  const order = await prisma.order.findUnique({ where: { id: searchParams.orderId }, select: { orderCode: true } });
  if (!order) notFound();
  redirect(`/checkout/vietqr/${encodeURIComponent(order.orderCode)}`);
}