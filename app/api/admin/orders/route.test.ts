import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindMany, orderFindUnique, orderUpdate, orderUpdateMany, productUpdate, variantUpdate, lotUpdateMany, requireAdmin, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    orderFindMany: vi.fn(), orderFindUnique: vi.fn(), orderUpdate: vi.fn(), orderUpdateMany: vi.fn(),
    productUpdate: vi.fn(), variantUpdate: vi.fn(), lotUpdateMany: vi.fn(), requireAdmin: vi.fn(),
  };
  const tx = {
    order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate, updateMany: mocks.orderUpdateMany },
    product: { update: mocks.productUpdate },
    productVariant: { update: mocks.variantUpdate },
    productionLot: { updateMany: mocks.lotUpdateMany },
  };
  const db = { order: { findMany: mocks.orderFindMany, findUnique: mocks.orderFindUnique, update: mocks.orderUpdate, updateMany: mocks.orderUpdateMany }, $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)) };
  return { ...mocks, transaction: tx, prisma: db };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));

import { GET, PATCH } from './route';

describe('/api/admin/orders', () => {
  beforeEach(() => {
    orderFindMany.mockReset().mockResolvedValue([]);
    orderFindUnique.mockReset().mockResolvedValue({ orderStatus: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'COD', carrier: null, trackingCode: null, deliveredAt: null, items: [] });
    orderUpdate.mockReset().mockResolvedValue({ orderCode: 'MKF-100001', orderStatus: 'SHIPPING', paymentStatus: 'PENDING', carrier: null, trackingCode: null });
    orderUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    productUpdate.mockReset().mockResolvedValue({});
    variantUpdate.mockReset().mockResolvedValue({});
    lotUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    prisma.$transaction.mockClear();
    requireAdmin.mockReset().mockResolvedValue(null);
  });

  it('filters by order/customer/phone, pending state, payment, and date range', async () => {
    const response = await GET(new Request('https://mackhen.example/api/admin/orders?q=linh&status=PENDING&paymentMethod=COD&from=2026-10-01&to=2026-10-02'));

    expect(response.status).toBe(200);
    expect(orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { OR: [
            { orderCode: { contains: 'linh', mode: 'insensitive' } },
            { customerName: { contains: 'linh', mode: 'insensitive' } },
            { phone: { contains: 'linh' } },
          ] },
          { OR: [
            { orderStatus: { in: ['PENDING', 'CONFIRMED'] } },
            { paymentStatus: 'PENDING', orderStatus: { not: 'CANCELLED' } },
          ] },
        ],
        paymentMethod: 'COD',
        createdAt: { gte: new Date('2026-10-01T00:00:00.000Z'), lt: new Date('2026-10-03T00:00:00.000Z') },
      },
    }));
  });

  it('filters paid and return-request workflow tabs without a fixed take limit', async () => {
    await GET(new Request('https://mackhen.example/api/admin/orders?status=PAID'));
    expect(orderFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { AND: [{ paymentStatus: 'PAID' }] } }));
    expect(orderFindMany.mock.lastCall?.[0]).not.toHaveProperty('take');

    await GET(new Request('https://mackhen.example/api/admin/orders?status=RETURNS'));
    expect(orderFindMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { AND: [{ OR: [{ warrantyRequest: { is: { status: 'OPEN' } } }, { returnRequests: { some: { status: 'PENDING' } } }] }] },
    }));
  });

  it('accepts Viettel Post when handing an order to shipping', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'IN_TRANSIT', paymentStatus: 'PAID', paymentMethod: 'VIETQR', carrier: 'VIETTEL_POST', trackingCode: 'VT-OLD', deliveredAt: null, items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: ' mkf-100001 ', status: 'SHIPPING', carrier: 'VIETTEL_POST', trackingCode: 'VT12345' }),
    }));

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { orderCode: 'MKF-100001' },
      data: expect.objectContaining({ orderStatus: 'SHIPPING', carrier: 'VIETTEL_POST', trackingCode: 'VT12345', deliveredAt: null }),
    });
  });

  it('generates an SPX tracking code when handing an order to 3PL without one', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'PROCESSING', paymentStatus: 'PENDING', paymentMethod: 'COD', carrier: null, trackingCode: null, deliveredAt: null, items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'HANDED_OFF', carrier: 'SPX' }),
    }));

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ orderStatus: 'HANDED_OFF', carrier: 'SPX', trackingCode: expect.stringMatching(/^SPX\d{11}$/) }),
    }));
  });

  it.each(['DELIVERED', 'COMPLETED'])('marks a %s order paid automatically', async (status) => {
    orderFindUnique.mockResolvedValueOnce({
      orderStatus: status === 'DELIVERED' ? 'IN_TRANSIT' : 'DELIVERED',
      paymentStatus: 'PENDING', paymentMethod: 'COD', carrier: 'SPX', trackingCode: 'SPX12345', deliveredAt: null, items: [],
    });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status, paymentStatus: 'PENDING' }),
    }));

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ orderStatus: status, paymentStatus: 'PAID' }),
    }));
  });

  it('lets an admin manually mark a VietQR order as paid', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'VIETQR', carrier: null, trackingCode: null, deliveredAt: null, items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'PAID', paymentStatus: 'PAID', paymentReason: 'Đối soát sao kê khớp' }),
    }));

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ orderStatus: 'PAID', paymentStatus: 'PAID' }),
    }));
  });

  it('blocks delivery of an unpaid online order until an admin confirms payment', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'IN_TRANSIT', paymentStatus: 'PENDING', paymentMethod: 'VIETQR', carrier: 'SPX', trackingCode: 'SPX12345', deliveredAt: null, items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'DELIVERED' }),
    }));

    expect(response.status).toBe(409);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('does not allow a cancelled order to move back into delivery', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'CANCELLED', paymentStatus: 'PENDING', paymentMethod: 'COD', carrier: null, trackingCode: null, deliveredAt: null, items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'SHIPPING', carrier: 'SPX', trackingCode: 'SPX12345' }),
    }));

    expect(response.status).toBe(409);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'CANCELLED', 'PROCESSING'])('blocks a shipping order from moving to %s', async (status) => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'SHIPPING', paymentStatus: 'PAID', paymentMethod: 'VIETQR', carrier: 'SPX', trackingCode: 'SPX12345', deliveredAt: null, items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status }),
    }));

    expect(response.status).toBe(409);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('allows a same-state shipping update to save current carrier and tracking data', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'SHIPPING', paymentStatus: 'PAID', paymentMethod: 'VIETQR', carrier: 'SPX', trackingCode: 'SPX-OLD', deliveredAt: null, phone: '0762793244', address: 'Lai Chau', note: null, items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'SHIPPING', carrier: 'SPX', trackingCode: 'SPX-NEW' }),
    }));

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orderStatus: 'SHIPPING', trackingCode: 'SPX-NEW' }) }));
  });

  it('does not allow a returned order to resume shipping', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'RETURNED', paymentStatus: 'PAID', paymentMethod: 'VIETQR', carrier: null, trackingCode: null, deliveredAt: null, items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'SHIPPING', carrier: 'SPX', trackingCode: 'SPX12345' }),
    }));

    expect(response.status).toBe(409);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('rejects backward transitions from completed orders', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'COD', carrier: null, trackingCode: null, deliveredAt: new Date(), items: [] });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'PENDING' }),
    }));

    expect(response.status).toBe(409);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('restocks product, variant, and production lot once when an order is returned', async () => {
    orderFindUnique.mockResolvedValueOnce({
      orderStatus: 'SHIPPING', paymentStatus: 'PAID', paymentMethod: 'VIETQR', carrier: 'SPX', trackingCode: 'SPX12345', deliveredAt: null,
      items: [{ productId: 'product-1', productVariantId: 'variant-1', quantity: 2, lotCode: 'LOT-1' }],
    });
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'RETURNED' }),
    }));

    expect(response.status).toBe(200);
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { orderCode: 'MKF-100001', orderStatus: 'SHIPPING' },
      data: { orderStatus: 'RETURNED' },
    });
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { stock: { increment: 2 } } });
    expect(variantUpdate).toHaveBeenCalledWith({ where: { id: 'variant-1' }, data: { inventory: { increment: 2 } } });
    expect(lotUpdateMany).toHaveBeenCalledWith({ where: { lotCode: 'LOT-1' }, data: { availableQty: { increment: 2 } } });

    orderFindUnique.mockResolvedValueOnce({
      orderStatus: 'RETURNED', paymentStatus: 'PAID', paymentMethod: 'VIETQR', carrier: null, trackingCode: null, deliveredAt: null,
      items: [{ productId: 'product-1', productVariantId: 'variant-1', quantity: 2, lotCode: 'LOT-1' }],
    });
    await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'RETURNED' }),
    }));
    expect(productUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not restock when a concurrent return request loses the status claim', async () => {
    orderFindUnique.mockResolvedValueOnce({
      orderStatus: 'SHIPPING', paymentStatus: 'PAID', paymentMethod: 'VIETQR', carrier: 'SPX', trackingCode: 'SPX12345', deliveredAt: null,
      items: [{ productId: 'product-1', productVariantId: 'variant-1', quantity: 2, lotCode: 'LOT-1' }],
    });
    orderUpdateMany.mockResolvedValueOnce({ count: 0 });

    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'RETURNED' }),
    }));

    expect(response.status).toBe(409);
    expect(productUpdate).not.toHaveBeenCalled();
    expect(variantUpdate).not.toHaveBeenCalled();
    expect(lotUpdateMany).not.toHaveBeenCalled();
  });

  it('requires a cancellation reason before changing order state', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'CANCELLED' }),
    }));

    expect(response.status).toBe(400);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('cancels an eligible order, restocks inventory transactionally, and accepts a reason', async () => {
    orderFindUnique.mockResolvedValueOnce({
      orderStatus: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'COD', carrier: null, trackingCode: null, deliveredAt: null,
      phone: '0762793244', address: 'Lai Chau', note: null,
      items: [{ productId: 'product-1', productVariantId: 'variant-1', quantity: 2, lotCode: 'LOT-1' }],
    });
    orderUpdate.mockResolvedValueOnce({ orderCode: 'MKF-100001', orderStatus: 'CANCELLED', paymentStatus: 'PENDING', carrier: null, trackingCode: null });

    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'CANCELLED', cancelReason: 'Khách đổi ý' }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'CANCELLED' });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { stock: { increment: 2 } } });
    expect(variantUpdate).toHaveBeenCalledWith({ where: { id: 'variant-1' }, data: { inventory: { increment: 2 } } });
    expect(lotUpdateMany).toHaveBeenCalledWith({ where: { lotCode: 'LOT-1' }, data: { availableQty: { increment: 2 } } });
  });
});