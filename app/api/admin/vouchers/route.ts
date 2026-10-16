import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

type VoucherDraft = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  usageLimit: number | null;
  expiresAt: Date;
  isActive: boolean;
  freeShipping: boolean;
  firstOrderOnly: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDraft(value: unknown): { draft: VoucherDraft; error?: never } | { draft?: never; error: string } {
  if (!isRecord(value)) return { error: 'Dữ liệu voucher không hợp lệ.' };
  const code = typeof value.code === 'string' ? value.code.trim().toUpperCase() : '';
  const discountType = value.discountType;
  const numeric = (field: unknown) => typeof field === 'number' || (typeof field === 'string' && field.trim() !== '') ? Number(field) : NaN;
  const amount = numeric(value.value);
  const rawMaxDiscount = value.maxDiscount == null || value.maxDiscount === '' ? null : numeric(value.maxDiscount);
  const minSpend = value.minSpend == null ? 0 : numeric(value.minSpend);
  const rawUsageLimit = value.usageLimit == null || value.usageLimit === '' ? null : numeric(value.usageLimit);
  const rawExpiry = value.expiresAt;
  const expiresAt = typeof rawExpiry === 'string' && rawExpiry.trim() ? new Date(rawExpiry) : null;
  const isActive = value.isActive === undefined ? true : value.isActive;
  const freeShipping = value.freeShipping === undefined ? false : value.freeShipping;
  const firstOrderOnly = value.firstOrderOnly === undefined ? false : value.firstOrderOnly;

  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) return { error: 'Mã voucher phải có từ 3 đến 32 ký tự chữ, số, gạch ngang hoặc gạch dưới.' };
  if (discountType !== 'PERCENTAGE' && discountType !== 'FIXED') return { error: 'Loại giảm giá không hợp lệ.' };
  if (!Number.isSafeInteger(amount) || amount < 1 || (discountType === 'PERCENTAGE' && amount > 100)) return { error: 'Giá trị giảm không hợp lệ.' };
  if (discountType === 'PERCENTAGE' && rawMaxDiscount === null) return { error: 'Voucher giảm theo phần trăm bắt buộc có mức giảm tối đa.' };
  if (rawMaxDiscount !== null && (!Number.isSafeInteger(rawMaxDiscount) || rawMaxDiscount < 1)) return { error: 'Mức giảm tối đa không hợp lệ.' };
  if (!Number.isSafeInteger(minSpend) || minSpend < 0) return { error: 'Đơn hàng tối thiểu không hợp lệ.' };
  if (rawUsageLimit !== null && (!Number.isSafeInteger(rawUsageLimit) || rawUsageLimit < 1)) return { error: 'Giới hạn số lượt dùng phải lớn hơn 0.' };
  if (rawExpiry != null && typeof rawExpiry !== 'string') return { error: 'Hạn sử dụng không hợp lệ.' };
  if (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) return { error: 'Hạn sử dụng phải là thời điểm hợp lệ trong tương lai.' };
  if (typeof isActive !== 'boolean' || typeof freeShipping !== 'boolean' || typeof firstOrderOnly !== 'boolean') return { error: 'Trạng thái voucher không hợp lệ.' };
  if (freeShipping && discountType !== 'FIXED') return { error: 'Voucher miễn phí vận chuyển phải dùng loại giảm số tiền cố định.' };

  return {
    draft: {
      code,
      discountType,
      value: amount,
      maxDiscount: discountType === 'PERCENTAGE' ? rawMaxDiscount : null,
      minSpend,
      usageLimit: rawUsageLimit,
      expiresAt,
      isActive,
      freeShipping,
      firstOrderOnly,
    },
  };
}

function hasDraft(parsed: ReturnType<typeof parseDraft>): parsed is { draft: VoucherDraft; error?: never } {
  return parsed.draft !== undefined;
}

function isUniqueConstraint(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function auditValue(voucher: Omit<VoucherDraft, 'expiresAt'> & { expiresAt: Date | null }) {
  return { ...voucher, expiresAt: voucher.expiresAt?.toISOString() ?? null };
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return withDatabase(async () => {
    const items = await prisma.voucher.findMany({ orderBy: [{ isActive: 'desc' }, { code: 'asc' }] });
    return NextResponse.json({ items });
  }, 'Admin voucher listing failed');
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu voucher không hợp lệ.' }, { status: 400 });
  }
  const parsed = parseDraft(body);
  if (!hasDraft(parsed)) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const draft = parsed.draft;

  return withDatabase(async () => {
    try {
      const item = await prisma.voucher.create({ data: draft });
      await writeAuditLog(request, {
        adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
        action: 'CREATE_VOUCHER',
        targetEntity: 'Voucher',
        targetId: item.id,
        newValue: auditValue(draft),
      });
      return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
      if (isUniqueConstraint(error)) return NextResponse.json({ error: 'Mã voucher đã tồn tại.' }, { status: 409 });
      throw error;
    }
  }, 'Admin voucher creation failed');
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu voucher không hợp lệ.' }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.id !== 'string' || !body.id.trim()) return NextResponse.json({ error: 'Thiếu mã voucher cần cập nhật.' }, { status: 400 });
  const voucherId = body.id.trim();
  const parsed = parseDraft(body);
  if (!hasDraft(parsed)) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const draft = parsed.draft;

  return withDatabase(async () => {
    try {
      const item = await prisma.voucher.update({ where: { id: voucherId }, data: draft });
      await writeAuditLog(request, {
        adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
        action: 'UPDATE_VOUCHER',
        targetEntity: 'Voucher',
        targetId: item.id,
        newValue: auditValue(draft),
      });
      return NextResponse.json({ item });
    } catch (error) {
      if (isUniqueConstraint(error)) return NextResponse.json({ error: 'Mã voucher đã tồn tại.' }, { status: 409 });
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') return NextResponse.json({ error: 'Không tìm thấy voucher.' }, { status: 404 });
      throw error;
    }
  }, 'Admin voucher update failed');
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!id) return NextResponse.json({ error: 'Thiếu mã voucher cần xóa.' }, { status: 400 });

  return withDatabase(async () => {
    try {
      const item = await prisma.voucher.delete({ where: { id } });
      await writeAuditLog(request, {
        adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
        action: 'DELETE_VOUCHER',
        targetEntity: 'Voucher',
        targetId: item.id,
        oldValue: auditValue(item),
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') return NextResponse.json({ error: 'Không tìm thấy voucher.' }, { status: 404 });
      throw error;
    }
  }, 'Admin voucher deletion failed');
}