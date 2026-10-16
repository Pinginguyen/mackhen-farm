import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, orderUpdate, returnFindUnique, returnUpdate, voucherCreate, requireAdmin, writeAuditLog, prisma } = vi.hoisted(() => {
  const mocks = {
    orderFindUnique: vi.fn(), orderUpdate: vi.fn(), returnFindUnique: vi.fn(), returnUpdate: vi.fn(),
    voucherCreate: vi.fn(), requireAdmin: vi.fn(), writeAuditLog: vi.fn(),
  };
  const db = {
    order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate },
    product: { update: vi.fn() },
    productVariant: { update: vi.fn() },
    productionLot: { updateMany: vi.fn() },
    returnRequest: { findUnique: mocks.returnFindUnique, update: mocks.returnUpdate },
    compensationVoucher: { create: vi.fn() },
    voucher: { create: mocks.voucherCreate },
    $transaction: vi.fn((operation: (transaction: typeof db) => Promise<unknown>) => operation(db)),
  };
  return { ...mocks, prisma: db };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));
vi.mock('@/lib/auth', () => ({ getRequestSession: () => ({ email: 'admin@example.com' }) }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

import { PATCH as patchOrder } from './route';
import { PATCH as patchReturn } from '../../returns/route';
import { POST as createVoucher } from '../vouchers/route';

function makeRequest(method: string, body: unknown, path: string) {
  return new Request(`https://mackhen.example${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validVoucher = {
  code: 'SAFETY2026', discountType: 'PERCENTAGE', value: 20, maxDiscount: 50000,
  minSpend: 100000, usageLimit: 10, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true, freeShipping: false, firstOrderOnly: false,
};

describe('admin operational safety', () => {
  beforeEach(() => {
    orderFindUnique.mockReset().mockResolvedValue({
      orderStatus: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'COD',
      phone: '0762793244', address: 'Địa chỉ cũ', note: null, carrier: null, trackingCode: null, deliveredAt: null, items: [],
    });
    orderUpdate.mockReset().mockImplementation(({ where, data }) => Promise.resolve({ orderCode: where.orderCode, ...data }));
    returnFindUnique.mockReset().mockResolvedValue({
      status: 'REFUND_APPROVED', orderId: 'order-1', customerPhone: '0762793244',
      refundBankName: 'MB', refundAccountNumber: '123456', refundAccountHolder: 'Nguyen An',
      refundApprovedBy: 'admin@example.com', refundApprovedAt: new Date(), refundTransferReference: null,
    });
    returnUpdate.mockReset().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data, order: { orderCode: 'MKF-100001', customerName: 'Nguyen An' }, compensationVoucher: null }));
    voucherCreate.mockReset().mockImplementation(({ data }) => Promise.resolve({ id: 'voucher-1', ...data }));
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it('blocks a shipping order from returning to pending or cancellation', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'SHIPPING', paymentStatus: 'PAID', paymentMethod: 'VIETQR', carrier: 'SPX', trackingCode: 'SPX12345', deliveredAt: null, items: [] });
    const response = await patchOrder(makeRequest('PATCH', { orderCode: 'MKF-100001', status: 'CANCELLED' }, '/api/admin/orders'));

    expect(response.status).toBe(409);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('allows recipient edits before handoff and rejects them after shipping begins', async () => {
    const updateResponse = await patchOrder(makeRequest('PATCH', {
      orderCode: 'MKF-100001', status: 'PENDING', phone: '0351234567', address: '12 Đường Mới, Lai Châu',
    }, '/api/admin/orders'));
    expect(updateResponse.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ phone: '0351234567', address: '12 Đường Mới, Lai Châu' }) }));

    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'SHIPPING', paymentStatus: 'PAID', paymentMethod: 'COD', carrier: 'SPX', trackingCode: 'SPX12345', deliveredAt: null, items: [] });
    const lockedResponse = await patchOrder(makeRequest('PATCH', { orderCode: 'MKF-100001', phone: '0351234567' }, '/api/admin/orders'));
    expect(lockedResponse.status).toBe(409);
  });

  it('requires a transfer reference to complete a refund and audits the completion', async () => {
    const missingReference = await patchReturn(makeRequest('PATCH', { id: 'return-1', status: 'COMPLETED' }, '/api/returns'));
    expect(missingReference.status).toBe(400);
    expect(returnUpdate).not.toHaveBeenCalled();

    const completed = await patchReturn(makeRequest('PATCH', { id: 'return-1', status: 'COMPLETED', refundTransferReference: 'MB-REF-7821', adminNote: 'Đã đối soát' }, '/api/returns'));
    expect(completed.status).toBe(200);
    expect(returnUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ refundTransferReference: 'MB-REF-7821', refundCompletedBy: 'admin@example.com', adminNote: 'Đã đối soát' }) }));
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'COMPLETE_REFUND', adminEmail: 'admin@example.com' }));
  });

  it('rejects percentage vouchers without a cap or a future expiry', async () => {
    const missingCap = await createVoucher(makeRequest('POST', { ...validVoucher, maxDiscount: null }, '/api/admin/vouchers'));
    const expired = await createVoucher(makeRequest('POST', { ...validVoucher, expiresAt: '2020-01-01T00:00:00.000Z' }, '/api/admin/vouchers'));

    expect(missingCap.status).toBe(400);
    expect(expired.status).toBe(400);
    expect(voucherCreate).not.toHaveBeenCalled();
  });

  it('requires a reason for manual VietQR payment confirmation and stores it in the order note', async () => {
    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'VIETQR', phone: '0762793244', address: 'Địa chỉ', note: null, carrier: null, trackingCode: null, deliveredAt: null, items: [] });
    const missingReason = await patchOrder(makeRequest('PATCH', { orderCode: 'MKF-100001', status: 'PENDING', paymentStatus: 'PAID' }, '/api/admin/orders'));
    expect(missingReason.status).toBe(400);

    orderFindUnique.mockResolvedValueOnce({ orderStatus: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'VIETQR', phone: '0762793244', address: 'Địa chỉ', note: null, carrier: null, trackingCode: null, deliveredAt: null, items: [] });
    const confirmed = await patchOrder(makeRequest('PATCH', { orderCode: 'MKF-100001', status: 'PENDING', paymentStatus: 'PAID', paymentReason: 'Đối soát sao kê khớp' }, '/api/admin/orders'));
    expect(confirmed.status).toBe(200);
    expect(orderUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'PAID', note: expect.stringContaining('Đối soát sao kê khớp') }) }));
  });

  it('writes an audit entry for order status changes and voucher creation', async () => {
    const statusResponse = await patchOrder(makeRequest('PATCH', { orderCode: 'MKF-100001', status: 'PROCESSING' }, '/api/admin/orders'));
    const voucherResponse = await createVoucher(makeRequest('POST', validVoucher, '/api/admin/vouchers'));

    expect(statusResponse.status).toBe(200);
    expect(voucherResponse.status).toBe(201);
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'UPDATE_ORDER_STATUS', oldValue: expect.objectContaining({ orderStatus: 'PENDING' }), newValue: expect.objectContaining({ orderStatus: 'PROCESSING' }) }));
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'CREATE_VOUCHER', targetEntity: 'Voucher' }));
  });
});