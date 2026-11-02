import { beforeEach, describe, expect, it, vi } from 'vitest';

const { affiliateFindUnique, getRequestSession } = vi.hoisted(() => ({ affiliateFindUnique: vi.fn(), getRequestSession: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { affiliate: { findUnique: affiliateFindUnique } } }));
vi.mock('@/lib/auth', () => ({ getRequestSession }));

import { requireAffiliate } from './affiliate-auth';

describe('requireAffiliate', () => {
  beforeEach(() => {
    affiliateFindUnique.mockReset().mockResolvedValue({
      id: 'affiliate-1', affiliateCode: 'KOC_TAYBAC', commissionRate: 12, active: true,
      user: { name: 'Tu Trinh', email: 'tu@example.com', role: 'AFFILIATE' },
    });
    getRequestSession.mockReset().mockReturnValue({ userId: 'user-1', email: 'tu@example.com', name: 'Tu Trinh', role: 'AFFILIATE', expiresAt: 9999999999 });
  });

  it('rejects requests without an authenticated session', async () => {
    getRequestSession.mockReturnValueOnce(null);
    const result = await requireAffiliate(new Request('https://mackhen.example/api/affiliate/dashboard'));

    expect(result.denied?.status).toBe(401);
    expect(affiliateFindUnique).not.toHaveBeenCalled();
  });

  it('rejects customer sessions from the KOC portal', async () => {
    getRequestSession.mockReturnValueOnce({ userId: 'user-1', email: 'tu@example.com', name: 'Tu Trinh', role: 'CUSTOMER', expiresAt: 9999999999 });
    const result = await requireAffiliate(new Request('https://mackhen.example/api/affiliate/dashboard'));

    expect(result.denied?.status).toBe(401);
    expect(affiliateFindUnique).not.toHaveBeenCalled();
  });

  it('allows an active affiliate whose persisted user role is AFFILIATE', async () => {
    const result = await requireAffiliate(new Request('https://mackhen.example/api/affiliate/dashboard'));

    expect(result.affiliate?.affiliateCode).toBe('KOC_TAYBAC');
    expect(affiliateFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
  });

  it('rejects suspended affiliate records', async () => {
    affiliateFindUnique.mockResolvedValueOnce({
      id: 'affiliate-1', affiliateCode: 'KOC_TAYBAC', commissionRate: 12, active: false,
      user: { name: 'Tu Trinh', email: 'tu@example.com', role: 'AFFILIATE' },
    });
    const result = await requireAffiliate(new Request('https://mackhen.example/api/affiliate/dashboard'));

    expect(result.denied?.status).toBe(403);
  });
});