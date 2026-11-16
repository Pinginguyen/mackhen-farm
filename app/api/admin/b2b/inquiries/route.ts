import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const inquiryStatuses = ['PENDING', 'CONTACTED', 'RESOLVED', 'CANCELLED'] as const;

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get('pageSize') ?? '10', 10) || 10));
  const status = params.get('status')?.trim() ?? '';
  const search = params.get('q')?.trim().slice(0, 160) ?? '';
  if (status && !inquiryStatuses.includes(status as (typeof inquiryStatuses)[number])) {
    return NextResponse.json({ error: { message: 'Trạng thái yêu cầu không hợp lệ.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const where: Prisma.B2bInquiryWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.b2bInquiry.count({ where }),
      prisma.b2bInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          companyName: true,
          country: true,
          contactName: true,
          email: true,
          phone: true,
          expectedVolume: true,
          message: true,
          adminNotes: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      items: items.map((item) => ({ ...item, notes: item.message })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }, 'Admin B2B inquiry listing failed.');
}