import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const { productFindUnique, productUpdate, variantUpdateMany, productionLotFindUnique, productionLotCreate, productionLotUpdate, orderItemFindMany, requireAdmin, transaction } = vi.hoisted(() => {
  const mocks = {
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  variantUpdateMany: vi.fn(),
  productionLotFindUnique: vi.fn(),
  productionLotCreate: vi.fn(),
  productionLotUpdate: vi.fn(),
  orderItemFindMany: vi.fn(),
  requireAdmin: vi.fn(),
  };
  const tx = {
    product: { findUnique: mocks.productFindUnique, update: mocks.productUpdate },
    productVariant: { updateMany: mocks.variantUpdateMany },
    productionLot: { update: mocks.productionLotUpdate },
  };
  return { ...mocks, transaction: tx };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (operation: unknown) => typeof operation === 'function' ? operation(transaction) : Promise.all(operation as Promise<unknown>[]),
    product: { update: productUpdate },
    productionLot: { findUnique: productionLotFindUnique, create: productionLotCreate, update: productionLotUpdate },
    orderItem: { findMany: orderItemFindMany },
  },
}));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));

import { PATCH } from './route';

describe('PATCH /api/admin/inventory', () => {
  beforeEach(() => {
    productFindUnique.mockReset();
    productUpdate.mockReset();
    variantUpdateMany.mockReset();
    productionLotFindUnique.mockReset();
    productionLotCreate.mockReset().mockResolvedValue({ id: 'lot-1', lotCode: 'LOT-MKF-2026-001' });
    productionLotUpdate.mockReset().mockResolvedValue({});
    orderItemFindMany.mockReset().mockResolvedValue([]);
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue(null);
    productFindUnique.mockResolvedValue({ stock: 12 });
    productUpdate.mockResolvedValue({ id: 'product-1', price: 79000, stock: 24 });
    variantUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('updates product and variant price and stock together', async () => {
    const request = new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', price: 79000, stock: 24 }),
    });
    const response = await PATCH(request);
    const body = await response.json() as { message: string; product: { price: number; stock: number } };

    expect(response.status).toBe(200);
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { price: 79000, stock: 24 } });
    expect(variantUpdateMany).toHaveBeenCalledWith({ where: { productId: 'product-1' }, data: { price: 79000, stock: 24 } });
    expect(body.message).toBe('Đã cập nhật giá và tồn kho thành công!');
  });

  it('applies quick stock deltas without allowing negative inventory', async () => {
    productFindUnique.mockResolvedValue({ stock: 1 });
    productUpdate.mockResolvedValue({ id: 'product-1', price: 79000, stock: 0, active: true });
    const request = new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', stockDelta: -2 }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { stock: 0 } });
    expect(variantUpdateMany).toHaveBeenCalledWith({ where: { productId: 'product-1' }, data: { stock: 0 } });
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
    expect(productionLotCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lotCode: 'LOT-MKF-2026-001', receivedQty: 40, availableQty: 40 }) }));
  });

  it('pauses a lot, hides its product, and returns customers for outreach', async () => {
    productionLotFindUnique.mockResolvedValue({ lotCode: 'LOT-MKF-2026-001', status: 'ACTIVE', productId: 'product-1', product: { id: 'product-1', active: true } });
    orderItemFindMany.mockResolvedValue([{ order: { orderCode: 'MKF-123456', customerName: 'Buyer', phone: '0762793244' } }]);
    const response = await PATCH(new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'PAUSE_LOT', lotCode: 'LOT-MKF-2026-001' }),
    }));

    expect(response.status).toBe(200);
    expect(productionLotUpdate).toHaveBeenCalledWith({ where: { lotCode: 'LOT-MKF-2026-001' }, data: { status: 'RECALLED' } });
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { active: false } });
    expect((await response.json()).affectedCustomers).toHaveLength(1);
  });
});