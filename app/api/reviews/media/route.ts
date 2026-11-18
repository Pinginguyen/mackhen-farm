import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

function normalizeVietnamesePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('0084') ? `0${digits.slice(4)}` : digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
  return /^0[35789]\d{8}$/.test(national) ? national : null;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Tệp tải lên không hợp lệ.' }, { status: 400 });
  }
  const orderCode = String(form.get('orderCode') ?? '').trim().toUpperCase();
  const productId = String(form.get('productId') ?? '').trim();
  const phone = normalizeVietnamesePhone(String(form.get('phone') ?? ''));
  const file = form.get('file');
  if (!/^MKF-\d{6}$/.test(orderCode) || !productId || !phone || !(file instanceof File)
    || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Chỉ nhận ảnh JPG, PNG hoặc WEBP tối đa 5 MB.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const order = await prisma.order.findUnique({
      where: { orderCode },
      select: { phone: true, orderStatus: true, items: { where: { productId }, select: { id: true }, take: 1 } },
    });
    if (!order || normalizeVietnamesePhone(order.phone) !== phone || !order.items.length || !['DELIVERED', 'COMPLETED'].includes(order.orderStatus)) {
      return NextResponse.json({ error: 'Không thể xác minh đơn hàng và sản phẩm để tải ảnh.' }, { status: 403 });
    }
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const blob = await put(`customer-reviews/${randomUUID()}.${extension}`, file, { access: 'public', addRandomSuffix: false });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  }, 'Review image upload failed');
}