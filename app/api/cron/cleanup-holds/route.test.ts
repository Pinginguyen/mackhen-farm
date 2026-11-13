import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindMany, orderUpdateMany, productUpdate, variantUpdate, lotUpdate, movementCreateMany, movementFindUnique, prisma, transaction } = vi.hoisted(() => {
  const mocks = {
    orderFindMany: vi.fn(), orderUpdateMany: vi.fn(), productUpdate: vi.fn(), variantUpdate: vi.fn(),
    lotUpdate: vi.fn(), movementCreateMany: vi.fn(), movementFindUnique: vi.fn(),
  };
  const tx = {
    order: { updateMany: mocks.orderUpdateMany },
    product: { update: mocks.productUpdate },
    productVariant: { update: mocks.variantUpdate },
    productionLot: { update: mocks.lotUpdate },
    inventoryMovement: { createMany: mocks.movementCreateMany, findUnique: mocks.movementFindUnique },
  };
  const db = {
    order: { findMany: mocks.orderFindMany },
    $transaction: vi.fn((operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
  };
  return { ...mocks, prisma: db, transaction: tx };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { POST } from './route';

describe('POST /api/cron/cleanup-holds', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    orderFindMany.mockReset().mockResolvedValue([{
      id: 'order-1',
      items: [{ id: 'item-1', productId: 'product-1', productVariantId: 'variant-1', quantity: 2, lotCode: 'LOT-1' }],
    }]);
    orderUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    productUpdate.mockReset().mockResolvedValue({});
    variantUpdate.mockReset().mockResolvedValue({});
    lotUpdate.mockReset().mockResolvedValue({ id: 'lot-1' });
    movementCreateMany.mockReset().mockResolvedValue({ count: 1 });
    movementFindUnique.mockReset().mockResolvedValue({ id: 'movement-1' });
    prisma.$transaction.mockClear();
  });

  it('releases inventory and writes the idempotent RELEASE movement transactionally', async () => {
    const response = await POST(new Request('https://mackhen.example/api/cron/cleanup-holds', {
      method: 'POST', headers: { authorization: 'Bearer test-cron-secret' },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ releasedOrders: 1, releasedUnits: 2 });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { stock: { increment: 2 } } });
    expect(variantUpdate).toHaveBeenCalledWith({ where: { id: 'variant-1' }, data: { inventory: { increment: 2 } } });
    expect(movementCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ type: 'RELEASE', delta: 2, idempotencyKey: 'order-item:item-1:RELEASE', productionLotId: 'lot-1' })],
      skipDuplicates: true,
    }));
  });

  it('rejects unauthorized calls before reading orders', async () => {
    const response = await POST(new Request('https://mackhen.example/api/cron/cleanup-holds', { method: 'POST' }));

    expect(response.status).toBe(401);
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });
});