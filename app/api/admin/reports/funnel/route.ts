import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const FUNNEL_PERIOD_DAYS = 30;

function conversionRate(numerator: number, denominator: number): number | null {
  return denominator ? Number((numerator / denominator * 100).toFixed(2)) : null;
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const updatedAt = new Date();
    const periodStart = new Date(updatedAt.getTime() - FUNNEL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const [eventCounts, paidOrders] = await Promise.all([
      prisma.funnelEvent.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: periodStart } },
        _count: { _all: true },
      }),
      prisma.order.count({
        where: {
          paymentStatus: 'PAID',
          orderStatus: { not: 'CANCELLED' },
          createdAt: { gte: periodStart },
        },
      }),
    ]);
    const counts = new Map(eventCounts.map((event) => [event.eventType, event._count._all]));
    const productViews = counts.get('PRODUCT_VIEW') ?? 0;
    const addToCart = counts.get('ADD_TO_CART') ?? 0;
    const checkoutStarts = counts.get('CHECKOUT_START') ?? 0;
    const checkoutCompletionRate = conversionRate(paidOrders, checkoutStarts);

    return NextResponse.json({
      periodDays: FUNNEL_PERIOD_DAYS,
      periodStart: periodStart.toISOString(),
      updatedAt: updatedAt.toISOString(),
      productViews,
      addToCart,
      checkoutStarts,
      paidOrders,
      addToCartRate: conversionRate(addToCart, productViews),
      cartToCheckoutRate: conversionRate(checkoutStarts, addToCart),
      checkoutCompletionRate,
      overallConversionRate: conversionRate(paidOrders, productViews),
      checkoutDropOffRate: checkoutCompletionRate === null ? null : Number(Math.max(0, 100 - checkoutCompletionRate).toFixed(2)),
    });
  });
}