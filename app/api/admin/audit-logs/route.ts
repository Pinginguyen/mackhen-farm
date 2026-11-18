import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(params.get('pageSize')) || 50));
    const action = params.get('action')?.trim();
    const adminEmail = params.get('adminEmail')?.trim();
    const actionType = params.get('actionType')?.trim().toUpperCase();
    const search = params.get('q')?.trim();
    const from = params.get('from');
    const to = params.get('to');
    const filters: Prisma.AuditLogWhereInput[] = [];
    if (action) filters.push({ action });
    if (adminEmail) filters.push({ adminEmail: { contains: adminEmail, mode: 'insensitive' } });
    if (actionType === 'CREATE' || actionType === 'UPDATE' || actionType === 'DELETE') {
      filters.push({ action: { startsWith: actionType, mode: 'insensitive' } });
    }
    if (search) filters.push({ OR: [
        { adminEmail: { contains: search, mode: 'insensitive' } },
        { targetEntity: { contains: search, mode: 'insensitive' } },
        { targetId: { contains: search, mode: 'insensitive' } },
      ] });
    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
    const toDate = to ? new Date(`${to}T00:00:00.000Z`) : null;
    if (fromDate && !Number.isFinite(fromDate.getTime()) || toDate && !Number.isFinite(toDate.getTime())) {
      return NextResponse.json({ error: { message: 'Khoảng thời gian lọc không hợp lệ.' } }, { status: 400 });
    }
    if (fromDate || toDate) filters.push({ createdAt: {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lt: new Date(toDate.getTime() + 24 * 60 * 60 * 1000) } : {}),
    } });
    const where: Prisma.AuditLogWhereInput = filters.length ? { AND: filters } : {};
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.auditLog.count({ where }),
    ]);
    return NextResponse.json({ items, pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) } });
  }, 'Admin audit log lookup failed');
}