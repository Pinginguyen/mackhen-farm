import { randomInt } from 'node:crypto';
import type { ShippingCarrier } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { parseShippingWeightGrams } from '@/lib/shipping';

type ShipmentInput = {
  clientOrderCode: string;
  carrier: ShippingCarrier;
  receiver: { name: string; phone: string; address: string };
  codAmount: number;
  note: string | null;
  products: { name: string; quantity: number; price: number; weightGrams: number }[];
};

type ShipmentResult = {
  trackingCode: string;
  labelUrl: string;
  status: string;
};

export type RealtimeShippingRate = {
  fee: number;
  carrier: 'GHTK' | 'VIETTEL_POST';
  estimatedDays: string;
  source: 'MOCK' | 'GHTK' | 'VIETTEL_POST';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCarrierRegion(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/\b(tinh|thanh pho|tp|quan|q|huyen|thi xa)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function readLocationMap(variableName: string): Record<string, string> {
  const raw = process.env[variableName];
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).flatMap(([key, value]) => {
      const normalizedKey = key.split('|').map(normalizeCarrierRegion).join('|');
      return (typeof value === 'string' || typeof value === 'number') ? [[normalizedKey, String(value)]] : [];
    }));
  } catch {
    throw new Error(`INVALID_${variableName}`);
  }
}

function getViettelPostLocationCodes(province: string, district: string) {
  const normalizedProvince = normalizeCarrierRegion(province);
  const normalizedDistrict = normalizeCarrierRegion(district);
  const provinceCode = readLocationMap('VIETTEL_POST_PROVINCE_IDS')[normalizedProvince];
  const districtCodes = readLocationMap('VIETTEL_POST_DISTRICT_IDS');
  const districtCode = districtCodes[`${normalizedProvince}|${normalizedDistrict}`];
  if (!provinceCode || !districtCode) throw new Error('VIETTEL_POST_LOCATION_MAP_REQUIRED');
  return { provinceCode, districtCode };
}

async function createCarrierShipment(input: ShipmentInput): Promise<ShipmentResult> {
  const apiUrl = process.env.SHIPPING_CARRIER_API_URL;
  const apiToken = process.env.SHIPPING_CARRIER_API_TOKEN;

  if (Boolean(apiUrl) !== Boolean(apiToken)) throw new Error('CARRIER_CONFIGURATION_INCOMPLETE');
  const providerToken = input.carrier === 'GHTK' ? process.env.GHTK_API_TOKEN : process.env.VIETTEL_POST_API_TOKEN;
  if (!apiUrl && providerToken) return createProviderShipment(input);
  if (!apiUrl) {
    const trackingCode = `MOCK-${input.carrier === 'GHTK' ? 'GHTK' : 'VTP'}-${randomInt(10000000, 100000000)}`;
    return {
      trackingCode,
      labelUrl: `/admin/orders/print/${encodeURIComponent(input.clientOrderCode)}#carrier-label`,
      status: 'LABEL_CREATED',
    };
  }

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

function parseCarrierFee(payload: unknown): number | null {
  if (!isRecord(payload)) return null;
  const data = isRecord(payload.data) ? payload.data : payload;
  const rawFee = data.fee ?? data.FEE ?? data.MONEY_TOTAL ?? data.moneyTotal;
  const fee = isRecord(rawFee) ? rawFee.fee ?? rawFee.ship_fee ?? rawFee.MONEY_TOTAL : rawFee;
  return typeof fee === 'number' && Number.isSafeInteger(fee) && fee >= 0 ? fee : null;
}

function mockShippingFee(weightGrams: number): number {
  return 20000 + Math.ceil(weightGrams / 500) * 3000;
}

export async function calculateRealtimeShippingRate({ province, district, weightGrams }: {
  province: string;
  district: string;
  weightGrams: number;
}): Promise<RealtimeShippingRate> {
  const normalizedProvince = province.trim();
  const normalizedDistrict = district.trim();
  if (!normalizedProvince || !normalizedDistrict || !Number.isSafeInteger(weightGrams) || weightGrams < 1 || weightGrams > 500_000) {
    throw new Error('INVALID_SHIPPING_RATE_INPUT');
  }

  const carrier = process.env.SHIPPING_CARRIER?.toUpperCase() === 'VIETTEL_POST' ? 'VIETTEL_POST' : 'GHTK';
  const token = carrier === 'GHTK' ? process.env.GHTK_API_TOKEN : process.env.VIETTEL_POST_API_TOKEN;
  if (!token) {
    return { fee: mockShippingFee(weightGrams), carrier, estimatedDays: carrier === 'GHTK' ? '2-4 ngày' : '1-3 ngày', source: 'MOCK' };
  }

  let response: Response;
  if (carrier === 'GHTK') {
    const baseUrl = process.env.GHTK_API_BASE_URL ?? 'https://services.giaohangtietkiem.vn';
    const pickProvince = process.env.GHTK_PICK_PROVINCE;
    const pickDistrict = process.env.GHTK_PICK_DISTRICT;
    if (!pickProvince || !pickDistrict) throw new Error('GHTK_PICKUP_LOCATION_REQUIRED');
    const url = new URL('/services/shipment/fee', baseUrl);
    url.searchParams.set('pick_province', pickProvince);
    url.searchParams.set('pick_district', pickDistrict);
    url.searchParams.set('province', normalizedProvince);
    url.searchParams.set('district', normalizedDistrict);
    url.searchParams.set('weight', String(weightGrams));
    url.searchParams.set('value', '0');
    response = await fetch(url, { headers: { token }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000) });
  } else {
    const baseUrl = process.env.VIETTEL_POST_API_BASE_URL ?? 'https://partner.viettelpost.vn';
    const senderProvince = process.env.VIETTEL_POST_PICKUP_PROVINCE;
    const senderDistrict = process.env.VIETTEL_POST_PICKUP_DISTRICT;
    if (!senderProvince || !senderDistrict) throw new Error('VIETTEL_POST_PICKUP_LOCATION_REQUIRED');
    const receiver = getViettelPostLocationCodes(normalizedProvince, normalizedDistrict);
    const url = new URL('/v2/order/getPrice', baseUrl);
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: token, 'content-type': 'application/json' },
      body: JSON.stringify({
        PRODUCT_WEIGHT: weightGrams,
        PRODUCT_PRICE: 0,
        MONEY_COLLECTION: 0,
        PRODUCT_TYPE: 'HH',
        NATIONAL_TYPE: 1,
        ORDER_SERVICE: process.env.VIETTEL_POST_SERVICE_CODE ?? 'VCN',
        SENDER_PROVINCE: senderProvince,
        SENDER_DISTRICT: senderDistrict,
        RECEIVER_PROVINCE: receiver.provinceCode,
        RECEIVER_DISTRICT: receiver.districtCode,
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
  }
  if (!response.ok) throw new Error(`CARRIER_RATE_API_FAILED_${response.status}`);
  const fee = parseCarrierFee(await response.json());
  if (fee === null) throw new Error('CARRIER_RATE_API_INVALID_RESPONSE');
  return { fee, carrier, estimatedDays: carrier === 'GHTK' ? '2-4 ngày' : '1-3 ngày', source: carrier };
}

async function createProviderShipment(input: ShipmentInput): Promise<ShipmentResult> {
  const baseUrl = input.carrier === 'GHTK'
    ? process.env.GHTK_API_BASE_URL ?? 'https://services.giaohangtietkiem.vn'
    : process.env.VIETTEL_POST_API_BASE_URL ?? 'https://partner.viettelpost.vn';
  const token = input.carrier === 'GHTK' ? process.env.GHTK_API_TOKEN : process.env.VIETTEL_POST_API_TOKEN;
  const addressParts = input.receiver.address.split(',').map((part) => part.trim());
  const province = addressParts[0] ?? '';
  const district = addressParts[1] ?? '';
  if (input.carrier === 'GHTK' && [process.env.GHTK_PICK_NAME, process.env.GHTK_PICK_ADDRESS, process.env.GHTK_PICK_PHONE, process.env.GHTK_PICK_PROVINCE, process.env.GHTK_PICK_DISTRICT].some((value) => !value?.trim())) {
    throw new Error('GHTK_PICKUP_DETAILS_REQUIRED');
  }
  const receiverCodes = input.carrier === 'VIETTEL_POST' ? getViettelPostLocationCodes(province, district) : null;
  if (input.carrier === 'VIETTEL_POST' && [process.env.VIETTEL_POST_PICKUP_ADDRESS_ID, process.env.VIETTEL_POST_CUSTOMER_ID, process.env.VIETTEL_POST_SENDER_NAME, process.env.VIETTEL_POST_SENDER_PHONE, process.env.VIETTEL_POST_SENDER_ADDRESS, process.env.VIETTEL_POST_PICKUP_PROVINCE, process.env.VIETTEL_POST_PICKUP_DISTRICT].some((value) => !value?.trim())) {
    throw new Error('VIETTEL_POST_SENDER_CONFIGURATION_REQUIRED');
  }
  const response = input.carrier === 'GHTK'
    ? await fetch(new URL('/services/shipment/order', baseUrl), {
      method: 'POST',
      headers: { token: token ?? '', 'content-type': 'application/json', 'idempotency-key': input.clientOrderCode },
      body: JSON.stringify({
        products: input.products.map((product) => ({ name: product.name, quantity: product.quantity, price: product.price, weight: product.weightGrams })),
        order: {
          id: input.clientOrderCode,
          pick_name: process.env.GHTK_PICK_NAME,
          pick_address: process.env.GHTK_PICK_ADDRESS,
          pick_province: process.env.GHTK_PICK_PROVINCE,
          pick_district: process.env.GHTK_PICK_DISTRICT,
          pick_tel: process.env.GHTK_PICK_PHONE,
          name: input.receiver.name,
          address: input.receiver.address,
          province,
          district,
          tel: input.receiver.phone,
          is_freeship: '0',
          pick_money: input.codAmount,
          value: input.products.reduce((sum, product) => sum + product.price * product.quantity, 0),
          note: input.note ?? '',
          transport: 'road',
        },
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
    : await fetch(new URL('/v2/order/createOrder', baseUrl), {
      method: 'POST',
      headers: { Authorization: token ?? '', 'content-type': 'application/json', 'idempotency-key': input.clientOrderCode },
      body: JSON.stringify({
        ORDER_NUMBER: input.clientOrderCode,
        GROUPADDRESS_ID: process.env.VIETTEL_POST_PICKUP_ADDRESS_ID,
        CUS_ID: process.env.VIETTEL_POST_CUSTOMER_ID,
        SENDER_FULLNAME: process.env.VIETTEL_POST_SENDER_NAME,
        SENDER_PHONE: process.env.VIETTEL_POST_SENDER_PHONE,
        SENDER_ADDRESS: process.env.VIETTEL_POST_SENDER_ADDRESS,
        SENDER_PROVINCE: process.env.VIETTEL_POST_PICKUP_PROVINCE,
        SENDER_DISTRICT: process.env.VIETTEL_POST_PICKUP_DISTRICT,
        RECEIVER_FULLNAME: input.receiver.name,
        RECEIVER_PHONE: input.receiver.phone,
        RECEIVER_ADDRESS: input.receiver.address,
        RECEIVER_PROVINCE: receiverCodes?.provinceCode,
        RECEIVER_DISTRICT: receiverCodes?.districtCode,
        PRODUCT_TYPE: 'HH',
        ORDER_SERVICE: process.env.VIETTEL_POST_SERVICE_CODE ?? 'VCN',
        PRODUCT_WEIGHT: input.products.reduce((sum, product) => sum + product.weightGrams * product.quantity, 0),
        MONEY_COLLECTION: input.codAmount,
        ORDER_NOTE: input.note ?? '',
        LIST_ITEM: input.products.map((product) => ({ PRODUCT_NAME: product.name, PRODUCT_QUANTITY: product.quantity, PRODUCT_PRICE: product.price })),
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  if (!response.ok) throw new Error(`CARRIER_API_FAILED_${response.status}`);
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error('CARRIER_API_INVALID_RESPONSE');
  const result = isRecord(payload.order) ? payload.order : isRecord(payload.data) ? payload.data : payload;
  const trackingCode = typeof result.label === 'string' ? result.label.trim()
    : typeof result.ORDER_NUMBER === 'string' ? result.ORDER_NUMBER.trim()
      : typeof result.orderNumber === 'string' ? result.orderNumber.trim() : '';
  if (!trackingCode || payload.success === false || (typeof payload.status === 'number' && payload.status !== 200)) {
    throw new Error('CARRIER_API_INVALID_RESPONSE');
  }
  return {
    trackingCode,
    labelUrl: `/admin/orders/print/${encodeURIComponent(input.clientOrderCode)}#carrier-label`,
    status: typeof result.status === 'string' ? result.status : 'LABEL_CREATED',
  };
}

export async function createShipmentOrder(orderId: string, carrier: ShippingCarrier = 'GHTK') {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { titleSnapshot: true, quantity: true, unitPrice: true, product: { select: { weight: true } }, variant: { select: { weight: true } } } } },
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
    products: order.items.map((item) => ({
      name: item.titleSnapshot,
      quantity: item.quantity,
      price: item.unitPrice,
      weightGrams: parseShippingWeightGrams(item.product?.weight, item.variant?.weight),
    })),
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

export async function pushOrderToCarrierShipment(order: { id: string }, carrier?: ShippingCarrier) {
  const selectedCarrier = carrier ?? (process.env.SHIPPING_CARRIER?.toUpperCase() === 'VIETTEL_POST' ? 'VIETTEL_POST' : 'GHTK');
  return createShipmentOrder(order.id, selectedCarrier);
}