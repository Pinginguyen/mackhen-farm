import { randomBytes } from 'node:crypto';
import { revalidateTag } from 'next/cache';
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

const returnStatuses: ReturnRequestStatus[] = ['PENDING', 'REPLACEMENT_APPROVED', 'VOUCHER_ISSUED', 'REFUND_APPROVED', 'REFUNDED', 'COMPLETED', 'REJECTED'];
const maxEvidenceBytes = 5 * 1024 * 1024;

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
      const dataUrlMatch = imageUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
      const encodedImage = dataUrlMatch?.[2];
      const padding = encodedImage?.endsWith('==') ? 2 : encodedImage?.endsWith('=') ? 1 : 0;
      const imageBytes = encodedImage ? Math.floor(encodedImage.length * 3 / 4) - padding : Infinity;
      if (!encodedImage || encodedImage.length % 4 !== 0 || imageBytes > maxEvidenceBytes) {
        return NextResponse.json({ error: 'Ảnh minh chứng phải là JPEG, PNG hoặc WebP và không vượt quá 5MB.' }, { status: 400 });
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
      include: { order: { select: { orderCode: true, customerName: true, totalAmount: true } }, compensationVoucher: true, issuedVoucher: true },
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
  const resolutionMethod = body.resolutionMethod;
  const voucherValue = body.voucherValue;
  if (!id || !returnStatuses.includes(status as ReturnRequestStatus) || (adminNote?.length ?? 0) > 4000 || adminNote === undefined || refundTransferReference.length > 160) {
    return NextResponse.json({ error: 'Mã yêu cầu hoặc trạng thái không hợp lệ.' }, { status: 400 });
  }
  if (resolutionMethod !== undefined && resolutionMethod !== 'REFUND' && resolutionMethod !== 'VOUCHER') {
    return NextResponse.json({ error: 'Phương thức xử lý không hợp lệ.' }, { status: 400 });
  }
  if (resolutionMethod === 'VOUCHER' && (!Number.isSafeInteger(voucherValue) || Number(voucherValue) <= 0 || Number(voucherValue) > 100_000_000)) {
    return NextResponse.json({ error: 'Mệnh giá voucher phải từ 1 đến 100.000.000đ.' }, { status: 400 });
  }
  if (['REFUNDED', 'COMPLETED'].includes(status) && !refundTransferReference) {
    return NextResponse.json({ error: 'Vui lòng nhập mã tham chiếu giao dịch trước khi xác nhận đã chuyển hoàn.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const current = await prisma.returnRequest.findUnique({
      where: { id },
      select: { status: true, orderId: true, customerPhone: true, refundBankName: true, refundAccountNumber: true, refundAccountHolder: true, refundApprovedBy: true, refundApprovedAt: true, refundTransferReference: true, order: { select: { orderCode: true, totalAmount: true } } },
    });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy yêu cầu đổi trả.' }, { status: 404 });
    const allowedTransition = status === current.status
      || (current.status === 'PENDING' && ['REPLACEMENT_APPROVED', 'VOUCHER_ISSUED', 'REFUND_APPROVED', 'REJECTED'].includes(status))
      || (current.status === 'REFUND_APPROVED' && ['REFUNDED', 'COMPLETED', 'VOUCHER_ISSUED'].includes(status));
    if (!allowedTransition) return NextResponse.json({ error: 'Trạng thái không hợp lệ với vòng đời xử lý hiện tại.' }, { status: 409 });
    if (status === 'REFUND_APPROVED' && (current.status !== 'PENDING' || !current.refundBankName || !current.refundAccountNumber || !current.refundAccountHolder)) {
      return NextResponse.json({ error: 'Chỉ phê duyệt hoàn tiền khi yêu cầu đang chờ và khách đã cung cấp đủ thông tin nhận tiền.' }, { status: 409 });
    }
    if (status === 'VOUCHER_ISSUED' && current.status !== 'PENDING' && !(current.status === 'REFUND_APPROVED' && resolutionMethod === 'VOUCHER')) {
      return NextResponse.json({ error: 'Chỉ phát hành voucher cho yêu cầu đang chờ xử lý.' }, { status: 409 });
    }
    if (['REFUNDED', 'COMPLETED'].includes(status) && current.status !== 'REFUND_APPROVED') {
      return NextResponse.json({ error: 'Cần có phê duyệt của Admin trước khi ghi nhận đã hoàn tiền.' }, { status: 409 });
    }
    if (resolutionMethod === 'VOUCHER' && (status !== 'VOUCHER_ISSUED' || current.status !== 'REFUND_APPROVED')) {
      return NextResponse.json({ error: 'Chỉ phát hành voucher sau khi yêu cầu đã được duyệt xử lý.' }, { status: 409 });
    }
    if (status === 'VOUCHER_ISSUED' && current.status === 'REFUND_APPROVED' && resolutionMethod !== 'VOUCHER') {
      return NextResponse.json({ error: 'Chọn phương thức voucher và nhập mệnh giá cần phát hành.' }, { status: 400 });
    }
    const adminEmail = getRequestSession(request)?.email ?? 'unknown-admin';
    if (status === 'VOUCHER_ISSUED' && current.status === 'VOUCHER_ISSUED') {
      const existing = await prisma.returnRequest.findUnique({ where: { id }, include: { order: { select: { orderCode: true, customerName: true, totalAmount: true } }, compensationVoucher: true, issuedVoucher: true } });
      if (existing) return NextResponse.json({ item: existing, duplicate: true });
    }
    const refundCompleted = ['REFUNDED', 'COMPLETED'].includes(status);
    const item = status === 'VOUCHER_ISSUED' && resolutionMethod === 'VOUCHER'
      ? await prisma.$transaction(async (transaction) => {
        const baseCode = `COMP-${current.order.orderCode}`;
        const codeExists = await transaction.voucher.findUnique({ where: { code: baseCode }, select: { id: true } });
        const code = codeExists ? `${baseCode}-${randomBytes(2).toString('hex').toUpperCase()}` : baseCode;
        const voucher = await transaction.voucher.create({
          data: {
            code,
            name: `Voucher đền bù đơn ${current.order.orderCode}`,
            discountType: 'FIXED',
            value: Number(voucherValue),
            maxDiscount: null,
            minSpend: 0,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true,
            usageLimit: 1,
            freeShipping: false,
            firstOrderOnly: false,
            showOnPromoPage: false,
            returnRequestId: id,
          },
        });
        const updated = await transaction.returnRequest.update({
          where: { id },
          data: { status: 'VOUCHER_ISSUED', adminNote },
          include: { order: { select: { orderCode: true, customerName: true, totalAmount: true } }, compensationVoucher: true, issuedVoucher: true },
        });
        return { ...updated, issuedVoucher: voucher };
      })
      : status === 'VOUCHER_ISSUED'
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
          include: { order: { select: { orderCode: true, customerName: true, totalAmount: true } }, compensationVoucher: true, issuedVoucher: true },
        });
      })
      : refundCompleted
        ? await prisma.$transaction(async (transaction) => {
          const order = await transaction.order.findUnique({ where: { id: current.orderId }, select: { totalAmount: true, refundedAt: true } });
          if (!order) throw new Error('Refund order not found.');
          const updatedReturn = await transaction.returnRequest.update({
            where: { id },
            data: { status: status as ReturnRequestStatus, adminNote, refundTransferReference, refundCompletedBy: adminEmail },
            include: { order: { select: { orderCode: true, customerName: true, totalAmount: true } }, compensationVoucher: true, issuedVoucher: true },
          });
          await transaction.order.update({
            where: { id: current.orderId },
            data: { paymentStatus: 'REFUNDED', refundAmount: order.totalAmount, refundedAt: order.refundedAt ?? new Date() },
          });
          return updatedReturn;
        })
        : await prisma.returnRequest.update({
        where: { id },
        data: {
          status: status as ReturnRequestStatus,
          adminNote,
          ...(status === 'REFUND_APPROVED' ? { refundApprovedBy: adminEmail, refundApprovedAt: new Date() } : {}),
          ...(['REFUNDED', 'COMPLETED'].includes(status) ? { refundTransferReference, refundCompletedBy: adminEmail } : {}),
        },
        include: { order: { select: { orderCode: true, customerName: true, totalAmount: true } }, compensationVoucher: true, issuedVoucher: true },
      });
    if (refundCompleted) revalidateTag('admin-dashboard');
    await writeAuditLog(request, {
      adminEmail,
      action: status === 'REFUND_APPROVED' ? 'APPROVE_REFUND' : ['REFUNDED', 'COMPLETED'].includes(status) ? 'COMPLETE_REFUND' : status === 'VOUCHER_ISSUED' ? 'ISSUE_COMPENSATION_VOUCHER' : 'UPDATE_RETURN_REQUEST',
      targetEntity: 'ReturnRequest',
      targetId: id,
      oldValue: current,
      newValue: { status, adminNote, compensationVoucherCode: status === 'VOUCHER_ISSUED' ? item.compensationVoucher?.code : undefined, voucherCode: status === 'VOUCHER_ISSUED' ? item.issuedVoucher?.code : undefined, voucherValue: resolutionMethod === 'VOUCHER' ? Number(voucherValue) : undefined, resolutionMethod, refundApprovedBy: status === 'REFUND_APPROVED' ? adminEmail : current.refundApprovedBy, refundCompletedBy: ['REFUNDED', 'COMPLETED'].includes(status) ? adminEmail : undefined, refundTransferReference: refundTransferReference || current.refundTransferReference },
    });
    return NextResponse.json({ item });
  }, 'Return request update failed');
}