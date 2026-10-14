import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return withDatabase(async () => {
  const items = await prisma.product.findMany({ select: { id: true, name: true, category: true, price: true, unit: true, stock: true, active: true, image: true }, orderBy: { name: 'asc' } });
  return NextResponse.json({ items: items.map((item) => ({ ...item, status: item.stock < 50 ? 'Sắp hết' : 'Còn hàng' })) });
  });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json() as { productId?: string; price?: number; stock?: number; stockDelta?: number; active?: boolean };
    const hasPrice = body.price !== undefined;
    const hasStock = body.stock !== undefined;
    const hasStockDelta = body.stockDelta !== undefined;
    const hasActive = body.active !== undefined;
    const validPrice = !hasPrice || (Number.isInteger(body.price) && body.price! >= 0);
    const validStock = !hasStock || (Number.isInteger(body.stock) && body.stock! >= 0);
    const validDelta = !hasStockDelta || Number.isInteger(body.stockDelta);
    if (!body.productId || !validPrice || !validStock || !validDelta || (hasActive && typeof body.active !== 'boolean') || Number(hasPrice) + Number(hasStockDelta) + Number(hasActive) > 1 || (!hasPrice && !hasStock && !hasStockDelta && !hasActive)) {
      return NextResponse.json({ error: { message: 'Mã sản phẩm, giá bán hoặc số lượng tồn kho không hợp lệ.' } }, { status: 400 });
    }
    return withDatabase(async () => {
      const product = await prisma.$transaction(async (transaction) => {
        const current = await transaction.product.findUnique({ where: { id: body.productId }, select: { stock: true } });
        if (!current) return null;
        const data: { price?: number; stock?: number; active?: boolean } = {};
        if (hasPrice) data.price = body.price;
        if (hasStock) data.stock = body.stock;
        if (hasStockDelta) data.stock = Math.max(0, current.stock + body.stockDelta!);
        if (hasActive) data.active = body.active;
        const updated = await transaction.product.update({ where: { id: body.productId }, data });
        const variantData: { price?: number; stock?: number } = {};
        if (hasPrice) variantData.price = body.price;
        if (hasStock || hasStockDelta) variantData.stock = updated.stock;
        if (Object.keys(variantData).length) await transaction.productVariant.updateMany({ where: { productId: updated.id }, data: variantData });
        return updated;
      });
      if (!product) return NextResponse.json({ error: { message: 'Không tìm thấy sản phẩm.' } }, { status: 404 });
      const message = hasActive
        ? (product.active ? 'Đã mở bán sản phẩm.' : 'Đã tạm ẩn sản phẩm.')
        : 'Đã cập nhật giá và tồn kho thành công!';
      return NextResponse.json({ message, product: { id: product.id, price: product.price, stock: product.stock, active: product.active } });
    });
  } catch (error) {
    console.error('Inventory adjustment failed:', error);
    return NextResponse.json({ error: { message: 'Không thể cập nhật tồn kho.' } }, { status: 500 });
  }
}