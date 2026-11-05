import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { normalizeAffiliateCode } from '@/lib/affiliate-attribution';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { calculatePercentageAmount } from '@/lib/money';

export const dynamic = 'force-dynamic';

function commissionFor(amount: number, rate: number): number {
  return calculatePercentageAmount(amount, rate);
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const affiliates = await prisma.affiliate.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!affiliates.length) return NextResponse.json({ items: [] });

    const [orders, clickCounts] = await Promise.all([
      prisma.order.findMany({
        where: { affiliateCode: { in: affiliates.map((affiliate) => affiliate.affiliateCode) }, paymentStatus: 'PAID', orderStatus: { not: 'CANCELLED' } },
        select: { affiliateCode: true, totalAmount: true, affiliateCommissionRate: true, affiliateCommissionPaidAt: true },
      }),
      prisma.affiliateClick.groupBy({ by: ['affiliateId'], _count: { _all: true } }),
    ]);
    const clicksByAffiliate = new Map(clickCounts.map((item) => [item.affiliateId, item._count._all]));
    const summaries = new Map<string, { revenue: number; completedOrders: number; commission: number; commissionDue: number; commissionDueOrders: number }>();
    for (const order of orders) {
      if (!order.affiliateCode) continue;
      const current = summaries.get(order.affiliateCode) ?? { revenue: 0, completedOrders: 0, commission: 0, commissionDue: 0, commissionDueOrders: 0 };
      const affiliate = affiliates.find((item) => item.affiliateCode === order.affiliateCode);
      const rate = order.affiliateCommissionRate ?? affiliate?.commissionRate ?? 10;
      const commission = commissionFor(order.totalAmount, rate);
      current.revenue += order.totalAmount;
      current.completedOrders += 1;
      current.commission += commission;
      if (!order.affiliateCommissionPaidAt) {
        current.commissionDue += commission;
        current.commissionDueOrders += 1;
      }
      summaries.set(order.affiliateCode, current);
    }

    return NextResponse.json({ items: affiliates.map((affiliate) => ({
      id: affiliate.id,
      name: affiliate.user.name,
      email: affiliate.user.email,
      affiliateCode: affiliate.affiliateCode,
      commissionRate: affiliate.commissionRate,
      bankAccount: affiliate.bankAccount,
      active: affiliate.active,
      totalClicks: clicksByAffiliate.get(affiliate.id) ?? 0,
      ...(summaries.get(affiliate.affiliateCode) ?? { revenue: 0, completedOrders: 0, commission: 0, commissionDue: 0, commissionDueOrders: 0 }),
    })) });
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu đối tác không hợp lệ.' } }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return NextResponse.json({ error: { message: 'Dữ liệu đối tác không hợp lệ.' } }, { status: 400 });
  const body = payload as { name?: unknown; email?: unknown; password?: unknown; affiliateCode?: unknown; commissionRate?: unknown; bankAccount?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const affiliateCode = normalizeAffiliateCode(body.affiliateCode);
  const commissionRate = body.commissionRate;
  const bankAccount = typeof body.bankAccount === 'string' ? body.bankAccount.trim() : '';
  if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || password.trim().length < 6 || password.length > 128 || !affiliateCode
    || !Number.isInteger(commissionRate) || Number(commissionRate) < 10 || Number(commissionRate) > 15
    || !/^[\d\s-]{4,34}$/.test(bankAccount)) {
    return NextResponse.json({ error: { message: 'Vui lòng kiểm tra tên, email, mật khẩu tối thiểu 6 ký tự, mã ref, tỷ lệ 10–15% và số tài khoản ngân hàng.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const passwordHash = await hash(password, 12);
    const result = await prisma.$transaction(async (transaction) => {
      if (await transaction.user.findUnique({ where: { email }, select: { id: true } })) return { conflict: 'EMAIL' as const };
      if (await transaction.affiliate.findUnique({ where: { affiliateCode }, select: { id: true } })) return { conflict: 'CODE' as const };
      const user = await transaction.user.create({ data: { name, email, password: passwordHash, role: 'AFFILIATE' }, select: { id: true, name: true, email: true } });
      const affiliate = await transaction.affiliate.create({ data: { userId: user.id, affiliateCode, commissionRate: Number(commissionRate), bankAccount }, select: { id: true, affiliateCode: true, commissionRate: true, active: true } });
      return { user, affiliate };
    });
    if ('conflict' in result) return NextResponse.json({ error: { message: result.conflict === 'EMAIL' ? 'Email đã được sử dụng cho tài khoản khác.' : 'Mã affiliate đã tồn tại.' } }, { status: 409 });
    await writeAuditLog(request, { adminEmail: getRequestSession(request)?.email ?? 'unknown-admin', action: 'CREATE_AFFILIATE', targetEntity: 'Affiliate', targetId: result.affiliate.affiliateCode, newValue: { ...result.affiliate, email: result.user.email } });
    return NextResponse.json({ ...result.affiliate, name: result.user.name, email: result.user.email }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu cập nhật không hợp lệ.' } }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return NextResponse.json({ error: { message: 'Dữ liệu cập nhật không hợp lệ.' } }, { status: 400 });
  const body = payload as { affiliateId?: unknown; active?: unknown };
  if (typeof body.affiliateId !== 'string' || typeof body.active !== 'boolean') return NextResponse.json({ error: { message: 'Đối tác hoặc trạng thái không hợp lệ.' } }, { status: 400 });

  return withDatabase(async () => {
    const affiliate = await prisma.affiliate.update({ where: { id: body.affiliateId as string }, data: { active: body.active as boolean }, include: { user: { select: { name: true, email: true } } } });
    await writeAuditLog(request, { adminEmail: getRequestSession(request)?.email ?? 'unknown-admin', action: affiliate.active ? 'ACTIVATE_AFFILIATE' : 'SUSPEND_AFFILIATE', targetEntity: 'Affiliate', targetId: affiliate.affiliateCode, oldValue: { active: !affiliate.active }, newValue: { active: affiliate.active } });
    return NextResponse.json({ id: affiliate.id, affiliateCode: affiliate.affiliateCode, active: affiliate.active });
  });
}