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
    const [eventsResult, ordersResult] = await Promise.allSettled([
      prisma.funnelEvent.groupBy({
        by: ['eventType', 'sessionId'],
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
    const eventCounts = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    const totalOrders = ordersResult.status === 'fulfilled' ? ordersResult.value : 0;
    const counts = new Map<string, number>();
    for (const event of eventCounts) counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
    const hasTrafficEvents = eventCounts.some((event) => event._count._all > 0);
    const usingFallback = eventsResult.status === 'rejected' || !hasTrafficEvents;
    const views = counts.get('PRODUCT_VIEW') ?? 0;
    const cartAdds = counts.get('ADD_TO_CART') ?? 0;
    const checkouts = counts.get('CHECKOUT_START') ?? 0;
    const completed = totalOrders;
    const cartRate = conversionRate(cartAdds, views);
    const checkoutRate = conversionRate(completed, checkouts);
    const overallRate = conversionRate(completed, views);
    const checkoutDropOffRate = checkoutRate === null ? null : Number(Math.max(0, 100 - checkoutRate).toFixed(2));

    return NextResponse.json({
      periodDays: FUNNEL_PERIOD_DAYS,
      periodStart: periodStart.toISOString(),
      updatedAt: updatedAt.toISOString(),
      views,
      cartAdds,
      checkouts,
      completed,
      cartRate,
      cartToCheckoutRate: conversionRate(checkouts, cartAdds),
      checkoutRate,
      overallRate,
      checkoutDropOffRate,
      usingFallback,
      eventDataUnavailable: eventsResult.status === 'rejected',
      productViews: views,
      addToCart: cartAdds,
      checkoutStarts: checkouts,
      paidOrders: completed,
      addToCartRate: cartRate,
      checkoutCompletionRate: checkoutRate,
      overallConversionRate: overallRate,
    });
  });
}