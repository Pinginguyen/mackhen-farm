import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, orderUpdateMany } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdateMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { order: { findUnique: orderFindUnique, updateMany: orderUpdateMany } },
}));

import { calculateRealtimeShippingRate, createShipmentOrder } from './shipping-carrier';

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

describe('calculateRealtimeShippingRate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns a marked mock rate when partner credentials are absent', async () => {
    vi.stubEnv('GHTK_API_TOKEN', '');
    vi.stubEnv('VIETTEL_POST_API_TOKEN', '');

    await expect(calculateRealtimeShippingRate({ province: 'Sơn La', district: 'Vân Hồ', weightGrams: 500 }))
      .resolves.toMatchObject({ fee: 23000, carrier: 'GHTK', source: 'MOCK' });
  });

  it('uses the GHTK fee API and parses its nested fee value', async () => {
    vi.stubEnv('SHIPPING_CARRIER', 'GHTK');
    vi.stubEnv('GHTK_API_TOKEN', 'ghtk-token');
    vi.stubEnv('GHTK_PICK_PROVINCE', 'Sơn La');
    vi.stubEnv('GHTK_PICK_DISTRICT', 'Vân Hồ');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, fee: { fee: 42000 } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(calculateRealtimeShippingRate({ province: 'Hồ Chí Minh', district: 'Quận 1', weightGrams: 750 }))
      .resolves.toMatchObject({ fee: 42000, carrier: 'GHTK', source: 'GHTK' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/services/shipment/fee?');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: { token: 'ghtk-token' }, cache: 'no-store' });
  });

  it('maps destination names to Viettel Post codes before requesting a rate', async () => {
    vi.stubEnv('SHIPPING_CARRIER', 'VIETTEL_POST');
    vi.stubEnv('VIETTEL_POST_API_TOKEN', 'viettel-token');
    vi.stubEnv('VIETTEL_POST_PICKUP_PROVINCE', '14');
    vi.stubEnv('VIETTEL_POST_PICKUP_DISTRICT', '120');
    vi.stubEnv('VIETTEL_POST_PROVINCE_IDS', JSON.stringify({ 'Hồ Chí Minh': '2' }));
    vi.stubEnv('VIETTEL_POST_DISTRICT_IDS', JSON.stringify({ 'Hồ Chí Minh|Quận 1': '10' }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 200, data: { MONEY_TOTAL: 31000 } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(calculateRealtimeShippingRate({ province: 'Thành phố Hồ Chí Minh', district: 'Quận 1', weightGrams: 750 }))
      .resolves.toMatchObject({ fee: 31000, carrier: 'VIETTEL_POST', source: 'VIETTEL_POST' });
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(requestBody).toMatchObject({ RECEIVER_PROVINCE: '2', RECEIVER_DISTRICT: '10', PRODUCT_WEIGHT: 750 });
  });
});