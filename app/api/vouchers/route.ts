import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { ensureCoreVouchers } from '@/lib/ensure-core-vouchers';
import { withVoucherDatabase } from '@/lib/voucher-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return withVoucherDatabase(async () => {
    await ensureCoreVouchers();
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
        name: true,
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
  });
}