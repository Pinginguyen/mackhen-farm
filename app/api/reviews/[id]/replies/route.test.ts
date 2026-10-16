import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reviewFindUnique, replyCreate, getRequestSession, prisma } = vi.hoisted(() => {
  const reviewFindUnique = vi.fn();
  const replyCreate = vi.fn();
  const getRequestSession = vi.fn();
  return {
    reviewFindUnique,
    replyCreate,
    getRequestSession,
    prisma: { review: { findUnique: reviewFindUnique }, reviewReply: { create: replyCreate } },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/auth', () => ({ getRequestSession }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { POST } from './route';

const context = { params: { id: 'review-1' } };
function request(body: unknown) {
  return new Request('https://mackhen.example/api/reviews/review-1/replies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/reviews/[id]/replies', () => {
  beforeEach(() => {
    reviewFindUnique.mockReset().mockResolvedValue({ id: 'review-1' });
    replyCreate.mockReset().mockImplementation(({ data }) => Promise.resolve({ id: 'reply-1', ...data, createdAt: new Date() }));
    getRequestSession.mockReset().mockReturnValue(null);
  });

  it('creates a customer reply without trusting a role sent in the body', async () => {
    const response = await POST(request({ authorName: 'Minh Anh', authorRole: 'ADMIN', content: 'Shop giao nhanh không bạn?' }), context);
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.reply.authorRole).toBe('USER');
    expect(replyCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ authorName: 'Minh Anh', authorRole: 'USER', userId: null }) }));
  });

  it('uses the authenticated admin role and name from the signed session', async () => {
    getRequestSession.mockReturnValueOnce({ userId: 'admin-1', name: 'Shop Admin', role: 'ADMIN' });
    const response = await POST(request({ authorName: 'Impersonated', content: 'Shop xác nhận sản phẩm chuẩn vị.' }), context);

    expect(response.status).toBe(201);
    expect(replyCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ authorName: 'Shop Admin', authorRole: 'ADMIN', userId: 'admin-1' }) }));
  });
});
