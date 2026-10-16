import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return withDatabase(async () => {
    const params = new URL(request.url).searchParams;
    const ratingFilter = params.get('rating');
    const where: Prisma.ReviewWhereInput = ratingFilter === '5'
      ? { rating: 5 }
      : ratingFilter === 'low' ? { rating: { lte: 2 } } : {};
    const items = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        customerName: true,
        rating: true,
        comment: true,
        createdAt: true,
        adminReply: true,
        adminReplyAt: true,
        product: { select: { id: true, slug: true, name: true } },
        order: { select: { orderCode: true, phone: true } },
      },
    });
    return NextResponse.json({ items });
  }, 'Admin review listing failed');
}
