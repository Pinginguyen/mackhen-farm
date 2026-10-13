import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

export function GET() {
  return withDatabase(async () => {
  const items = await prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, stock: true }, orderBy: { name: 'asc' } });
  return NextResponse.json({ items: items.map((item) => ({ ...item, status: item.stock < 50 ? 'Sắp hết' : 'Còn hàng' })) });
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { productId?: string; stock?: number };
    if (!body.productId || !Number.isInteger(body.stock) || body.stock! < 0) {
      return NextResponse.json({ error: { message: 'Mã sản phẩm hoặc số lượng tồn kho không hợp lệ.' } }, { status: 400 });
    }
    return withDatabase(async () => {
      const product = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.product.update({ where: { id: body.productId }, data: { stock: body.stock! } });
        await transaction.productVariant.updateMany({ where: { productId: updated.id }, data: { stock: body.stock! } });
        return updated;
      });
      return NextResponse.json({ id: product.id, stock: product.stock });
    });
  } catch (error) {
    console.error('Inventory adjustment failed:', error);
    return NextResponse.json({ error: { message: 'Không thể cập nhật tồn kho.' } }, { status: 500 });
  }
}