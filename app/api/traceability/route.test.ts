import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findLot } = vi.hoisted(() => ({ findLot: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { productionLot: { findUnique: findLot } } }));

import { GET } from './route';

describe('GET /api/traceability', () => {
  beforeEach(() => findLot.mockReset());

  it('normalizes the batch code and returns only public traceability fields', async () => {
    const lot = {
      lotCode: 'LOT-MKF-2026-001',
      mfgDate: new Date('2026-10-01T00:00:00.000Z'),
      expDate: new Date('2027-10-01T00:00:00.000Z'),
      receivedQty: 500,
      availableQty: 420,
      status: 'ACTIVE',
      testReportUrl: 'https://example.com/report.pdf',
      receivingNote: 'Nhà cung cấp A',
      product: { name: 'Khô chay vị mắc khén', slug: 'kho-chay-mac-khen' },
    };
    findLot.mockResolvedValue(lot);

    const response = await GET(new Request('https://mackhen.example/api/traceability?lotCode=lot-mkf-2026-001'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(findLot).toHaveBeenCalledWith(expect.objectContaining({ where: { lotCode: 'LOT-MKF-2026-001' } }));
    expect(await response.json()).toEqual({ lot: { ...lot, mfgDate: lot.mfgDate.toISOString(), expDate: lot.expDate.toISOString() } });
  });

  it('returns 404 when a valid lot code is not found', async () => {
    findLot.mockResolvedValue(null);
    const response = await GET(new Request('https://mackhen.example/api/traceability?lotCode=LOT-MKF-2026-404'));
    expect(response.status).toBe(404);
  });

  it('rejects malformed lot codes without querying the database', async () => {
    const response = await GET(new Request('https://mackhen.example/api/traceability?lotCode=bad%20code'));
    expect(response.status).toBe(400);
    expect(findLot).not.toHaveBeenCalled();
  });
});