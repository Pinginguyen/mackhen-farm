import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindFirst, orderFindUnique, orderUpdate, returnCreate, returnFindMany, returnFindUnique, returnUpdate, compensationVoucherCreate, voucherFindUnique, voucherFindMany, voucherFindFirst, voucherCreate, requireAdmin, writeAuditLog, transaction, prismaTransaction } = vi.hoisted(() => {
  const mocks = {
    orderFindFirst: vi.fn(), orderFindUnique: vi.fn(), orderUpdate: vi.fn(), returnCreate: vi.fn(), returnFindMany: vi.fn(), returnFindUnique: vi.fn(),
    returnUpdate: vi.fn(), compensationVoucherCreate: vi.fn(), voucherFindUnique: vi.fn(), voucherFindMany: vi.fn(), voucherFindFirst: vi.fn(), voucherCreate: vi.fn(), requireAdmin: vi.fn(), writeAuditLog: vi.fn(),
  };
  const transaction = {
    order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate },
    returnRequest: { update: mocks.returnUpdate },
    compensationVoucher: { create: mocks.compensationVoucherCreate },
    voucher: { findUnique: mocks.voucherFindUnique, findMany: mocks.voucherFindMany, findFirst: mocks.voucherFindFirst, create: mocks.voucherCreate },
  };
  const prismaTransaction = vi.fn((operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction));
  return {
    ...mocks,
    transaction,
    prismaTransaction,
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findFirst: orderFindFirst, findUnique: orderFindUnique, update: orderUpdate },
    returnRequest: { create: returnCreate, findMany: returnFindMany, findUnique: returnFindUnique, update: returnUpdate },
    compensationVoucher: {},
    voucher: { findUnique: voucherFindUnique, findMany: voucherFindMany, findFirst: voucherFindFirst, create: voucherCreate },
    $transaction: prismaTransaction,
  },
}));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

import { GET, PATCH, POST } from './route';

const validReturnRequest = {
  orderCode: 'mkf-123456',
  customerPhone: '0762-793-244',
  issueType: 'Bao bì bị rách hoặc xì chân không',
  description: 'Gói hàng bị rách ở góc.',
  imageUrl: 'https://images.example/evidence.jpg',
};

function makeRequest(method: string, body?: unknown) {
  return new Request('https://mackhen.example/api/returns', {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe('/api/returns', () => {
  beforeEach(() => {
    orderFindFirst.mockReset().mockResolvedValue({ id: 'order-1', phone: '0762 793 244' });
    orderFindUnique.mockReset().mockResolvedValue({ totalAmount: 169000, refundedAt: null });
    orderUpdate.mockReset().mockResolvedValue({});
    returnCreate.mockReset().mockResolvedValue({ id: 'return-1', status: 'PENDING' });
    returnFindMany.mockReset().mockResolvedValue([]);
    returnFindUnique.mockReset().mockResolvedValue({ status: 'PENDING', refundBankName: 'MB', refundAccountNumber: '123', refundAccountHolder: 'A', refundApprovedBy: null, refundApprovedAt: null, refundTransferReference: null });
    returnUpdate.mockReset().mockResolvedValue({ id: 'return-1', status: 'COMPLETED' });
    compensationVoucherCreate.mockReset().mockResolvedValue({ id: 'voucher-1', code: 'MKF50-ABCDEF12' });
    voucherFindUnique.mockReset().mockResolvedValue(null);
    voucherFindMany.mockReset().mockResolvedValue([]);
    voucherFindFirst.mockReset().mockResolvedValue(null);
    voucherCreate.mockReset().mockResolvedValue({ id: 'voucher-2', code: 'COMP-MKF-123456', value: 50000, expiresAt: new Date() });
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
    prismaTransaction.mockClear();
  });

  it('creates a pending request for a matching order and phone', async () => {
    const response = await POST(makeRequest('POST', validReturnRequest));
    const result = await response.json() as { item: { status: string } };

    expect(response.status).toBe(201);
    expect(result.item.status).toBe('PENDING');
    expect(orderFindFirst).toHaveBeenCalledWith({
      where: { OR: [{ orderCode: 'MKF-123456' }, { id: 'mkf-123456' }, { numericCode: 123456 }] },
      select: { id: true, phone: true },
    });
    expect(returnCreate).toHaveBeenCalledWith({ data: {
      orderId: 'order-1',
      customerPhone: '0762793244',
      issueType: validReturnRequest.issueType,
      description: validReturnRequest.description,
      imageUrl: validReturnRequest.imageUrl,
      refundBankName: null,
      refundAccountNumber: null,
      refundAccountHolder: null,
    } });
  });

  it('persists complete optional refund transfer details', async () => {
    const response = await POST(makeRequest('POST', {
      ...validReturnRequest,
      refundBankName: 'MB Bank',
      refundAccountNumber: '0123456789',
      refundAccountHolder: 'NGUYEN VAN A',
    }));

    expect(response.status).toBe(201);
    expect(returnCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      refundBankName: 'MB Bank',
      refundAccountNumber: '0123456789',
      refundAccountHolder: 'NGUYEN VAN A',
    }) });
  });

  it('rejects partial refund transfer details', async () => {
    const response = await POST(makeRequest('POST', { ...validReturnRequest, refundBankName: 'MoMo' }));

    expect(response.status).toBe(400);
    expect(returnCreate).not.toHaveBeenCalled();
  });

  it('rejects a phone number that does not match the order', async () => {
    orderFindFirst.mockResolvedValue({ id: 'order-1', phone: '0762 793 244' });
    const response = await POST(makeRequest('POST', { ...validReturnRequest, customerPhone: '0900000000' }));

    expect(response.status).toBe(404);
    expect(returnCreate).not.toHaveBeenCalled();
  });

  it('rejects unsupported issue types and unsafe evidence URLs', async () => {
    const unsupportedIssue = await POST(makeRequest('POST', { ...validReturnRequest, issueType: 'Other' }));
    const unsafeUrl = await POST(makeRequest('POST', { ...validReturnRequest, imageUrl: 'javascript:alert(1)' }));

    expect(unsupportedIssue.status).toBe(400);
    expect(unsafeUrl.status).toBe(400);
  });

  it('stores a valid Base64 image data URL', async () => {
    const imageUrl = 'data:image/png;base64,aGVsbG8=';
    const response = await POST(makeRequest('POST', { ...validReturnRequest, imageUrl }));

    expect(response.status).toBe(201);
    expect(returnCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ imageUrl }) });
  });

  it('rejects unsupported or malformed Base64 data URLs', async () => {
    const unsupportedType = await POST(makeRequest('POST', { ...validReturnRequest, imageUrl: 'data:image/svg+xml;base64,PHN2Zy8+' }));
    const unsupportedGif = await POST(makeRequest('POST', { ...validReturnRequest, imageUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==' }));
    const malformedData = await POST(makeRequest('POST', { ...validReturnRequest, imageUrl: 'data:image/png;base64,not base64' }));

    expect(unsupportedType.status).toBe(400);
    expect(unsupportedGif.status).toBe(400);
    expect(malformedData.status).toBe(400);
  });

  it('rejects evidence larger than 5 MB', async () => {
    const oversizedImage = `data:image/png;base64,${'A'.repeat(7_000_000)}`;
    const response = await POST(makeRequest('POST', { ...validReturnRequest, imageUrl: oversizedImage }));

    expect(response.status).toBe(400);
    expect(returnCreate).not.toHaveBeenCalled();
  });

  it('rejects malformed values without throwing', async () => {
    const response = await POST(makeRequest('POST', { ...validReturnRequest, orderCode: { trim: 'nope' } }));

    expect(response.status).toBe(400);
    expect(orderFindFirst).not.toHaveBeenCalled();
  });

  it('accepts a pending order when the phone uses the 84 country code', async () => {
    orderFindFirst.mockResolvedValue({ id: 'order-1', phone: '+84 762 793 244', orderStatus: 'PENDING' });
    const response = await POST(makeRequest('POST', { ...validReturnRequest, customerPhone: '0762793244' }));

    expect(response.status).toBe(201);
    expect(returnCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ customerPhone: '0762793244' }) });
  });

  it('requires an admin to list requests', async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 403 }));
    const response = await GET(makeRequest('GET'));

    expect(response.status).toBe(403);
    expect(returnFindMany).not.toHaveBeenCalled();
  });

  it('returns requests with order details for an admin', async () => {
    returnFindMany.mockResolvedValue([{ id: 'return-1', order: { orderCode: 'MKF-123456', customerName: 'Nguyễn An' } }]);
    const response = await GET(makeRequest('GET'));
    const result = await response.json() as { items: { id: string }[] };

    expect(response.status).toBe(200);
    expect(result.items).toHaveLength(1);
    expect(returnFindMany).toHaveBeenCalledWith({
      include: { order: { select: { orderCode: true, customerName: true, totalAmount: true } }, compensationVoucher: true, issuedVoucher: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('falls back to the request list and logs a missing issued-voucher column', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const requestItem = { id: 'return-1', riskTag: null, createdAt: new Date(), order: { orderCode: 'MKF-123456', customerName: 'Nguyễn An', totalAmount: 169000 } };
    returnFindMany
      .mockRejectedValueOnce({ code: 'P2022', meta: { column: 'Voucher.returnRequestId' } })
      .mockResolvedValueOnce([requestItem]);

    try {
      const response = await GET(makeRequest('GET'));
      const result = await response.json() as { items: { id: string; issuedVoucher: null }[] };

      expect(response.status).toBe(200);
      expect(result.items).toEqual([expect.objectContaining({ ...requestItem, createdAt: requestItem.createdAt.toISOString(), issuedVoucher: null })]);
      expect(returnFindMany).toHaveBeenCalledTimes(2);
      expect(voucherFindMany).toHaveBeenCalledWith({ where: { name: { in: ['Voucher đền bù đơn MKF-123456'] } } });
      expect(logError).toHaveBeenCalledWith(expect.stringContaining('apply pending migrations.'), expect.objectContaining({ code: 'P2022' }));
    } finally {
      logError.mockRestore();
    }
  });

  it('updates a request status and admin note for an admin', async () => {
    returnFindUnique.mockResolvedValueOnce({ status: 'REFUND_APPROVED', orderId: 'order-1', refundBankName: 'MB', refundAccountNumber: '123', refundAccountHolder: 'A', refundApprovedBy: 'admin@example.com', refundApprovedAt: new Date(), refundTransferReference: null });
    const response = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'COMPLETED', adminNote: 'Đã hoàn 65.000đ.', refundTransferReference: 'BANK-REF-123' }));

    expect(response.status).toBe(200);
    expect(prismaTransaction).toHaveBeenCalledOnce();
    expect(returnUpdate).toHaveBeenCalledWith({
      where: { id: 'return-1' },
      data: { status: 'COMPLETED', adminNote: 'Đã hoàn 65.000đ.', refundTransferReference: 'BANK-REF-123', refundCompletedBy: 'unknown-admin' },
      include: { order: { select: { orderCode: true, customerName: true, totalAmount: true } }, compensationVoucher: true },
    });
    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { paymentStatus: 'REFUNDED', refundAmount: 169000, refundedAt: expect.any(Date) } });
  });

  it.each(['REPLACEMENT_APPROVED', 'REFUND_APPROVED', 'REJECTED'] as const)(
    'updates %s without selecting the un-migrated issued-voucher relation',
    async (status) => {
      returnFindUnique.mockResolvedValueOnce({
        status: 'PENDING', orderId: 'order-1', customerPhone: '0762793244',
        refundBankName: 'MB', refundAccountNumber: '123', refundAccountHolder: 'A',
        refundApprovedBy: null, refundApprovedAt: null, refundTransferReference: null,
        order: { orderCode: 'MKF-123456', totalAmount: 169000 },
      });
      returnUpdate.mockResolvedValueOnce({
        id: 'return-1', status,
        order: { orderCode: 'MKF-123456', customerName: 'Buyer', totalAmount: 169000 },
      });

      const response = await PATCH(makeRequest('PATCH', { id: 'return-1', status }));

      expect(response.status).toBe(200);
      expect(returnUpdate.mock.calls[0][0].include).not.toHaveProperty('issuedVoucher');
    },
  );

  it('requires a transfer reference before confirming a refund', async () => {
    returnFindUnique.mockResolvedValueOnce({ status: 'REFUND_APPROVED', orderId: 'order-1', refundBankName: 'MB', refundAccountNumber: '123', refundAccountHolder: 'A', refundApprovedBy: 'admin@example.com', refundApprovedAt: new Date(), refundTransferReference: null });
    const response = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'COMPLETED', adminNote: '' }));

    expect(response.status).toBe(400);
    expect(returnUpdate).not.toHaveBeenCalled();
  });

  it('does not allow a pending request to skip approval and become refunded', async () => {
    const response = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'REFUNDED', refundTransferReference: 'BANK-REF-1' }));

    expect(response.status).toBe(409);
    expect(returnUpdate).not.toHaveBeenCalled();
  });

  it('issues a one-use 50% voucher in the same transaction as the request transition', async () => {
    returnFindUnique.mockResolvedValueOnce({
      status: 'PENDING', orderId: 'order-1', customerPhone: '0762793244',
      refundBankName: null, refundAccountNumber: null, refundAccountHolder: null,
      refundApprovedBy: null, refundApprovedAt: null, refundTransferReference: null,
    });
    returnUpdate.mockResolvedValueOnce({ id: 'return-1', status: 'VOUCHER_ISSUED', compensationVoucher: { code: 'MKF50-ABCDEF12' }, order: { orderCode: 'MKF-123456', customerName: 'Buyer' } });
    const response = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'VOUCHER_ISSUED' }));

    expect(response.status).toBe(200);
    expect(compensationVoucherCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ orderId: 'order-1', returnRequestId: 'return-1', customerPhone: '0762793244', discountPercent: 50, code: expect.stringMatching(/^MKF50-[A-F0-9]{8}$/) }),
    }));
    expect(returnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'VOUCHER_ISSUED', adminNote: null },
      include: expect.objectContaining({ compensationVoucher: true }),
    }));
  });

  it('issues a private fixed-value voucher after refund approval in the same transaction', async () => {
    returnFindUnique.mockResolvedValueOnce({
      status: 'REFUND_APPROVED', orderId: 'order-1', customerPhone: '0762793244',
      refundBankName: 'MB', refundAccountNumber: '123', refundAccountHolder: 'A',
      refundApprovedBy: 'admin@example.com', refundApprovedAt: new Date(), refundTransferReference: null,
      order: { orderCode: 'MKF-123456', totalAmount: 169000 },
    });
    returnUpdate.mockResolvedValueOnce({
      id: 'return-1', status: 'VOUCHER_ISSUED',
      issuedVoucher: { code: 'COMP-MKF-123456', value: 50000 },
      order: { orderCode: 'MKF-123456', customerName: 'Buyer', totalAmount: 169000 },
    });
    const response = await PATCH(makeRequest('PATCH', {
      id: 'return-1', status: 'VOUCHER_ISSUED', resolutionMethod: 'VOUCHER', voucherValue: 50000,
    }));

    expect(response.status).toBe(200);
    expect(voucherCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      code: 'COMP-MKF-123456', discountType: 'FIXED', value: 50000,
      minSpend: 0, usageLimit: 1, isActive: true, showOnPromoPage: false,
      returnRequestId: 'return-1', expiresAt: expect.any(Date),
    }) });
    expect(returnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'return-1' },
      data: { status: 'VOUCHER_ISSUED', adminNote: null },
      include: expect.objectContaining({ compensationVoucher: true }),
    }));
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({
      action: 'ISSUE_COMPENSATION_VOUCHER', targetEntity: 'ReturnRequest', targetId: 'return-1',
      newValue: expect.objectContaining({ voucherCode: 'COMP-MKF-123456', voucherValue: 50000, resolutionMethod: 'VOUCHER' }),
    }));
  });

  it('retries voucher issuance without the optional relation when its database column is missing', async () => {
    returnFindUnique.mockResolvedValueOnce({
      status: 'REFUND_APPROVED', orderId: 'order-1', customerPhone: '0762793244',
      refundBankName: 'MB', refundAccountNumber: '123', refundAccountHolder: 'A',
      refundApprovedBy: 'admin@example.com', refundApprovedAt: new Date(), refundTransferReference: null,
      order: { orderCode: 'MKF-123456', totalAmount: 169000 },
    });
    voucherCreate
      .mockRejectedValueOnce({ code: 'P2022', meta: { column: 'Voucher.returnRequestId' } })
      .mockResolvedValueOnce({ id: 'voucher-2', code: 'COMP-MKF-123456', value: 50000 });
    returnUpdate.mockResolvedValueOnce({
      id: 'return-1', status: 'VOUCHER_ISSUED',
      order: { orderCode: 'MKF-123456', customerName: 'Buyer', totalAmount: 169000 },
    });
    const response = await PATCH(makeRequest('PATCH', {
      id: 'return-1', status: 'VOUCHER_ISSUED', resolutionMethod: 'VOUCHER', voucherValue: 50000,
    }));

    expect(response.status).toBe(200);
    expect(prismaTransaction).toHaveBeenCalledTimes(2);
    expect(voucherCreate.mock.calls[0][0].data).toHaveProperty('returnRequestId', 'return-1');
    expect(voucherCreate.mock.calls[1][0].data).not.toHaveProperty('returnRequestId');
    expect(returnUpdate).toHaveBeenCalledOnce();
  });

  it('requires human approval with refund details before allowing refund completion', async () => {
    const approval = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'REFUND_APPROVED', adminNote: 'Đã đối chiếu chứng từ.' }));
    expect(approval.status).toBe(200);
    expect(returnUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REFUND_APPROVED', refundApprovedBy: 'unknown-admin', refundApprovedAt: expect.any(Date) }) }));

    returnFindUnique.mockResolvedValueOnce({ status: 'PENDING', orderId: 'order-1', refundBankName: 'MB', refundAccountNumber: '123', refundAccountHolder: 'A', refundApprovedBy: null, refundApprovedAt: null, refundTransferReference: null });
    const withoutApproval = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'REFUNDED', refundTransferReference: 'REF-1' }));
    expect(withoutApproval.status).toBe(409);
  });

  it('rejects invalid admin status updates', async () => {
    const response = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'PAID' }));

    expect(response.status).toBe(400);
    expect(returnUpdate).not.toHaveBeenCalled();
  });
});