import { Prisma, type InventoryMovementType } from '@prisma/client';

export type RecordInventoryMovementInput = {
  orderId?: string | null;
  productId: string;
  variantId?: string | null;
  lotId?: string | null;
  productionLotId?: string | null;
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

export type FEFOAllocation = {
  lotId: string;
  batchCode: string;
  quantity: number;
  expDate: Date;
};

export async function allocateStockFEFO(
  tx: Prisma.TransactionClient,
  variantId: string | null,
  requestedQty: number,
  context: { productId: string; productName: string; orderId: string; cartItemId: string },
): Promise<FEFOAllocation[]> {
  if (!Number.isSafeInteger(requestedQty) || requestedQty <= 0) {
    throw new Error('FEFO allocation quantity must be a positive safe integer.');
  }

  const now = new Date();
  const lots = await tx.productionLot.findMany({
    where: {
      ...(variantId ? { productVariantId: variantId } : { productId: context.productId, productVariantId: null }),
      status: 'ACTIVE',
      availableQty: { gt: 0 },
      expDate: { gt: now },
    },
    orderBy: [{ expDate: 'asc' }, { mfgDate: 'asc' }, { batchCode: 'asc' }],
    select: { id: true, batchCode: true, availableQty: true, expDate: true },
  });
  if (lots.reduce((total, lot) => total + lot.availableQty, 0) < requestedQty) {
    throw new Error(`INSUFFICIENT_STOCK_LOT:${context.productName}`);
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
      type: 'ALLOCATION',
      delta: -quantity,
      idempotencyKey: `allocation:${context.orderId}:${context.cartItemId}:${lot.id}`,
      reference: `FEFO ${lot.batchCode} for ${context.productName}`,
    });
    allocations.push({ lotId: lot.id, batchCode: lot.batchCode, quantity, expDate: lot.expDate });
    remaining -= quantity;
  }

  if (remaining > 0) throw new Error(`INSUFFICIENT_STOCK_LOT:${context.productName}`);
  return allocations;
}