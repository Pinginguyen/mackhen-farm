import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { sendReviewRequestIfNeeded } from '@/lib/order-email-notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return withDatabase(async () => {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: {
        orderStatus: { in: ['DELIVERED', 'COMPLETED'] },
        deliveredAt: { lte: cutoff },
        reviewRequestEmailSentAt: null,
      },
      select: { id: true },
      orderBy: { deliveredAt: 'asc' },
      take: 200,
    });

    let sent = 0;
    let failed = 0;
    for (const order of orders) {
      try {
        if (await sendReviewRequestIfNeeded(order.id)) sent += 1;
      } catch (error) {
        failed += 1;
        console.error('Scheduled review request email failed.', error instanceof Error ? error.name : 'UnknownError');
      }
    }
    return NextResponse.json({ success: true, scanned: orders.length, sent, failed });
  }, 'Review request email cron failed');
}
