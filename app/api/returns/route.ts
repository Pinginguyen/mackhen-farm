import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import type { ReturnRequestStatus } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

const issueTypes = [
  'Giao sai sản phẩm',
  'Bao bì bị rách hoặc xì chân không',
  'Hàng có dấu hiệu ẩm mốc',
  'Khác',
] as const;

const returnStatuses: ReturnRequestStatus[] = ['PENDING', 'REPLACEMENT_APPROVED', 'REFUNDED', 'REJECTED'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0084')) return `0${digits.slice(4)}`;
  if (digits.startsWith('84')) return `0${digits.slice(2)}`;
  return digits;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu yêu cầu không hợp lệ.' }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: 'Dữ liệu yêu cầu không hợp lệ.' }, { status: 400 });

  const submittedOrderCode = typeof body.orderCode === 'string' ? body.orderCode.trim() : '';
  const orderCode = submittedOrderCode.toUpperCase();
  const customerPhone = typeof body.customerPhone === 'string' ? normalizePhone(body.customerPhone) : '';
  const issueType = typeof body.issueType === 'string' ? body.issueType.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() || null : body.imageUrl == null ? null : undefined;

  if (!orderCode || !customerPhone || !issueType || !issueTypes.includes(issueType as (typeof issueTypes)[number]) || !description || description.length > 4000 || imageUrl === undefined) {
    return NextResponse.json({ error: 'Vui lòng kiểm tra mã đơn, số điện thoại, loại sự cố và mô tả.' }, { status: 400 });
  }

  if (imageUrl) {
    try {
      const parsedUrl = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol) || imageUrl.length > 2048) throw new Error('Invalid image URL');
    } catch {
      return NextResponse.json({ error: 'Link ảnh minh chứng phải là địa chỉ HTTP hoặc HTTPS hợp lệ.' }, { status: 400 });
    }
  }

  return withDatabase(async () => {
    const numericCodeMatch = orderCode.match(/^(?:MKF-)?(\d+)$/);
    const numericCode = numericCodeMatch ? Number(numericCodeMatch[1]) : null;
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderCode },
          { id: submittedOrderCode },
          ...(numericCode !== null && Number.isSafeInteger(numericCode) ? [{ numericCode }] : []),
        ],
      },
      select: { id: true, phone: true },
    });
    if (!order || normalizePhone(order.phone) !== customerPhone) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng phù hợp.' }, { status: 404 });
    }

    const item = await prisma.returnRequest.create({
      data: { orderId: order.id, customerPhone, issueType, description, imageUrl },
    });
    return NextResponse.json({ item }, { status: 201 });
  }, 'Return request creation failed');
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const items = await prisma.returnRequest.findMany({
      include: { order: { select: { orderCode: true, customerName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ items });
  }, 'Return request listing failed');
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu yêu cầu không hợp lệ.' }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: 'Dữ liệu yêu cầu không hợp lệ.' }, { status: 400 });

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status : '';
  const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() || null : body.adminNote == null ? null : undefined;
  if (!id || !returnStatuses.includes(status as ReturnRequestStatus) || (adminNote?.length ?? 0) > 4000 || adminNote === undefined) {
    return NextResponse.json({ error: 'Mã yêu cầu hoặc trạng thái không hợp lệ.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const item = await prisma.returnRequest.update({
      where: { id },
      data: { status: status as ReturnRequestStatus, adminNote },
      include: { order: { select: { orderCode: true, customerName: true } } },
    });
    return NextResponse.json({ item });
  }, 'Return request update failed');
}