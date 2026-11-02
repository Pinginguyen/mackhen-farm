import { NextResponse } from 'next/server';

import { requireAffiliate } from '@/lib/affiliate-auth';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

function commission(totalAmount: number, rate: number): number {
  return Math.floor(totalAmount * rate / 100);
}

export async function GET(request: Request): Promise<NextResponse> {
  const access = await requireAffiliate(request);
  if (access.denied) return access.denied;
  if (!access.affiliate) return NextResponse.json({ error: 'Vui lòng đăng nhập bằng tài khoản KOC.' }, { status: 401 });
  const { affiliate } = access;

  return withDatabase(async () => {
    const [totalClicks, orders] = await Promise.all([
      prisma.affiliateClick.count({ where: { affiliateId: affiliate.id } }),
      prisma.order.findMany({
        where: { affiliateCode: affiliate.affiliateCode },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          orderCode: true,
          createdAt: true,
          totalAmount: true,
          paymentStatus: true,
          orderStatus: true,
          affiliateCommissionRate: true,
          affiliateCommissionPaidAt: true,
          affiliatePayout: { select: { paymentReference: true } },
        },
      }),
    ]);
    const completed = orders.filter((order) => order.paymentStatus === 'PAID' && order.orderStatus !== 'CANCELLED');
    const commissionTotal = (order: (typeof orders)[number]) => commission(order.totalAmount, order.affiliateCommissionRate ?? affiliate.commissionRate);
    const totalRevenue = completed.reduce((sum, order) => sum + order.totalAmount, 0);
    const commissionAccrued = completed.reduce((sum, order) => sum + commissionTotal(order), 0);
    const commissionDue = completed.reduce((sum, order) => sum + (order.affiliateCommissionPaidAt ? 0 : commissionTotal(order)), 0);

    return NextResponse.json({
      affiliate: { name: affiliate.user.name, email: affiliate.user.email, affiliateCode: affiliate.affiliateCode, commissionRate: affiliate.commissionRate },
      totalClicks,
      completedOrders: completed.length,
      totalRevenue,
      commissionAccrued,
      commissionDue,
      orders: orders.map((order) => {
        const isCompleted = order.paymentStatus === 'PAID' && order.orderStatus !== 'CANCELLED';
        return {
          orderCode: order.orderCode,
          createdAt: order.createdAt,
          totalAmount: order.totalAmount,
          commission: isCompleted ? commissionTotal(order) : 0,
          commissionStatus: !isCompleted ? 'Chờ thanh toán đơn' : order.affiliateCommissionPaidAt ? 'Đã chi trả' : 'Chờ đối soát',
          paymentReference: order.affiliatePayout?.paymentReference ?? null,
        };
      }),
      updatedAt: new Date().toISOString(),
    });
  });
}