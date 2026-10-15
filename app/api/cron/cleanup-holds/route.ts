import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return withDatabase(async () => {
    const now = new Date();
    const expiredOrders = await prisma.order.findMany({
      where: {
        holdExpiresAt: { lte: now },
        paymentStatus: 'PENDING',
        orderStatus: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { id: true, items: { select: { productId: true, productVariantId: true, quantity: true, lotCode: true } } },
      orderBy: { holdExpiresAt: 'asc' },
      take: 500,
    });

    let releasedOrders = 0;
    let releasedUnits = 0;
    for (const expiredOrder of expiredOrders) {
      const released = await prisma.$transaction(async (transaction) => {
        const claimed = await transaction.order.updateMany({
          where: {
            id: expiredOrder.id,
            holdExpiresAt: { lte: now },
            paymentStatus: 'PENDING',
            orderStatus: { in: ['PENDING', 'CONFIRMED'] },
          },
          data: { orderStatus: 'CANCELLED', holdExpiresAt: null },
        });
        if (!claimed.count) return 0;

        for (const item of expiredOrder.items) {
          await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          if (item.productVariantId) {
            await transaction.productVariant.update({ where: { id: item.productVariantId }, data: { stock: { increment: item.quantity } } });
          }
          if (item.lotCode) {
            await transaction.productionLot.update({ where: { lotCode: item.lotCode }, data: { availableQty: { increment: item.quantity } } });
          }
        }
        return expiredOrder.items.reduce((sum, item) => sum + item.quantity, 0);
      });

      if (released) {
        releasedOrders += 1;
        releasedUnits += released;
      }
    }

    return NextResponse.json({ success: true, releasedOrders, releasedUnits });
  }, 'Expired stock hold cleanup failed');
}