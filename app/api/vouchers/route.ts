import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

export async function GET() {
  return withDatabase(async () => {
    const now = new Date();
    const items = await prisma.voucher.findMany({
      where: {
        isActive: true,
        showOnPromoPage: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        value: true,
        maxDiscount: true,
        minSpend: true,
        expiresAt: true,
        freeShipping: true,
        firstOrderOnly: true,
        usedCount: true,
        usageLimit: true,
      },
      orderBy: [{ freeShipping: 'desc' }, { expiresAt: 'asc' }, { code: 'asc' }],
    });
    const availableItems = items.filter((item) => item.usageLimit === null || item.usedCount < item.usageLimit);
    const publicItems = availableItems.map(({ usedCount, usageLimit, ...item }) => item);
    return NextResponse.json({ items: publicItems }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }, 'Public voucher listing failed');
}