import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindMany, orderFindUnique, orderUpdate, paymentUpsert, refundOperationFindFirst, refundOperationCreate, requireAdmin, writeAuditLog, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    orderFindMany: vi.fn(), orderFindUnique: vi.fn(), orderUpdate: vi.fn(), paymentUpsert: vi.fn(),
    refundOperationFindFirst: vi.fn(), refundOperationCreate: vi.fn(), requireAdmin: vi.fn(), writeAuditLog: vi.fn(),
  };
  const tx = { order: { update: mocks.orderUpdate }, payment: { upsert: mocks.paymentUpsert } };
  return {
    ...mocks,
    transaction: tx,
    prisma: {
      order: { findMany: mocks.orderFindMany, findUnique: mocks.orderFindUnique },
      $transaction: vi.fn((operation: (value: typeof tx) => Promise<unknown>) => operation(tx)),
      refundOperation: { findFirst: mocks.refundOperationFindFirst, create: mocks.refundOperationCreate },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));

import { POST } from './route';

function post(body: Record<string, unknown>) {
  return POST(new Request('https://mackhen.example/api/admin/reconciliation', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
}

describe('POST /api/admin/reconciliation', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null);
    orderFindMany.mockReset().mockResolvedValue([]);
    orderFindUnique.mockReset().mockResolvedValue({
      id: 'order-1', orderCode: 'MKF-111111', numericCode: 111111, paymentStatus: 'PENDING',
      orderStatus: 'PENDING', totalAmount: 169000, reconciled: false, payments: [], returnRequests: [],
    });
    orderUpdate.mockReset().mockResolvedValue({});
    paymentUpsert.mockReset().mockResolvedValue({});
    refundOperationFindFirst.mockReset().mockResolvedValue(null);
    refundOperationCreate.mockReset().mockResolvedValue({ id: 'refund-1', status: 'PENDING_APPROVAL', amount: 169000 });
    writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it('refuses to mark an order paid without verified payment evidence', async () => {
    const response = await post({ action: 'RECONCILE', orderCode: 'MKF-111111' });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('PAYMENT_EVIDENCE_MISSING');
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('marks an order paid only when an amount-matching payment record is verified', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'order-1', orderCode: 'MKF-111111', numericCode: 111111, paymentStatus: 'PENDING',
      orderStatus: 'PENDING', totalAmount: 169000, reconciled: false,
      payments: [{ status: 'PAID', amount: 169000 }], returnRequests: [],
    });
    const response = await post({ action: 'RECONCILE', orderCode: 'MKF-111111' });

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'PAID', reconciled: true }) }));
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'RECONCILE_PAYMENT' }));
  });

  it('does not reopen a cancelled order after a late payment', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'order-1', orderCode: 'MKF-111111', numericCode: 111111, paymentStatus: 'PENDING',
      orderStatus: 'CANCELLED', totalAmount: 169000, reconciled: false,
      payments: [{ status: 'PAID', amount: 169000 }], returnRequests: [],
    });
    const response = await post({ action: 'RECONCILE', orderCode: 'MKF-111111' });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('CANCELLED_ORDER_PAID');
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('creates emergency refund instructions in a human-approval state', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'order-1', orderCode: 'MKF-111111', numericCode: 111111, paymentStatus: 'PAID',
      orderStatus: 'CANCELLED', totalAmount: 169000, reconciled: false, payments: [],
      returnRequests: [{ id: 'return-1', status: 'REFUND_APPROVED', refundBankName: 'MB Bank', refundAccountNumber: '123456', refundAccountHolder: 'Customer' }],
    });
    const response = await post({ action: 'PREPARE_REFUND', orderCode: 'MKF-111111', returnRequestId: 'return-1' });

    expect(response.status).toBe(201);
    expect(refundOperationCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_APPROVAL', amount: 169000, reason: 'Hoàn tiền từ Quỹ dự phòng xử lý sự cố đứt gãy kết nối' }) }));
    expect((await response.json()).message).toContain('chưa có giao dịch chuyển tiền nào được gửi');
  });
});
