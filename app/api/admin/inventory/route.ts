import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { recordMovement } from '@/lib/services/inventory-ledger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return withDatabase(async () => {
    const [items, committedRows] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true, name: true, category: true, price: true, unit: true, stock: true, active: true, image: true,
          variants: { select: { id: true, title: true, inventory: true, sku: true } },
          productionLots: { select: { id: true, batchCode: true, productVariantId: true, mfgDate: true, expDate: true, receivedQty: true, availableQty: true, status: true, testReportUrl: true, receivingNote: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { orderStatus: { in: ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING'] } } },
        _sum: { quantity: true },
      }),
    ]);
    const committedByProduct = new Map(committedRows.map((row) => [row.productId, row._sum.quantity ?? 0]));
    return NextResponse.json({ items: items.map((item) => {
      const stock = item.variants.length ? item.variants.reduce((total, variant) => total + variant.inventory, 0) : item.stock;
      const committed = committedByProduct.get(item.id) ?? 0;
      return {
        ...item,
        stock,
        committed,
        available: stock - committed,
        status: stock < 10 ? 'LOW_STOCK' : 'ACTIVE',
        productionLots: item.productionLots.map((lot) => ({
          ...lot,
          status: lot.expDate <= new Date() ? 'EXPIRED' : lot.availableQty < 10 && lot.status === 'ACTIVE' ? 'LOW_STOCK' : lot.status,
        })),
      };
    }) });
  });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const payload: unknown = await request.json();
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return NextResponse.json({ error: { message: 'Dữ liệu yêu cầu không hợp lệ.' } }, { status: 400 });
    }
    const body = payload as { action?: string; productId?: string; productVariantId?: unknown; price?: number; stock?: number; stockDelta?: number; active?: boolean; batchCode?: string; lotCode?: string; mfgDate?: string; expDate?: string; receivedQty?: number; testReportUrl?: string; receivingNote?: string };
    const adminEmail = getRequestSession(request)?.email ?? 'unknown-admin';
    const suppliedIdempotencyKey = request.headers.get('idempotency-key')?.trim();
    const adjustmentKey = suppliedIdempotencyKey && suppliedIdempotencyKey.length <= 160 ? suppliedIdempotencyKey : randomUUID();

    if (body.action === 'CREATE_LOT') {
      const batchCode = (body.batchCode ?? body.lotCode)?.trim().toUpperCase() ?? '';
      const mfgDate = typeof body.mfgDate === 'string' ? new Date(body.mfgDate) : new Date(NaN);
      const expDate = typeof body.expDate === 'string' ? new Date(body.expDate) : new Date(NaN);
      const testReportUrl = body.testReportUrl?.trim() || null;
      if (!body.productId || !/^LOT-[A-Z0-9-]{4,60}$/.test(batchCode)
        || !Number.isSafeInteger(body.receivedQty) || (body.receivedQty ?? 0) < 1
        || !Number.isFinite(mfgDate.getTime()) || !Number.isFinite(expDate.getTime()) || mfgDate > expDate || expDate <= new Date()
        || (testReportUrl !== null && (testReportUrl.length > 2048 || !/^https?:\/\//i.test(testReportUrl)))
        || (body.receivingNote != null && (typeof body.receivingNote !== 'string' || body.receivingNote.length > 2000))) {
        return NextResponse.json({ error: { message: 'Mã lô, số lượng, ngày sản xuất/hạn dùng hoặc hồ sơ kiểm nghiệm không hợp lệ.' } }, { status: 400 });
      }
      return withDatabase(async () => {
        const productVariantId = typeof body.productVariantId === 'string' && body.productVariantId.trim() ? body.productVariantId.trim() : null;
        if (body.productVariantId != null && typeof body.productVariantId !== 'string') {
          return NextResponse.json({ error: { message: 'Phân loại sản phẩm không hợp lệ.' } }, { status: 400 });
        }
        const result = await prisma.$transaction(async (transaction) => {
          if (productVariantId) {
            const variant = await transaction.productVariant.findFirst({ where: { id: productVariantId, productId: body.productId }, select: { id: true } });
            if (!variant) return { error: 'VARIANT_NOT_FOUND' as const };
          }
          const createdLot = await transaction.productionLot.create({
            data: { batchCode, productId: body.productId!, productVariantId, mfgDate, expDate, receivedQty: body.receivedQty!, availableQty: body.receivedQty!, testReportUrl, receivingNote: body.receivingNote?.trim() || null },
          });
          await recordMovement(transaction, {
            productId: body.productId!,
            variantId: productVariantId,
            lotId: createdLot.id,
            type: 'RECEIPT',
            delta: body.receivedQty!,
            idempotencyKey: `production-lot:${batchCode}:RECEIPT`,
            reference: `Lot receipt ${batchCode}`,
          });
          return { lot: createdLot };
        });
        if ('error' in result) return NextResponse.json({ error: { message: 'Phân loại không thuộc sản phẩm đã chọn.' } }, { status: 400 });
        await writeAuditLog(request, { adminEmail, action: 'CREATE_PRODUCTION_LOT', targetEntity: 'Inventory', targetId: result.lot.batchCode, newValue: result.lot });
        return NextResponse.json({ lot: { ...result.lot, lotCode: result.lot.batchCode } }, { status: 201 });
      });
    }

    if (body.action === 'PAUSE_LOT') {
      const batchCode = (body.batchCode ?? body.lotCode)?.trim().toUpperCase() ?? '';
      if (!/^LOT-[A-Z0-9-]{4,60}$/.test(batchCode)) return NextResponse.json({ error: { message: 'Mã lô không hợp lệ.' } }, { status: 400 });
      return withDatabase(async () => {
        const lot = await prisma.productionLot.findUnique({ where: { batchCode }, include: { product: { select: { id: true, active: true } } } });
        if (!lot) return NextResponse.json({ error: { message: 'Không tìm thấy lô sản xuất.' } }, { status: 404 });
        const customers = await prisma.orderItem.findMany({
          where: { lotId: lot.id },
          select: { order: { select: { orderCode: true, customerName: true, phone: true } } },
        });
        await prisma.$transaction([
          prisma.productionLot.update({ where: { batchCode }, data: { status: 'RECALLED' } }),
          prisma.product.update({ where: { id: lot.productId }, data: { active: false } }),
        ]);
        await writeAuditLog(request, { adminEmail, action: 'PAUSE_LOT', targetEntity: 'Inventory', targetId: batchCode, oldValue: { status: lot.status, productActive: lot.product.active }, newValue: { status: 'RECALLED', productActive: false } });
        const uniqueCustomers = [...new Map(customers.map(({ order }) => [order.phone, order])).values()];
        return NextResponse.json({ success: true, batchCode, lotCode: batchCode, affectedCustomers: uniqueCustomers });
      });
    }

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
      const result = await prisma.$transaction(async (transaction) => {
        const current = await transaction.product.findUnique({ where: { id: body.productId }, select: { id: true, stock: true, price: true, active: true, variants: { select: { id: true } } } });
        if (!current) return null;
        if (current.variants?.length && (hasPrice || hasStock || hasStockDelta)) return { variantManaged: true as const };
        if (hasStockDelta && suppliedIdempotencyKey && suppliedIdempotencyKey.length <= 160) {
          const previousMovement = await transaction.inventoryMovement.findUnique({
            where: { idempotencyKey: `admin-stock:${adjustmentKey}:${body.productId}` },
          });
          if (previousMovement) return { product: current, current, duplicate: true as const };
        }
        const data: { price?: number; stock?: number; active?: boolean } = {};
        if (hasPrice) data.price = body.price;
        if (hasStock) data.stock = body.stock;
        if (hasStockDelta) data.stock = Math.max(0, current.stock + body.stockDelta!);
        if (hasActive) data.active = body.active;
        const updated = await transaction.product.update({ where: { id: body.productId }, data });
        const stockDelta = updated.stock - current.stock;
        if (stockDelta !== 0) {
          await recordMovement(transaction, {
            productId: body.productId!,
            type: 'ADJUSTMENT',
            delta: stockDelta,
            idempotencyKey: `admin-stock:${adjustmentKey}:${body.productId}`,
            reference: `Manual inventory adjustment by ${adminEmail}`,
          });
        }
        return { product: updated, current };
      });
      if (!result) return NextResponse.json({ error: { message: 'Không tìm thấy sản phẩm.' } }, { status: 404 });
      if ('variantManaged' in result) return NextResponse.json({ error: { message: 'Hãy chỉnh giá và tồn kho trong từng phân loại của sản phẩm.' } }, { status: 409 });
      const { product, current } = result;
      await writeAuditLog(request, {
        adminEmail,
        action: hasPrice ? 'UPDATE_PRICE' : hasStock || hasStockDelta ? 'ADJUST_STOCK' : 'UPDATE_PRODUCT_STATUS',
        targetEntity: 'Product',
        targetId: product.id,
        oldValue: current,
        newValue: { price: product.price, stock: product.stock, active: product.active },
      });
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