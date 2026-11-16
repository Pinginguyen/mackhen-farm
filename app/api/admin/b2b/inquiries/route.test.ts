import { beforeEach, describe, expect, it, vi } from 'vitest';

const { inquiryCount, inquiryFindMany, inquiryFindUnique, inquiryUpdate, requireAdmin, prisma } = vi.hoisted(() => {
  const mocks = {
    inquiryCount: vi.fn(), inquiryFindMany: vi.fn(), inquiryFindUnique: vi.fn(), inquiryUpdate: vi.fn(), requireAdmin: vi.fn(),
  };
  return {
    ...mocks,
    prisma: { b2bInquiry: { count: mocks.inquiryCount, findMany: mocks.inquiryFindMany, findUnique: mocks.inquiryFindUnique, update: mocks.inquiryUpdate } },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET } from './route';
import { PATCH } from './[id]/route';

describe('/api/admin/b2b/inquiries', () => {
  beforeEach(() => {
    inquiryCount.mockReset().mockResolvedValue(17);
    inquiryFindMany.mockReset().mockResolvedValue([]);
    inquiryFindUnique.mockReset().mockResolvedValue({ id: 'inq-1' });
    inquiryUpdate.mockReset().mockResolvedValue({ id: 'inq-1', status: 'CONTACTED', adminNotes: 'Đã gọi', updatedAt: new Date('2026-11-16T10:00:00Z') });
    requireAdmin.mockReset().mockResolvedValue(null);
  });

  it('filters and paginates inquiries for admins', async () => {
    const response = await GET(new Request('https://mackhen.example/api/admin/b2b/inquiries?page=2&pageSize=5&status=PENDING&q=North'));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(inquiryFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'PENDING',
        OR: expect.arrayContaining([
          { companyName: { contains: 'North', mode: 'insensitive' } },
          { contactName: { contains: 'North', mode: 'insensitive' } },
          { phone: { contains: 'North' } },
        ]),
      }),
      skip: 5,
      take: 5,
    }));
    expect(result.pagination).toEqual({ page: 2, pageSize: 5, total: 17, totalPages: 4 });
  });

  it('rejects requests from non-admins before querying inquiries', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));

    const response = await GET(new Request('https://mackhen.example/api/admin/b2b/inquiries'));

    expect(response.status).toBe(403);
    expect(inquiryFindMany).not.toHaveBeenCalled();
  });

  it('updates status and admin notes', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/b2b/inquiries/inq-1', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'CONTACTED', adminNotes: '  Đã gọi  ' }),
    }), { params: { id: 'inq-1' } });

    expect(response.status).toBe(200);
    expect(inquiryUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'inq-1' },
      data: { status: 'CONTACTED', adminNotes: 'Đã gọi' },
    }));
  });

  it('rejects unsupported status values', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/b2b/inquiries/inq-1', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'ARCHIVED' }),
    }), { params: { id: 'inq-1' } });

    expect(response.status).toBe(400);
    expect(inquiryUpdate).not.toHaveBeenCalled();
  });
});