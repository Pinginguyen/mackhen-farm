import { beforeEach, describe, expect, it, vi } from 'vitest';

const { userFindUnique, orderFindMany, getRequestSession } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  orderFindMany: vi.fn(),
  getRequestSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: userFindUnique }, order: { findMany: orderFindMany } } }));
vi.mock('@/lib/auth', () => ({ getRequestSession }));

import { GET } from './route';

describe('GET /api/account/orders', () => {
  beforeEach(() => {
    userFindUnique.mockReset().mockResolvedValue({ phone: '0762793244' });
    orderFindMany.mockReset().mockResolvedValue([]);
    getRequestSession.mockReset().mockReturnValue({ userId: 'user-1', email: 'buyer@example.com' });
  });

  it('requires an authenticated account', async () => {
    getRequestSession.mockReturnValue(null);
    const response = await GET(new Request('https://mackhen.example/api/account/orders'));

    expect(response.status).toBe(401);
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it('finds orders linked by user id, verified phone, or account email', async () => {
    const response = await GET(new Request('https://mackhen.example/api/account/orders'));

    expect(response.status).toBe(200);
    expect(orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [
        { userId: 'user-1' },
        { phone: '0762793244' },
        { customer: { is: { email: 'buyer@example.com' } } },
      ] },
      take: 50,
    }));
  });
});