import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordMovement } from './inventory-ledger';
import type { Prisma } from '@prisma/client';

const { createMany, findUnique } = vi.hoisted(() => ({ createMany: vi.fn(), findUnique: vi.fn() }));
const tx = { inventoryMovement: { createMany, findUnique } } as unknown as Prisma.TransactionClient;

describe('recordMovement', () => {
  beforeEach(() => {
    createMany.mockReset().mockResolvedValue({ count: 1 });
    findUnique.mockReset().mockResolvedValue({ id: 'movement-1', idempotencyKey: 'order-item:item-1:RESERVATION' });
  });

  it('creates a movement once and returns the persisted row', async () => {
    const result = await recordMovement(tx, {
      orderId: 'order-1', productId: 'product-1', variantId: 'variant-1',
      type: 'RESERVATION', delta: -2, idempotencyKey: 'order-item:item-1:RESERVATION',
    });

    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: [expect.objectContaining({ delta: -2, productVariantId: 'variant-1' })] }));
    expect(result.id).toBe('movement-1');
  });

  it('returns the original row on duplicate idempotency key without creating another movement', async () => {
    createMany.mockResolvedValueOnce({ count: 0 });

    await recordMovement(tx, {
      orderId: 'order-1', productId: 'product-1', type: 'RESERVATION', delta: -2,
      idempotencyKey: 'order-item:item-1:RESERVATION',
    });

    expect(createMany).toHaveBeenCalledOnce();
    expect(findUnique).toHaveBeenCalledWith({ where: { idempotencyKey: 'order-item:item-1:RESERVATION' } });
  });

  it('rejects zero or unsafe deltas', async () => {
    await expect(recordMovement(tx, {
      orderId: 'order-1', productId: 'product-1', type: 'RESERVATION', delta: 0, idempotencyKey: 'zero',
    })).rejects.toThrow(/non-zero safe integer/i);
    expect(createMany).not.toHaveBeenCalled();
  });
});