import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, paymentFindUnique, paymentUpdate, paymentCreate, orderUpdate, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    orderFindUnique: vi.fn(),
    paymentFindUnique: vi.fn(),
    paymentUpdate: vi.fn(),
    paymentCreate: vi.fn(),
    orderUpdate: vi.fn(),
  };
  const tx = { payment: { findUnique: mocks.paymentFindUnique, update: mocks.paymentUpdate, create: mocks.paymentCreate }, order: { update: mocks.orderUpdate } };
  return {
    ...mocks,
    transaction: tx,
    prisma: {
      order: { findUnique: mocks.orderFindUnique },
      $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { createMomoIpnSignature } from '@/lib/momo-ipn';
import { POST } from './route';

const accessKey = 'test-access-key';
const secretKey = 'test-secret-key';
const partnerCode = 'MKFTEST';

function signedPayload(resultCode = 0, amount = 169000) {
  const payload = {
    accessKey,
    amount,
    extraData: '',
    message: resultCode === 0 ? 'Successful.' : 'User cancelled.',
    orderId: 'MKF-123456',
    orderInfo: 'MKF-123456',
    orderType: 'momo_wallet',
    partnerCode,
    payType: 'webApp',
    requestId: 'MKF-123456',
    responseTime: 1792080000000,
    resultCode,
    transId: '987654321',
  };
  return { ...payload, signature: createMomoIpnSignature(payload, accessKey, secretKey) };
}

function request(payload: unknown) {
  return new Request('https://mackhen.example/api/payment/momo/ipn', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

describe('POST /api/payment/momo/ipn', () => {
  beforeEach(() => {
    vi.stubEnv('MOMO_ACCESS_KEY', accessKey);
    vi.stubEnv('MOMO_SECRET_KEY', secretKey);
    vi.stubEnv('MOMO_PARTNER_CODE', partnerCode);
    orderFindUnique.mockReset().mockResolvedValue({
      id: 'order-1', orderCode: 'MKF-123456', numericCode: 123456, paymentMethod: 'MOMO',
      paymentStatus: 'PENDING', orderStatus: 'PENDING', totalAmount: 169000,
    });
    paymentFindUnique.mockReset().mockResolvedValue(null);
    paymentUpdate.mockReset();
    paymentCreate.mockReset().mockResolvedValue({ id: 'payment-1' });
    orderUpdate.mockReset().mockResolvedValue({ id: 'order-1' });
    prisma.$transaction.mockClear();
  });

  it('marks the order paid only for a signed successful callback with matching amount', async () => {
    const response = await POST(request(signedPayload()));

    expect(response.status).toBe(200);
    expect(paymentCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 'order-1', orderCode: 123456, amount: 169000, status: 'PAID' }) });
    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { paymentStatus: 'PAID', orderStatus: 'PROCESSING', holdExpiresAt: null } });
  });

  it('acknowledges a signed cancellation without changing order or payment state', async () => {
    const response = await POST(request(signedPayload(1006)));

    expect(response.status).toBe(200);
    expect(orderFindUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature before database access', async () => {
    const payload = signedPayload();
    const response = await POST(request({ ...payload, signature: '0'.repeat(64) }));

    expect(response.status).toBe(401);
    expect(orderFindUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a successful callback with a mismatched amount', async () => {
    const response = await POST(request(signedPayload(0, 1000)));

    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});