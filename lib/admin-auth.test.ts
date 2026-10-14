import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUser } = vi.hoisted(() => ({ findUser: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: findUser } } }));

import { requireAdmin } from './admin-auth';
import { createSessionToken } from './auth';

const secret = 'rbac-test-secret-with-at-least-32-characters';

function requestWithRole(role: 'CUSTOMER' | 'ADMIN') {
  process.env.AUTH_SECRET = secret;
  const token = createSessionToken({ userId: 'user-1', name: 'Test User', email: 'test@example.com', role });
  return new Request('https://mackhen.example/api/admin/orders', { headers: token ? { cookie: `mkf_session=${token}` } : undefined });
}

describe('requireAdmin', () => {
  beforeEach(() => {
    findUser.mockReset();
  });

  it('denies requests without a session', async () => {
    process.env.AUTH_SECRET = secret;
    const response = await requireAdmin(new Request('https://mackhen.example/api/admin/orders'));
    expect(response?.status).toBe(403);
    expect(findUser).not.toHaveBeenCalled();
  });

  it('denies customer sessions', async () => {
    const response = await requireAdmin(requestWithRole('CUSTOMER'));
    expect(response?.status).toBe(403);
    expect(findUser).not.toHaveBeenCalled();
  });

  it('denies an admin token when the current database role was revoked', async () => {
    findUser.mockResolvedValue({ role: 'CUSTOMER' });
    const response = await requireAdmin(requestWithRole('ADMIN'));
    expect(response?.status).toBe(403);
  });

  it('allows an admin whose current database role is ADMIN', async () => {
    findUser.mockResolvedValue({ role: 'ADMIN' });
    expect(await requireAdmin(requestWithRole('ADMIN'))).toBeNull();
  });
});