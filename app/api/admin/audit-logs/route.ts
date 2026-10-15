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
    const search = params.get('q')?.trim();
    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(search ? { OR: [
        { adminEmail: { contains: search, mode: 'insensitive' } },
        { targetEntity: { contains: search, mode: 'insensitive' } },
        { targetId: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.auditLog.count({ where }),
    ]);
    return NextResponse.json({ items, pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) } });
  }, 'Admin audit log lookup failed');
}