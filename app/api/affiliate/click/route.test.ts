import { beforeEach, describe, expect, it, vi } from 'vitest';

const { affiliateFindUnique, clickCreate } = vi.hoisted(() => ({ affiliateFindUnique: vi.fn(), clickCreate: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { affiliate: { findUnique: affiliateFindUnique }, affiliateClick: { create: clickCreate } } }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { POST } from './route';

function request(affiliateCode: string) {
  return new Request('https://mackhen.example/api/affiliate/click', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ affiliateCode }) });
}

describe('POST /api/affiliate/click', () => {
  beforeEach(() => {
    affiliateFindUnique.mockReset().mockResolvedValue({ id: 'affiliate-1', active: true });
    clickCreate.mockReset().mockResolvedValue({ id: 'click-1' });
  });

  it('records a click for a normalized active affiliate code', async () => {
    const response = await POST(request('koc_taybac'));

    expect(response.status).toBe(202);
    expect(affiliateFindUnique).toHaveBeenCalledWith({ where: { affiliateCode: 'KOC_TAYBAC' }, select: { id: true, active: true } });
    expect(clickCreate).toHaveBeenCalledWith({ data: { affiliateId: 'affiliate-1' } });
  });

  it('does not count clicks for paused affiliates', async () => {
    affiliateFindUnique.mockResolvedValueOnce({ id: 'affiliate-1', active: false });
    const response = await POST(request('KOC_TAYBAC'));

    expect(response.status).toBe(404);
    expect(clickCreate).not.toHaveBeenCalled();
  });
});