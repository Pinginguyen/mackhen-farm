import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindFirst, returnCreate, returnFindMany, returnUpdate, requireAdmin } = vi.hoisted(() => ({
  orderFindFirst: vi.fn(),
  returnCreate: vi.fn(),
  returnFindMany: vi.fn(),
  returnUpdate: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findFirst: orderFindFirst },
    returnRequest: { create: returnCreate, findMany: returnFindMany, update: returnUpdate },
  },
}));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

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
    returnCreate.mockReset().mockResolvedValue({ id: 'return-1', status: 'PENDING' });
    returnFindMany.mockReset().mockResolvedValue([]);
    returnUpdate.mockReset().mockResolvedValue({ id: 'return-1', status: 'REFUNDED' });
    requireAdmin.mockReset().mockResolvedValue(null);
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
    } });
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
    const malformedData = await POST(makeRequest('POST', { ...validReturnRequest, imageUrl: 'data:image/png;base64,not base64' }));

    expect(unsupportedType.status).toBe(400);
    expect(malformedData.status).toBe(400);
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
      include: { order: { select: { orderCode: true, customerName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('updates a request status and admin note for an admin', async () => {
    const response = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'REFUNDED', adminNote: 'Đã hoàn 65.000đ.' }));

    expect(response.status).toBe(200);
    expect(returnUpdate).toHaveBeenCalledWith({
      where: { id: 'return-1' },
      data: { status: 'REFUNDED', adminNote: 'Đã hoàn 65.000đ.' },
      include: { order: { select: { orderCode: true, customerName: true } } },
    });
  });

  it('rejects invalid admin status updates', async () => {
    const response = await PATCH(makeRequest('PATCH', { id: 'return-1', status: 'PAID' }));

    expect(response.status).toBe(400);
    expect(returnUpdate).not.toHaveBeenCalled();
  });
});