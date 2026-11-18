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
    const stockForecastStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const partialMetrics: string[] = [];
    const paidSummaryFallback: PaidSummary = { _sum: { totalAmount: null, grossAmount: null, netAmount: null }, _count: 0, _avg: { totalAmount: null } };
    const revenueFallback: RevenueSummary = { _sum: { totalAmount: null } };
    const refundFallback: RefundSummary = { _sum: { amount: null } };
    const [grossSalesSummary, paidSummary, cancelledFinancials, refunds, orderStatusCounts, lowStockProducts, currentPeriodRevenue, previousPeriodRevenue, recentOrders, revenueTrendOrders, repeatCustomerGroups, stockForecastProducts, stockSales, costSummary] = await Promise.all([
      loadMetric<RevenueSummary>('gross-sales', () => prisma.order.aggregate({
        where: { orderStatus: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }), revenueFallback, partialMetrics),
      loadMetric<PaidSummary>('paid-summary', () => prisma.order.aggregate({
        where: { paymentStatus: 'PAID', orderStatus: { notIn: ['CANCELLED', 'RETURNED'] } },
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
      loadMetric('revenue-trend', () => prisma.order.findMany({
        where: { paymentStatus: 'PAID', orderStatus: { notIn: ['CANCELLED', 'RETURNED'] }, createdAt: { gte: trendStart } },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 20_000,
      }), [], partialMetrics),
      loadMetric('repeat-customers', () => prisma.order.groupBy({
        by: ['phone'],
        where: { paymentStatus: 'PAID', orderStatus: { notIn: ['CANCELLED', 'RETURNED'] } },
        _count: { _all: true },
      }), [], partialMetrics),
      loadMetric('stock-forecast-products', () => prisma.product.findMany({
        where: { active: true },
        select: { id: true, name: true, stock: true, unit: true },
      }), [], partialMetrics),
      loadMetric('stock-sales-30-days', () => prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { is: { paymentStatus: 'PAID', orderStatus: { notIn: ['CANCELLED', 'RETURNED'] }, createdAt: { gte: stockForecastStart } } } },
        _sum: { quantity: true },
      }), [], partialMetrics),
      loadMetric('cost-coverage', () => prisma.order.aggregate({
        where: { paymentStatus: 'PAID', orderStatus: { notIn: ['CANCELLED', 'RETURNED'] }, costOfGoods: { not: null } },
        _sum: { costOfGoods: true },
        _count: true,
      }), { _sum: { costOfGoods: null }, _count: 0 }, partialMetrics),
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
    const netRevenue = Math.max(0, revenue - refundDeductions);
    const costCoveragePercent = paidSummary._count ? Number((costSummary._count / paidSummary._count * 100).toFixed(2)) : 0;
    const costOfGoods = costSummary._sum.costOfGoods ?? 0;
    const grossProfit = paidSummary._count > 0 && costCoveragePercent === 100 ? netRevenue - costOfGoods : null;
    const grossMarginPercent = grossProfit !== null && netRevenue > 0 ? Number((grossProfit / netRevenue * 100).toFixed(2)) : null;
    const uniqueCustomers = repeatCustomerGroups.length;
    const repeatCustomers = repeatCustomerGroups.filter((group) => group._count._all > 1).length;
    const repeatCustomerRate = uniqueCustomers ? Number((repeatCustomers / uniqueCustomers * 100).toFixed(2)) : null;

    const monthlyBuckets = Array.from({ length: 12 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      return { key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`, label: month.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }), revenue: 0 };
    });
    const monthlyByKey = new Map(monthlyBuckets.map((bucket) => [bucket.key, bucket]));
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weeklyBuckets = Array.from({ length: 12 }, (_, index) => {
      const start = new Date(weekStart);
      start.setDate(start.getDate() - (11 - index) * 7);
      return { key: start.toISOString().slice(0, 10), label: start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), revenue: 0 };
    });
    const weeklyByKey = new Map(weeklyBuckets.map((bucket) => [bucket.key, bucket]));
    for (const order of revenueTrendOrders) {
      const monthKey = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const month = monthlyByKey.get(monthKey);
      if (month) month.revenue += order.totalAmount;
      const monday = new Date(order.createdAt);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const week = weeklyByKey.get(monday.toISOString().slice(0, 10));
      if (week) week.revenue += order.totalAmount;
    }
    const stockSalesByProduct = new Map(stockSales.map((item) => [item.productId, item._sum.quantity ?? 0]));
    const stockForecast = stockForecastProducts.map((product) => {
      const unitsSold30Days = stockSalesByProduct.get(product.id) ?? 0;
      const averageDailyUnits = unitsSold30Days / 30;
      return {
        ...product,
        unitsSold30Days,
        averageDailyUnits: Number(averageDailyUnits.toFixed(2)),
        daysRemaining: averageDailyUnits > 0 ? Math.floor(product.stock / averageDailyUnits) : null,
      };
    }).filter((product) => product.unitsSold30Days > 0)
      .sort((left, right) => (left.daysRemaining ?? Number.MAX_SAFE_INTEGER) - (right.daysRemaining ?? Number.MAX_SAFE_INTEGER));

    return NextResponse.json({
      revenue,
      grossSales,
      cancelledDeductions,
      refundDeductions,
      marketplaceFees,
      netRevenue,
      grossProfit,
      grossMarginPercent,
      costCoveragePercent,
      orders,
      pending,
      paidOrders: paidSummary._count,
      averageOrderValue: Math.round(paidSummary._avg.totalAmount ?? 0),
      repeatCustomerRate,
      repeatCustomers,
      uniqueCustomers,
      revenueTrend: { weekly: weeklyBuckets, monthly: monthlyBuckets },
      stockForecast,
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
