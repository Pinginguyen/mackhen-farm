import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, orderUpdateMany } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdateMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { order: { findUnique: orderFindUnique, updateMany: orderUpdateMany } },
}));

import { createShipmentOrder } from './shipping-carrier';

const order = {
  id: 'order-id',
  orderCode: 'MKF-123456',
  customerName: 'Nguyen An',
  phone: '0762793244',
  address: 'Son La',
  note: null,
  totalAmount: 125000,
  paymentMethod: 'COD',
  paymentStatus: 'PENDING',
  orderStatus: 'PROCESSING',
  carrier: null,
  trackingCode: null,
  shippingStatus: null,
  shippingLabelUrl: null,
  items: [{ titleSnapshot: 'Snack', quantity: 2, unitPrice: 62500 }],
};

describe('createShipmentOrder', () => {
  beforeEach(() => {
    vi.stubEnv('SHIPPING_CARRIER_API_URL', '');
    vi.stubEnv('SHIPPING_CARRIER_API_TOKEN', '');
    orderFindUnique.mockReset().mockResolvedValue(order);
    orderUpdateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('creates a mock shipment and persists its tracking label details', async () => {
    const shipment = await createShipmentOrder('order-id', 'GHTK');

    expect(shipment).toMatchObject({ carrier: 'GHTK', shippingStatus: 'LABEL_CREATED' });
    expect(shipment.trackingCode).toMatch(/^MOCK-GHTK-\d{8}$/);
    expect(shipment.labelUrl).toContain('/admin/orders/print/MKF-123456#carrier-label');
    expect(orderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'order-id', trackingCode: null },
      data: expect.objectContaining({ carrier: 'GHTK', trackingCode: shipment.trackingCode, shippingLabelUrl: shipment.labelUrl }),
    }));
  });

  it('reuses an existing shipment without calling the carrier again', async () => {
    orderFindUnique.mockResolvedValueOnce({
      ...order,
      carrier: 'VIETTEL_POST',
      trackingCode: 'VTP12345',
      shippingStatus: 'IN_TRANSIT',
      shippingLabelUrl: 'https://carrier.example/labels/VTP12345',
    });

    await expect(createShipmentOrder('order-id', 'GHTK')).resolves.toEqual({
      carrier: 'VIETTEL_POST',
      trackingCode: 'VTP12345',
      shippingStatus: 'IN_TRANSIT',
      labelUrl: 'https://carrier.example/labels/VTP12345',
    });
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });

  it('sends the order idempotency key to a configured carrier adapter', async () => {
    vi.stubEnv('SHIPPING_CARRIER_API_URL', 'https://carrier.example/shipments');
    vi.stubEnv('SHIPPING_CARRIER_API_TOKEN', 'carrier-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      trackingCode: 'GHTK12345',
      labelUrl: 'https://carrier.example/labels/GHTK12345',
      status: 'READY_TO_PICK',
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const shipment = await createShipmentOrder('order-id', 'GHTK');

    expect(shipment.trackingCode).toBe('GHTK12345');
    expect(fetchMock).toHaveBeenCalledWith('https://carrier.example/shipments', expect.objectContaining({
      headers: expect.objectContaining({ 'idempotency-key': 'MKF-123456' }),
    }));
  });
});