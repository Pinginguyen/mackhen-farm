import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { withDatabase } from '@/lib/api-database';
import type { ReturnRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const issueTypes = [
  'Giao sai sản phẩm',
  'Bao bì bị rách hoặc xì chân không',
  'Hàng có dấu hiệu ẩm mốc',
  'Khác',
] as const;

const returnStatuses: ReturnRequestStatus[] = ['PENDING', 'REPLACEMENT_APPROVED', 'VOUCHER_ISSUED', 'REFUND_APPROVED', 'REFUNDED', 'REJECTED'];
const maxEvidenceBytes = 2 * 1024 * 1024;

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
  const normalizeOptionalField = (value: unknown): string | null | undefined => {
    if (value == null) return null;
    if (typeof value !== 'string') return undefined;
    return value.trim() || null;
  };
  const refundBankName = normalizeOptionalField(body.refundBankName);
  const refundAccountNumber = normalizeOptionalField(body.refundAccountNumber);
  const refundAccountHolder = normalizeOptionalField(body.refundAccountHolder);
  const refundDetails = [refundBankName, refundAccountNumber, refundAccountHolder];
  const hasRefundDetails = refundDetails.some(Boolean);

  if (!orderCode || !customerPhone || !issueType || !issueTypes.includes(issueType as (typeof issueTypes)[number]) || !description || description.length > 4000 || imageUrl === undefined) {
    return NextResponse.json({ error: 'Vui lòng kiểm tra mã đơn, số điện thoại, loại sự cố và mô tả.' }, { status: 400 });
  }
  if (refundDetails.some((value) => value === undefined)
    || (hasRefundDetails && refundDetails.some((value) => !value))
    || (refundBankName?.length ?? 0) > 100
    || (refundAccountNumber?.length ?? 0) > 100
    || (refundAccountHolder?.length ?? 0) > 120) {
    return NextResponse.json({ error: 'Nếu yêu cầu hoàn tiền, vui lòng nhập đủ và kiểm tra ngân hàng/ví, số tài khoản và tên chủ tài khoản.' }, { status: 400 });
  }

  if (imageUrl) {
    if (imageUrl.startsWith('data:')) {
      const dataUrlMatch = imageUrl.match(/^data:image\/(jpeg|png|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/i);
      const encodedImage = dataUrlMatch?.[2];
      const padding = encodedImage?.endsWith('==') ? 2 : encodedImage?.endsWith('=') ? 1 : 0;
      const imageBytes = encodedImage ? Math.floor(encodedImage.length * 3 / 4) - padding : Infinity;
      if (!encodedImage || encodedImage.length % 4 !== 0 || imageBytes > maxEvidenceBytes) {
        return NextResponse.json({ error: 'Ảnh minh chứng không hợp lệ hoặc vượt quá 2MB.' }, { status: 400 });
      }
    } else {
      try {
        const parsedUrl = new URL(imageUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol) || imageUrl.length > 2048) throw new Error('Invalid image URL');
      } catch {
        return NextResponse.json({ error: 'Link ảnh minh chứng phải là địa chỉ HTTP hoặc HTTPS hợp lệ.' }, { status: 400 });
      }
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
      data: { orderId: order.id, customerPhone, issueType, description, imageUrl, refundBankName, refundAccountNumber, refundAccountHolder },
    });
    return NextResponse.json({ item }, { status: 201 });
  }, 'Return request creation failed');
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const items = await prisma.returnRequest.findMany({
      include: { order: { select: { orderCode: true, customerName: true } }, compensationVoucher: true },
      orderBy: { createdAt: 'desc' },
    });
    items.sort((left, right) => Number(right.riskTag === 'URGENT_QUALITY_RISK') - Number(left.riskTag === 'URGENT_QUALITY_RISK')
      || right.createdAt.getTime() - left.createdAt.getTime());
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
  const refundTransferReference = typeof body.refundTransferReference === 'string' ? body.refundTransferReference.trim() : '';
  if (!id || !returnStatuses.includes(status as ReturnRequestStatus) || (adminNote?.length ?? 0) > 4000 || adminNote === undefined || refundTransferReference.length > 160) {
    return NextResponse.json({ error: 'Mã yêu cầu hoặc trạng thái không hợp lệ.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const current = await prisma.returnRequest.findUnique({
      where: { id },
      select: { status: true, orderId: true, customerPhone: true, refundBankName: true, refundAccountNumber: true, refundAccountHolder: true, refundApprovedBy: true, refundApprovedAt: true, refundTransferReference: true },
    });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy yêu cầu đổi trả.' }, { status: 404 });
    const allowedTransition = status === current.status
      || (current.status === 'PENDING' && ['REPLACEMENT_APPROVED', 'VOUCHER_ISSUED', 'REFUND_APPROVED', 'REJECTED'].includes(status))
      || (current.status === 'REFUND_APPROVED' && status === 'REFUNDED');
    if (!allowedTransition) return NextResponse.json({ error: 'Trạng thái không hợp lệ với vòng đời xử lý hiện tại.' }, { status: 409 });
    if (status === 'REFUND_APPROVED' && (current.status !== 'PENDING' || !current.refundBankName || !current.refundAccountNumber || !current.refundAccountHolder)) {
      return NextResponse.json({ error: 'Chỉ phê duyệt hoàn tiền khi yêu cầu đang chờ và khách đã cung cấp đủ thông tin nhận tiền.' }, { status: 409 });
    }
    if (status === 'VOUCHER_ISSUED' && current.status !== 'PENDING') {
      return NextResponse.json({ error: 'Chỉ phát hành voucher cho yêu cầu đang chờ xử lý.' }, { status: 409 });
    }
    if (status === 'REFUNDED' && (current.status !== 'REFUND_APPROVED' || !refundTransferReference)) {
      return NextResponse.json({ error: 'Cần có phê duyệt của Admin và mã tham chiếu giao dịch trước khi ghi nhận đã hoàn tiền.' }, { status: 409 });
    }
    const adminEmail = getRequestSession(request)?.email ?? 'unknown-admin';
    if (status === 'VOUCHER_ISSUED' && current.status === 'VOUCHER_ISSUED') {
      const existing = await prisma.returnRequest.findUnique({ where: { id }, include: { order: { select: { orderCode: true, customerName: true } }, compensationVoucher: true } });
      if (existing) return NextResponse.json({ item: existing, duplicate: true });
    }
    const item = status === 'VOUCHER_ISSUED'
      ? await prisma.$transaction(async (transaction) => {
        await transaction.compensationVoucher.create({
          data: {
            code: `MKF50-${randomBytes(4).toString('hex').toUpperCase()}`,
            orderId: current.orderId,
            returnRequestId: id,
            customerPhone: current.customerPhone,
            discountPercent: 50,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            createdBy: adminEmail,
          },
        });
        return transaction.returnRequest.update({
          where: { id },
          data: { status, adminNote },
          include: { order: { select: { orderCode: true, customerName: true } }, compensationVoucher: true },
        });
      })
      : await prisma.returnRequest.update({
        where: { id },
        data: {
          status: status as ReturnRequestStatus,
          adminNote,
          ...(status === 'REFUND_APPROVED' ? { refundApprovedBy: adminEmail, refundApprovedAt: new Date() } : {}),
          ...(status === 'REFUNDED' ? { refundTransferReference } : {}),
        },
        include: { order: { select: { orderCode: true, customerName: true } }, compensationVoucher: true },
      });
    await writeAuditLog(request, {
      adminEmail,
      action: status === 'REFUND_APPROVED' ? 'APPROVE_REFUND' : status === 'VOUCHER_ISSUED' ? 'ISSUE_COMPENSATION_VOUCHER' : 'UPDATE_RETURN_REQUEST',
      targetEntity: 'ReturnRequest',
      targetId: id,
      oldValue: current,
      newValue: { status, adminNote, compensationVoucherCode: status === 'VOUCHER_ISSUED' ? item.compensationVoucher?.code : undefined, refundApprovedBy: status === 'REFUND_APPROVED' ? adminEmail : current.refundApprovedBy, refundTransferReference: refundTransferReference || current.refundTransferReference },
    });
    return NextResponse.json({ item });
  }, 'Return request update failed');
}