import { randomUUID } from 'node:crypto';
import { Prisma, type InventoryMovementType } from '@prisma/client';

export type RecordInventoryMovementInput = {
  orderId?: string | null;
  productId: string;
  variantId?: string | null;
  lotId?: string | null;
  productionLotId?: string | null;
  warehouseId?: string | null;
  type: InventoryMovementType;
  delta: number;
  idempotencyKey: string;
  reference?: string | null;
};

export function orderMovementKey(orderItemId: string, type: InventoryMovementType): string {
  return `order-item:${orderItemId}:${type}`;
}

export async function recordMovement(
  tx: Prisma.TransactionClient,
  movement: RecordInventoryMovementInput,
) {
  if (!Number.isSafeInteger(movement.delta) || movement.delta === 0) {
    throw new Error('Inventory movement delta must be a non-zero safe integer.');
  }
  if (!movement.idempotencyKey.trim()) throw new Error('Inventory movement idempotency key is required.');

  await tx.inventoryMovement.createMany({
    data: [{
      orderId: movement.orderId ?? null,
      productId: movement.productId,
      productVariantId: movement.variantId ?? null,
      lotId: movement.lotId ?? movement.productionLotId ?? null,
      warehouseId: movement.warehouseId ?? null,
      type: movement.type,
      delta: movement.delta,
      idempotencyKey: movement.idempotencyKey,
      reference: movement.reference ?? null,
    }],
    skipDuplicates: true,
  });

  const savedMovement = await tx.inventoryMovement.findUnique({
    where: { idempotencyKey: movement.idempotencyKey },
  });
  if (!savedMovement) throw new Error('Inventory movement was not persisted.');
  return savedMovement;
}

export async function restockOrderItemsForReturn(
  tx: Prisma.TransactionClient,
  orderId: string,
  returnRequestId: string,
): Promise<number> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { id: true, productId: true, productVariantId: true, quantity: true, lotId: true, lot: { select: { warehouseId: true } } },
  });
  for (const item of items) {
    await recordMovement(tx, {
      orderId,
      productId: item.productId,
      variantId: item.productVariantId,
      lotId: item.lotId,
      warehouseId: item.lot?.warehouseId,
      type: 'RETURN',
      delta: item.quantity,
      idempotencyKey: `return-request:${returnRequestId}:item:${item.id}:RETURN`,
      reference: `Approved return ${returnRequestId}`,
    });
    await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    if (item.productVariantId) {
      await tx.productVariant.update({ where: { id: item.productVariantId }, data: { inventory: { increment: item.quantity } } });
    }
    if (item.lotId) {
      await tx.productionLot.updateMany({ where: { id: item.lotId }, data: { availableQty: { increment: item.quantity } } });
    }
  }
  return items.reduce((total, item) => total + item.quantity, 0);
}

export type FEFOAllocation = {
  lotId: string;
  batchCode: string;
  quantity: number;
  expDate: Date;
  warehouseId: string | null;
};

function normalizeRegion(value: string | null | undefined): string {
  return value?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/\b(tinh|thanh pho|tp|quan|q|huyen|thi xa)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim() ?? '';
}

function compareWarehouseProximity(
  left: { warehouse: { province: string | null; district: string | null } | null },
  right: { warehouse: { province: string | null; district: string | null } | null },
  province: string,
  district: string,
): number {
  const normalizedProvince = normalizeRegion(province);
  const normalizedDistrict = normalizeRegion(district);
  const rank = (warehouse: typeof left.warehouse) => {
    if (!warehouse) return 2;
    if (normalizeRegion(warehouse.province) === normalizedProvince && normalizeRegion(warehouse.district) === normalizedDistrict) return 0;
    if (normalizeRegion(warehouse.province) === normalizedProvince) return 1;
    return 2;
  };
  return rank(left.warehouse) - rank(right.warehouse);
}

export async function allocateStockFEFO(
  tx: Prisma.TransactionClient,
  variantId: string | null,
  requestedQty: number,
  context: { productId: string; productName: string; orderId: string; cartItemId: string; stockBackedFallback?: boolean; destinationProvince?: string; destinationDistrict?: string },
): Promise<FEFOAllocation[]> {
  if (!Number.isSafeInteger(requestedQty) || requestedQty <= 0) {
    throw new Error('FEFO allocation quantity must be a positive safe integer.');
  }

  const now = new Date();
  let lots = await tx.productionLot.findMany({
    where: {
      ...(variantId ? { productVariantId: variantId } : { productId: context.productId, productVariantId: null }),
      status: 'ACTIVE',
      availableQty: { gt: 0 },
      expDate: { gt: now },
      OR: [{ warehouseId: null }, { warehouse: { is: { active: true } } }],
    },
    orderBy: [{ expDate: 'asc' }, { mfgDate: 'asc' }, { batchCode: 'asc' }],
    select: { id: true, batchCode: true, availableQty: true, expDate: true, warehouseId: true, warehouse: { select: { province: true, district: true } } },
  });
  if (context.destinationProvince && context.destinationDistrict) {
    lots.sort((left, right) => compareWarehouseProximity(left, right, context.destinationProvince!, context.destinationDistrict!)
      || left.expDate.getTime() - right.expDate.getTime()
      || left.batchCode.localeCompare(right.batchCode));
  }
  if (lots.reduce((total, lot) => total + lot.availableQty, 0) < requestedQty) {
    if (!context.stockBackedFallback) throw new Error(`INSUFFICIENT_STOCK_LOT:${context.productName}`);

    const receivedAt = new Date();
    const expDate = new Date(receivedAt);
    expDate.setFullYear(expDate.getFullYear() + 1);
    const fallbackLot = await tx.productionLot.create({
      data: {
        batchCode: `LOT-DEFAULT-${context.productId.slice(-4)}-${Date.now()}`,
        qrToken: randomUUID(),
        productId: context.productId,
        productVariantId: variantId,
        mfgDate: receivedAt,
        expDate,
        receivedQty: 999,
        availableQty: 999,
        status: 'ACTIVE',
      },
      select: { id: true, batchCode: true, availableQty: true, expDate: true, warehouseId: true, warehouse: { select: { province: true, district: true } } },
    });
    lots = [...lots, fallbackLot];
    lots.sort((left, right) => (context.destinationProvince && context.destinationDistrict
      ? compareWarehouseProximity(left, right, context.destinationProvince, context.destinationDistrict)
      : 0)
      || left.expDate.getTime() - right.expDate.getTime()
      || left.batchCode.localeCompare(right.batchCode));
  }

  let remaining = requestedQty;
  const allocations: FEFOAllocation[] = [];
  for (const lot of lots) {
    if (!remaining) break;
    const quantity = Math.min(remaining, lot.availableQty);
    const claimed = await tx.productionLot.updateMany({
      where: { id: lot.id, status: 'ACTIVE', expDate: { gt: now }, availableQty: { gte: quantity } },
      data: { availableQty: { decrement: quantity } },
    });
    if (claimed.count !== 1) throw new Error(`INSUFFICIENT_STOCK_LOT:${context.productName}`);

    await recordMovement(tx, {
      orderId: context.orderId,
      productId: context.productId,
      variantId,
      lotId: lot.id,
      warehouseId: lot.warehouseId,
      type: 'ALLOCATION',
      delta: -quantity,
      idempotencyKey: `allocation:${context.orderId}:${context.cartItemId}:${lot.id}`,
      reference: `FEFO ${lot.batchCode} for ${context.productName}`,
    });
    allocations.push({ lotId: lot.id, batchCode: lot.batchCode, quantity, expDate: lot.expDate, warehouseId: lot.warehouseId });
    remaining -= quantity;
  }

  if (remaining > 0) throw new Error(`INSUFFICIENT_STOCK_LOT:${context.productName}`);
  return allocations;
}