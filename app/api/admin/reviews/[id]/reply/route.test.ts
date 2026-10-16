import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reviewFindUnique, reviewUpdate, requireAdmin, writeAuditLog, prisma } = vi.hoisted(() => {
  const reviewFindUnique = vi.fn();
  const reviewUpdate = vi.fn();
  const requireAdmin = vi.fn();
  const writeAuditLog = vi.fn();
  return {
    reviewFindUnique,
    reviewUpdate,
    requireAdmin,
    writeAuditLog,
    prisma: { review: { findUnique: reviewFindUnique, update: reviewUpdate } },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/auth', () => ({ getRequestSession: () => ({ email: 'admin@example.com' }) }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { PATCH } from './route';

const context = { params: { id: 'review-1' } };
function request(adminReply: unknown) {
  return new Request('https://mackhen.example/api/admin/reviews/review-1/reply', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ adminReply }),
  });
}

describe('PATCH /api/admin/reviews/[id]/reply', () => {
  beforeEach(() => {
    reviewFindUnique.mockReset().mockResolvedValue({ adminReply: null });
    reviewUpdate.mockReset().mockImplementation(({ data }) => Promise.resolve({ id: 'review-1', ...data }));
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it('requires admin authorization', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const response = await PATCH(request('Xin chào'), context);

    expect(response.status).toBe(403);
    expect(reviewUpdate).not.toHaveBeenCalled();
  });

  it('saves a merchant reply and timestamp', async () => {
    const response = await PATCH(request('Cảm ơn bạn đã chia sẻ!'), context);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.item.adminReply).toBe('Cảm ơn bạn đã chia sẻ!');
    expect(reviewUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'review-1' },
      data: { adminReply: 'Cảm ơn bạn đã chia sẻ!', adminReplyAt: expect.any(Date) },
    }));
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'REPLY_TO_REVIEW' }));
  });

  it('clears the reply when the admin submits an empty value', async () => {
    reviewFindUnique.mockResolvedValueOnce({ adminReply: 'Câu trả lời cũ' });
    const response = await PATCH(request(''), context);

    expect(response.status).toBe(200);
    expect(reviewUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { adminReply: null, adminReplyAt: null } }));
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'REMOVE_REVIEW_REPLY' }));
  });
});
