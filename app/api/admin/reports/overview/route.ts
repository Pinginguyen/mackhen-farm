import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
const DASHBOARD_METRIC_TIMEOUT_MS = 2500;

type PaidSummary = {
  _sum: { totalAmount: number | null; grossAmount: number | null; netAmount: number | null };
  _count: number;
  _avg: { totalAmount: number | null };
};

type RevenueSummary = { _sum: { totalAmount: number | null } };
type RefundSummary = { _sum: { amount: number | null } };

function cachedMetric<T>(key: string, query: () => Promise<T>) {
  return unstable_cache(query, ['admin-dashboard', key], { revalidate: 60, tags: ['admin-dashboard'] })();
}

async function loadMetric<T>(key: string, query: () => Promise<T>, fallback: T, partialMetrics: string[]): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      cachedMetric(key, query),
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Dashboard metric timed out')), DASHBOARD_METRIC_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.error(`Admin dashboard metric failed (${key}):`, error);
    partialMetrics.push(key);
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return withDatabase(async () => {
    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const partialMetrics: string[] = [];
    const paidSummaryFallback: PaidSummary = { _sum: { totalAmount: null, grossAmount: null, netAmount: null }, _count: 0, _avg: { totalAmount: null } };
    const revenueFallback: RevenueSummary = { _sum: { totalAmount: null } };
    const refundFallback: RefundSummary = { _sum: { amount: null } };
    const [grossSalesSummary, paidSummary, cancelledFinancials, refunds, orderStatusCounts, lowStockProducts, currentPeriodRevenue, previousPeriodRevenue, recentOrders] = await Promise.all([
      loadMetric<RevenueSummary>('gross-sales', () => prisma.order.aggregate({
        where: { orderStatus: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }), revenueFallback, partialMetrics),
      loadMetric<PaidSummary>('paid-summary', () => prisma.order.aggregate({
        where: { OR: [
          { paymentStatus: 'PAID', orderStatus: { not: 'CANCELLED' } },
          { paymentStatus: 'REFUNDED' },
        ] },
        _sum: { totalAmount: true, grossAmount: true, netAmount: true },
        _count: true,
        _avg: { totalAmount: true },
      }), paidSummaryFallback, partialMetrics),
      loadMetric('cancelled-deductions', () => prisma.order.aggregate({
        where: { orderStatus: 'CANCELLED' },
        _sum: { totalAmount: true },
      }), { _sum: { totalAmount: null } }, partialMetrics),
      loadMetric<RefundSummary>('refunds', async () => {
        const [refundedOrders, completedOperations] = await Promise.all([
          prisma.order.aggregate({ where: { paymentStatus: 'REFUNDED' }, _sum: { refundAmount: true } }),
          prisma.refundOperation.aggregate({ where: { status: 'COMPLETED', order: { paymentStatus: { not: 'REFUNDED' } } }, _sum: { amount: true } }),
        ]);
        return { _sum: { amount: (refundedOrders._sum.refundAmount ?? 0) + (completedOperations._sum.amount ?? 0) } };
      }, refundFallback, partialMetrics),
      loadMetric('order-status-counts', () => prisma.order.groupBy({ by: ['orderStatus'], _count: { _all: true } }), [], partialMetrics),
      loadMetric('low-stock-products', () => prisma.product.findMany({
        where: { active: true, stock: { lt: 30 } },
        select: { id: true, name: true, stock: true, unit: true },
        orderBy: { stock: 'asc' },
      }), [], partialMetrics),
      loadMetric<RevenueSummary>('current-period-revenue', () => prisma.order.aggregate({
        where: { paymentStatus: { in: ['PAID', 'REFUNDED'] }, orderStatus: { not: 'CANCELLED' }, createdAt: { gte: currentPeriodStart } },
        _sum: { totalAmount: true },
      }), revenueFallback, partialMetrics),
      loadMetric<RevenueSummary>('previous-period-revenue', () => prisma.order.aggregate({
        where: { paymentStatus: { in: ['PAID', 'REFUNDED'] }, orderStatus: { not: 'CANCELLED' }, createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } },
        _sum: { totalAmount: true },
      }), revenueFallback, partialMetrics),
      loadMetric('recent-orders', () => prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { orderCode: true, customerName: true, phone: true, totalAmount: true, orderStatus: true, paymentMethod: true, paymentStatus: true, createdAt: true },
      }), [], partialMetrics),
    ]);

    const statusCounts = new Map(orderStatusCounts.map((item) => [item.orderStatus, item._count._all]));
    const orders = [...statusCounts.values()].reduce((sum, count) => sum + count, 0);
    const pending = statusCounts.get('PENDING') ?? 0;
    const delivered = (statusCounts.get('DELIVERED') ?? 0) + (statusCounts.get('COMPLETED') ?? 0);
    const cancelled = statusCounts.get('CANCELLED') ?? 0;
    const closedOrders = delivered + cancelled;
    const currentRevenue = currentPeriodRevenue._sum.totalAmount ?? 0;
    const previousRevenue = previousPeriodRevenue._sum.totalAmount ?? 0;
    const gmvGrowthPercent = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue ? null : 0;
    const deliverySuccessRate = closedOrders ? (delivered / closedOrders) * 100 : null;
    const cancelledRate = closedOrders ? (cancelled / closedOrders) * 100 : null;
    const revenue = paidSummary._sum.totalAmount ?? 0;
    const grossSales = grossSalesSummary._sum.totalAmount ?? 0;
    const cancelledDeductions = cancelledFinancials._sum.totalAmount ?? 0;
    const refundDeductions = refunds._sum.amount ?? 0;
    const marketplaceFees: number | null = null;
    const netRevenue = Math.max(0, Math.min(grossSales, revenue - refundDeductions));

    return NextResponse.json({
      revenue,
      grossSales,
      cancelledDeductions,
      refundDeductions,
      marketplaceFees,
      netRevenue,
      orders,
      pending,
      paidOrders: paidSummary._count,
      averageOrderValue: Math.round(paidSummary._avg.totalAmount ?? 0),
      gmvGrowthPercent,
      deliverySuccessRate,
      cancelledRate,
      lowStock: lowStockProducts.length,
      lowStockProducts,
      recentOrders,
      partialMetrics,
      channelMix: { web: 0, social: 0, retail: 0 },
    });
  });
}
