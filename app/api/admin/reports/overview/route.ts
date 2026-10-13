import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

export function GET() {
  return withDatabase(async () => {
  const [revenue, orders, pending, lowStock] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] } } }),
    prisma.product.count({ where: { active: true, stock: { lt: 50 } } }),
  ]);

  return NextResponse.json({
    revenue: revenue._sum.totalAmount ?? 0,
    orders,
    pending,
    lowStock,
    channelMix: { web: 0, social: 0, retail: 0 },
  });
  });
}
