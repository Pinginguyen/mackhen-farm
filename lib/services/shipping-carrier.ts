import { randomInt } from 'node:crypto';
import type { ShippingCarrier } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type ShipmentInput = {
  clientOrderCode: string;
  carrier: ShippingCarrier;
  receiver: { name: string; phone: string; address: string };
  codAmount: number;
  note: string | null;
  products: { name: string; quantity: number; price: number }[];
};

type ShipmentResult = {
  trackingCode: string;
  labelUrl: string;
  status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function createCarrierShipment(input: ShipmentInput): Promise<ShipmentResult> {
  const apiUrl = process.env.SHIPPING_CARRIER_API_URL;
  const apiToken = process.env.SHIPPING_CARRIER_API_TOKEN;

  if (!apiUrl && !apiToken) {
    const trackingCode = `MOCK-${input.carrier === 'GHTK' ? 'GHTK' : 'VTP'}-${randomInt(10000000, 100000000)}`;
    return {
      trackingCode,
      labelUrl: `/admin/orders/print/${encodeURIComponent(input.clientOrderCode)}#carrier-label`,
      status: 'LABEL_CREATED',
    };
  }
  if (!apiUrl || !apiToken) throw new Error('CARRIER_CONFIGURATION_INCOMPLETE');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiToken}`,
      'content-type': 'application/json',
      'idempotency-key': input.clientOrderCode,
    },
    body: JSON.stringify(input),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`CARRIER_API_FAILED_${response.status}`);

  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error('CARRIER_API_INVALID_RESPONSE');
  const trackingCode = typeof payload.trackingCode === 'string' ? payload.trackingCode.trim() : '';
  const labelUrl = typeof payload.labelUrl === 'string' ? payload.labelUrl.trim() : '';
  const status = typeof payload.status === 'string' ? payload.status.trim() : 'LABEL_CREATED';
  if (!trackingCode || !labelUrl) throw new Error('CARRIER_API_INVALID_RESPONSE');

  return { trackingCode, labelUrl, status };
}

export async function createShipmentOrder(orderId: string, carrier: ShippingCarrier = 'GHTK') {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { titleSnapshot: true, quantity: true, unitPrice: true } } },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.trackingCode && order.carrier && order.shippingLabelUrl) {
    return {
      trackingCode: order.trackingCode,
      carrier: order.carrier,
      shippingStatus: order.shippingStatus ?? 'LABEL_CREATED',
      labelUrl: order.shippingLabelUrl,
    };
  }
  if (['CANCELLED', 'RETURNED'].includes(order.orderStatus)) throw new Error('ORDER_NOT_SHIPPABLE');
  if (order.paymentMethod !== 'COD' && order.paymentStatus !== 'PAID') throw new Error('ORDER_PAYMENT_PENDING');

  const shipment = await createCarrierShipment({
    clientOrderCode: order.orderCode,
    carrier,
    receiver: { name: order.customerName, phone: order.phone, address: order.address },
    codAmount: order.paymentMethod === 'COD' ? order.totalAmount : 0,
    note: order.note,
    products: order.items.map((item) => ({ name: item.titleSnapshot, quantity: item.quantity, price: item.unitPrice })),
  });

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, trackingCode: null },
    data: {
      carrier,
      trackingCode: shipment.trackingCode,
      shippingStatus: shipment.status,
      shippingLabelUrl: shipment.labelUrl,
    },
  });
  if (claimed.count !== 1) {
    const latest = await prisma.order.findUnique({ where: { id: order.id } });
    if (latest?.trackingCode && latest.carrier && latest.shippingLabelUrl) {
      return {
        trackingCode: latest.trackingCode,
        carrier: latest.carrier,
        shippingStatus: latest.shippingStatus ?? 'LABEL_CREATED',
        labelUrl: latest.shippingLabelUrl,
      };
    }
    throw new Error('SHIPMENT_SAVE_CONFLICT');
  }

  return {
    trackingCode: shipment.trackingCode,
    carrier,
    shippingStatus: shipment.status,
    labelUrl: shipment.labelUrl,
  };
}