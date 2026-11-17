import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

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
    const result = await prisma.order.updateMany({
      where: {
        affiliateCommissionStatus: 'PENDING',
        affiliateCommissionEligibleAt: { lte: new Date() },
        paymentStatus: 'PAID',
        orderStatus: { in: ['DELIVERED', 'COMPLETED'] },
        returnRequests: { none: { status: { in: ['PENDING', 'REPLACEMENT_APPROVED', 'REFUND_APPROVED'] } } },
      },
      data: { affiliateCommissionStatus: 'ELIGIBLE' },
    });
    return NextResponse.json({ success: true, eligibleOrders: result.count });
  }, 'Affiliate commission eligibility update failed');
}