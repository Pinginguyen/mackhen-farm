import { beforeEach, describe, expect, it, vi } from 'vitest';

const { lotFindUnique } = vi.hoisted(() => ({ lotFindUnique: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { productionLot: { findUnique: lotFindUnique } } }));

vi.mock('@/lib/system-settings', () => ({
  getSystemSettings: vi.fn().mockResolvedValue({
    dppSupplyGPS: '20.738°N, 104.912°E (Sơn La)',
    dppLabResult: 'Salmonella: Âm tính | E.Coli: < 10 CFU/g | Aflatoxin: ND',
  }),
}));

import { GET } from './route';

describe('GET /api/traceability/[batchCode]', () => {
  beforeEach(() => {
    lotFindUnique.mockReset().mockResolvedValue({
      batchCode: 'LOT-MKF-2026-001',
      mfgDate: new Date('2026-10-10T00:00:00.000Z'),
      expDate: new Date('2027-10-10T00:00:00.000Z'),
      receivedQty: 40,
      availableQty: 21,
      status: 'ACTIVE',
      testReportUrl: 'https://example.test/coa.pdf',
      receivingNote: 'Lô sản xuất tháng 10',
      product: { name: 'Khô thực vật', slug: 'kho-thuc-vat', unit: '150g', ingredients: 'Đậu nành' },
      variant: { title: 'Túi 150g', weight: '150g' },
    });
  });

  it('normalizes the batch code and returns persisted traceability details', async () => {
    const response = await GET(new Request('https://mackhen.example/api/traceability/batch-kb-2026-01'), {
      params: { batchCode: 'lot-mkf-2026-001' },
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.batchCode).toBe('LOT-MKF-2026-001');
    expect(result.data.productName).toBe('Khô thực vật');
    expect(result.data.receivedQty).toBe(40);
    expect(result.data.testReportUrl).toBe('https://example.test/coa.pdf');
    expect(result.data.dppSupplyGPS).toBe('20.738°N, 104.912°E (Sơn La)');
    expect(result.data.dppLabResult).toContain('Salmonella: Âm tính');
    expect(lotFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { batchCode: 'LOT-MKF-2026-001' } }));
  });

  it('accepts and looks up the BATCH-CRAFT format', async () => {
    lotFindUnique.mockResolvedValueOnce({
      batchCode: 'BATCH-CRAFT-2026',
      qrToken: '49c449a3-674b-4ce8-84cf-c6ff3cb2f137',
      mfgDate: new Date('2026-10-12T00:00:00.000Z'),
      expDate: new Date('2027-10-12T00:00:00.000Z'),
      receivedQty: 120,
      availableQty: 120,
      status: 'ACTIVE',
      testReportUrl: null,
      receivingNote: 'Supplier and processing record',
      product: { name: 'Khô Bò Thực Vật Mắc Khén Xé Sợi Cay Nồng', slug: 'mac-khen-xe-soi-cay-nong', unit: 'Túi 150g', ingredients: 'Bã đậu nành upcycled', originRegion: 'Sơn La, Tây Bắc' },
      variant: { title: 'Túi 150g', weight: '150g' },
    });

    const response = await GET(new Request('https://mackhen.example/api/traceability/batch-craft-2026'), {
      params: { batchCode: 'batch-craft-2026' },
    });

    expect(response.status).toBe(200);
    expect(lotFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { batchCode: 'BATCH-CRAFT-2026' } }));
  });

  it('returns a not-found response for an unknown batch', async () => {
    lotFindUnique.mockResolvedValueOnce(null);
    const response = await GET(new Request('https://mackhen.example/api/traceability/LOT-MKF-2026-404'), {
      params: { batchCode: 'LOT-MKF-2026-404' },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, error: 'Mã lô không tồn tại hoặc đã hết hạn.' });
  });

  it('rejects malformed batch codes without querying the database', async () => {
    const response = await GET(new Request('https://mackhen.example/api/traceability/bad'), {
      params: { batchCode: 'bad' },
    });

    expect(response.status).toBe(400);
    expect(lotFindUnique).not.toHaveBeenCalled();
  });
});