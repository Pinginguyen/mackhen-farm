import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return withDatabase(async () => {
  const now = new Date();
  const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const [revenue, orders, paidOrders, pending, lowStockProducts, currentPeriodRevenue, previousPeriodRevenue, delivered, closedOrders, cancelled, recentOrders] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _count: true, _avg: { totalAmount: true } }),
    prisma.order.count({ where: { orderStatus: 'PENDING' } }),
    prisma.product.findMany({ where: { active: true, stock: { lt: 30 } }, select: { id: true, name: true, stock: true, unit: true }, orderBy: { stock: 'asc' } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: currentPeriodStart } }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } }, _sum: { totalAmount: true } }),
    prisma.order.count({ where: { orderStatus: { in: ['DELIVERED', 'COMPLETED'] } } }),
    prisma.order.count({ where: { orderStatus: { in: ['DELIVERED', 'COMPLETED', 'CANCELLED'] } } }),
    prisma.order.count({ where: { orderStatus: 'CANCELLED' } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { orderCode: true, customerName: true, phone: true, totalAmount: true, orderStatus: true, paymentMethod: true, paymentStatus: true, createdAt: true },
    }),
  ]);

  const currentRevenue = currentPeriodRevenue._sum.totalAmount ?? 0;
  const previousRevenue = previousPeriodRevenue._sum.totalAmount ?? 0;
  const gmvGrowthPercent = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue ? null : 0;
  const deliverySuccessRate = closedOrders ? (delivered / closedOrders) * 100 : null;
  const cancelledRate = closedOrders ? (cancelled / closedOrders) * 100 : null;

  return NextResponse.json({
    revenue: revenue._sum.totalAmount ?? 0,
    orders,
    pending,
    paidOrders: paidOrders._count,
    averageOrderValue: Math.round(paidOrders._avg.totalAmount ?? 0),
    gmvGrowthPercent,
    deliverySuccessRate,
    cancelledRate,
    lowStock: lowStockProducts.length,
    lowStockProducts,
    recentOrders,
    channelMix: { web: 0, social: 0, retail: 0 },
  });
  });
}
