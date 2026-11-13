import { Prisma, type InventoryMovementType } from '@prisma/client';

export type RecordInventoryMovementInput = {
  orderId?: string | null;
  productId: string;
  variantId?: string | null;
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
      productionLotId: movement.productionLotId ?? null,
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