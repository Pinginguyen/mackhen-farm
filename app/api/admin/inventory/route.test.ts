import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const { productFindUnique, productFindMany, productUpdate, variantFindFirst, variantUpdateMany, orderItemGroupBy, productionLotFindUnique, productionLotCreate, productionLotUpdate, movementCreateMany, movementFindUnique, orderItemFindMany, requireAdmin, transaction } = vi.hoisted(() => {
  const mocks = {
  productFindUnique: vi.fn(),
  productFindMany: vi.fn(),
  productUpdate: vi.fn(),
  variantFindFirst: vi.fn(),
  orderItemGroupBy: vi.fn(),
  variantUpdateMany: vi.fn(),
  productionLotFindUnique: vi.fn(),
  productionLotCreate: vi.fn(),
  productionLotUpdate: vi.fn(),
  movementCreateMany: vi.fn(),
  movementFindUnique: vi.fn(),
  orderItemFindMany: vi.fn(),
  requireAdmin: vi.fn(),
  };
  const tx = {
    product: { findUnique: mocks.productFindUnique, update: mocks.productUpdate },
    productVariant: { findFirst: mocks.variantFindFirst, updateMany: mocks.variantUpdateMany },
    productionLot: { create: mocks.productionLotCreate, update: mocks.productionLotUpdate },
    inventoryMovement: { createMany: mocks.movementCreateMany, findUnique: mocks.movementFindUnique },
  };
  return { ...mocks, transaction: tx };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (operation: unknown) => typeof operation === 'function' ? operation(transaction) : Promise.all(operation as Promise<unknown>[]),
    product: { findMany: productFindMany, update: productUpdate },
    orderItem: { groupBy: orderItemGroupBy, findMany: orderItemFindMany },
    productionLot: { findUnique: productionLotFindUnique, create: productionLotCreate, update: productionLotUpdate },
  },
}));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));

import { GET, PATCH } from './route';

describe('PATCH /api/admin/inventory', () => {
  beforeEach(() => {
    productFindUnique.mockReset();
    productUpdate.mockReset();
    variantUpdateMany.mockReset();
    variantFindFirst.mockReset().mockResolvedValue({ id: 'variant-1' });
    productionLotFindUnique.mockReset();
    productionLotCreate.mockReset().mockResolvedValue({ id: 'lot-1', batchCode: 'LOT-MKF-2026-001' });
    productionLotUpdate.mockReset().mockResolvedValue({});
    movementCreateMany.mockReset().mockResolvedValue({ count: 1 });
    movementFindUnique.mockReset().mockResolvedValue({ id: 'movement-1' });
    orderItemFindMany.mockReset().mockResolvedValue([]);
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue(null);
    productFindUnique.mockResolvedValue({ stock: 12, variants: [] });
    productUpdate.mockResolvedValue({ id: 'product-1', price: 79000, stock: 24 });
    variantUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('updates a product without variants', async () => {
    const request = new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', price: 79000, stock: 24 }),
    });
    const response = await PATCH(request);
    const body = await response.json() as { message: string; product: { price: number; stock: number } };

    expect(response.status).toBe(200);
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { price: 79000, stock: 24 } });
    expect(movementCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ type: 'ADJUSTMENT', delta: 12 })] }));
    expect(variantUpdateMany).not.toHaveBeenCalled();
    expect(body.message).toBe('Đã cập nhật giá và tồn kho thành công!');
  });

  it('applies quick stock deltas without allowing negative inventory', async () => {
    productFindUnique.mockResolvedValue({ stock: 1, variants: [] });
    productUpdate.mockResolvedValue({ id: 'product-1', price: 79000, stock: 0, active: true });
    movementFindUnique.mockReset().mockResolvedValueOnce(null).mockResolvedValue({ id: 'movement-1' });
    const request = new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'manual-adjustment-1' },
      body: JSON.stringify({ productId: 'product-1', stockDelta: -2 }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { stock: 0 } });
    expect(movementCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ type: 'ADJUSTMENT', delta: -1, idempotencyKey: 'admin-stock:manual-adjustment-1:product-1' })] }));
    expect(variantUpdateMany).not.toHaveBeenCalled();
  });

  it('does not apply the same stock delta twice when an idempotency key is retried', async () => {
    movementFindUnique.mockResolvedValueOnce({ id: 'movement-1' });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'manual-adjustment-retry' },
      body: JSON.stringify({ productId: 'product-1', stockDelta: -2 }),
    }));

    expect(response.status).toBe(200);
    expect(productUpdate).not.toHaveBeenCalled();
    expect(movementCreateMany).not.toHaveBeenCalled();
  });

  it('requires product variants to be edited through their own controls', async () => {
    productFindUnique.mockResolvedValueOnce({ stock: 12, variants: [{ id: 'variant-1' }] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', stock: 24 }),
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.message).toContain('từng phân loại');
    expect(productUpdate).not.toHaveBeenCalled();
    expect(variantUpdateMany).not.toHaveBeenCalled();
  });

  it('returns the ADMIN guard response without touching product data', async () => {
    requireAdmin.mockResolvedValue(NextResponse.json({ error: 'Truy cập bị từ chối' }, { status: 403 }));
    const request = new Request('https://mackhen.example/api/admin/inventory', { method: 'PATCH' });
    const response = await PATCH(request);

    expect(response.status).toBe(403);
    expect(productUpdate).not.toHaveBeenCalled();
  });

  it('creates an audited lot with all received units available', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'CREATE_LOT', productId: 'product-1', lotCode: 'LOT-MKF-2026-001', mfgDate: '2026-10-01', expDate: '2027-10-01', receivedQty: 40, testReportUrl: 'https://example.test/coa.pdf' }),
    }));

    expect(response.status).toBe(201);
    expect(productionLotCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ batchCode: 'LOT-MKF-2026-001', productVariantId: null, receivedQty: 40, availableQty: 40 }) }));
    expect(movementCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ type: 'RECEIPT', delta: 40, lotId: 'lot-1' })] }));
  });

  it('associates a received lot with its selected product variant', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'CREATE_LOT', productId: 'product-1', productVariantId: 'variant-1', batchCode: 'LOT-MKF-2026-002', mfgDate: '2026-10-01', expDate: '2027-10-01', receivedQty: 24 }),
    }));

    expect(response.status).toBe(201);
    expect(variantFindFirst).toHaveBeenCalledWith({ where: { id: 'variant-1', productId: 'product-1' }, select: { id: true } });
    expect(productionLotCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ productVariantId: 'variant-1', batchCode: 'LOT-MKF-2026-002' }) }));
    expect(movementCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ productVariantId: 'variant-1', lotId: 'lot-1', type: 'RECEIPT' })] }));
  });

  it('pauses a lot, hides its product, and returns customers for outreach', async () => {
    productionLotFindUnique.mockResolvedValue({ batchCode: 'LOT-MKF-2026-001', id: 'lot-1', status: 'ACTIVE', productId: 'product-1', product: { id: 'product-1', active: true } });
    orderItemFindMany.mockResolvedValue([{ order: { orderCode: 'MKF-123456', customerName: 'Buyer', phone: '0762793244' } }]);
    const response = await PATCH(new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'PAUSE_LOT', lotCode: 'LOT-MKF-2026-001' }),
    }));

    expect(response.status).toBe(200);
    expect(productionLotUpdate).toHaveBeenCalledWith({ where: { batchCode: 'LOT-MKF-2026-001' }, data: { status: 'RECALLED' } });
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { active: false } });
    expect((await response.json()).affectedCustomers).toHaveLength(1);
  });
});

describe('GET /api/admin/inventory', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null);
    productFindMany.mockReset().mockResolvedValue([
      { id: 'plain', name: 'Plain', stock: 25, active: true, variants: [], productionLots: [] },
      { id: 'variants', name: 'Variants', stock: 99, active: true, variants: [{ inventory: 8 }, { inventory: 7 }], productionLots: [] },
    ]);
    orderItemGroupBy.mockReset().mockResolvedValue([{ productId: 'plain', _sum: { quantity: 6 } }, { productId: 'variants', _sum: { quantity: 4 } }]);
  });

  it('calculates ATP from physical inventory and open order commitments', async () => {
    const response = await GET(new Request('https://mackhen.example/api/admin/inventory'));
    const body = await response.json() as { items: { id: string; stock: number; committed: number; available: number }[] };

    expect(response.status).toBe(200);
    expect(orderItemGroupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { order: { orderStatus: { in: ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING'] } } },
      _sum: { quantity: true },
    }));
    expect(body.items).toEqual([
      expect.objectContaining({ id: 'plain', stock: 25, committed: 6, available: 19 }),
      expect.objectContaining({ id: 'variants', stock: 15, committed: 4, available: 11 }),
    ]);
  });
});