import { createHmac, timingSafeEqual } from 'node:crypto';

const signedFields = [
  'accessKey',
  'amount',
  'extraData',
  'message',
  'orderId',
  'orderInfo',
  'orderType',
  'partnerCode',
  'payType',
  'requestId',
  'responseTime',
  'resultCode',
  'transId',
] as const;

export type MomoIpnPayload = Partial<Record<(typeof signedFields)[number], string | number>> & { signature?: string };

export function createMomoIpnSignature(payload: MomoIpnPayload, accessKey: string, secretKey: string): string {
  const data = signedFields.map((field) => `${field}=${field === 'accessKey' ? accessKey : String(payload[field] ?? '')}`).join('&');
  return createHmac('sha256', secretKey).update(data).digest('hex');
}

export function verifyMomoIpnSignature(payload: MomoIpnPayload, accessKey: string, secretKey: string): boolean {
  if (!payload.signature || !/^[a-f\d]{64}$/i.test(payload.signature)) return false;
  const expected = Buffer.from(createMomoIpnSignature(payload, accessKey, secretKey), 'hex');
  const received = Buffer.from(payload.signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}