import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allocateStockFEFO, recordMovement } from './inventory-ledger';
import type { Prisma } from '@prisma/client';

const { createMany, findUnique, lotFindMany, lotUpdateMany } = vi.hoisted(() => ({
  createMany: vi.fn(),
  findUnique: vi.fn(),
  lotFindMany: vi.fn(),
  lotUpdateMany: vi.fn(),
}));
const tx = {
  inventoryMovement: { createMany, findUnique },
  productionLot: { findMany: lotFindMany, updateMany: lotUpdateMany },
} as unknown as Prisma.TransactionClient;

describe('recordMovement', () => {
  beforeEach(() => {
    createMany.mockReset().mockResolvedValue({ count: 1 });
    findUnique.mockReset().mockResolvedValue({ id: 'movement-1', idempotencyKey: 'order-item:item-1:RESERVATION' });
    lotFindMany.mockReset().mockResolvedValue([]);
    lotUpdateMany.mockReset().mockResolvedValue({ count: 1 });
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

  it('allocates across the earliest-expiring lots and records lot-linked movements', async () => {
    const earliestExpiry = new Date('2027-01-01T00:00:00.000Z');
    const laterExpiry = new Date('2027-02-01T00:00:00.000Z');
    lotFindMany.mockResolvedValueOnce([
      { id: 'lot-first', batchCode: 'LOT-FIRST', availableQty: 2, expDate: earliestExpiry },
      { id: 'lot-second', batchCode: 'LOT-SECOND', availableQty: 4, expDate: laterExpiry },
    ]);

    const allocations = await allocateStockFEFO(tx, 'variant-1', 5, {
      orderId: 'order-1', productId: 'product-1', productName: 'Hạt dổi', cartItemId: 'cart-item-1',
    });

    expect(lotFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ productVariantId: 'variant-1', availableQty: { gt: 0 }, expDate: { gt: expect.any(Date) } }),
      orderBy: [{ expDate: 'asc' }, { mfgDate: 'asc' }, { batchCode: 'asc' }],
    }));
    expect(allocations.map((allocation) => [allocation.batchCode, allocation.quantity])).toEqual([['LOT-FIRST', 2], ['LOT-SECOND', 3]]);
    expect(lotUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'lot-first', status: 'ACTIVE', expDate: { gt: expect.any(Date) }, availableQty: { gte: 2 } },
      data: { availableQty: { decrement: 2 } },
    }));
    expect(createMany).toHaveBeenCalledTimes(2);
    expect(createMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: [expect.objectContaining({ orderId: 'order-1', lotId: 'lot-first', type: 'ALLOCATION', delta: -2 })] }));
    expect(createMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: [expect.objectContaining({ orderId: 'order-1', lotId: 'lot-second', type: 'ALLOCATION', delta: -3 })] }));
  });

  it('rejects before changing lots when eligible lot stock is insufficient', async () => {
    lotFindMany.mockResolvedValueOnce([{ id: 'lot-short', batchCode: 'LOT-SHORT', availableQty: 1, expDate: new Date('2027-01-01T00:00:00.000Z') }]);

    await expect(allocateStockFEFO(tx, null, 2, {
      orderId: 'order-1', productId: 'product-1', productName: 'Hạt dổi', cartItemId: 'cart-item-1',
    })).rejects.toThrow('INSUFFICIENT_STOCK_LOT:Hạt dổi');
    expect(lotFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ productId: 'product-1', productVariantId: null }) }));
    expect(lotUpdateMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});