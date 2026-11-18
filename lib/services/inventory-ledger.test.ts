import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allocateStockFEFO, recordMovement } from './inventory-ledger';
import type { Prisma } from '@prisma/client';

const { createMany, findUnique, lotFindMany, lotCreate, lotUpdateMany } = vi.hoisted(() => ({
  createMany: vi.fn(),
  findUnique: vi.fn(),
  lotFindMany: vi.fn(),
  lotCreate: vi.fn(),
  lotUpdateMany: vi.fn(),
}));
const tx = {
  inventoryMovement: { createMany, findUnique },
  productionLot: { findMany: lotFindMany, create: lotCreate, updateMany: lotUpdateMany },
} as unknown as Prisma.TransactionClient;

describe('recordMovement', () => {
  beforeEach(() => {
    createMany.mockReset().mockResolvedValue({ count: 1 });
    findUnique.mockReset().mockResolvedValue({ id: 'movement-1', idempotencyKey: 'order-item:item-1:RESERVATION' });
    lotFindMany.mockReset().mockResolvedValue([]);
    lotCreate.mockReset();
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

  it('prioritizes the nearest warehouse before expiry date and records its warehouse ID', async () => {
    lotFindMany.mockResolvedValueOnce([
      { id: 'lot-near', batchCode: 'NEAR', availableQty: 2, expDate: new Date('2027-02-01T00:00:00.000Z'), warehouseId: 'warehouse-hcm', warehouse: { province: 'Thành phố Hồ Chí Minh', district: 'Quận 1' } },
      { id: 'lot-far', batchCode: 'FAR', availableQty: 2, expDate: new Date('2027-01-01T00:00:00.000Z'), warehouseId: 'warehouse-son-la', warehouse: { province: 'Tỉnh Sơn La', district: 'Huyện Vân Hồ' } },
    ]);

    const allocations = await allocateStockFEFO(tx, 'variant-1', 1, {
      orderId: 'order-1', productId: 'product-1', productName: 'Khô bò thực vật', cartItemId: 'cart-item-2',
      destinationProvince: 'Thành phố Hồ Chí Minh', destinationDistrict: 'Quận 1',
    });

    expect(allocations[0]).toMatchObject({ lotId: 'lot-near', warehouseId: 'warehouse-hcm' });
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ lotId: 'lot-near', warehouseId: 'warehouse-hcm' })] }));
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

  it('creates and allocates a default lot when checkout has already confirmed aggregate stock', async () => {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    lotCreate.mockResolvedValueOnce({
      id: 'lot-default', batchCode: 'LOT-DEFAULT-duct-1795000000000', availableQty: 999,
      expDate: expiry, warehouseId: null, warehouse: null,
    });

    const allocations = await allocateStockFEFO(tx, null, 2, {
      orderId: 'order-1', productId: 'product', productName: 'Hạt dổi', cartItemId: 'cart-item-1', stockBackedFallback: true,
    });

    expect(lotCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        batchCode: expect.stringMatching(/^LOT-DEFAULT-duct-\d+$/),
        qrToken: expect.any(String),
        productId: 'product',
        receivedQty: 999,
        availableQty: 999,
        status: 'ACTIVE',
      }),
    }));
    expect(allocations).toMatchObject([{ lotId: 'lot-default', quantity: 2 }]);
    expect(lotUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'lot-default', availableQty: { gte: 2 } }),
      data: { availableQty: { decrement: 2 } },
    }));
  });
});