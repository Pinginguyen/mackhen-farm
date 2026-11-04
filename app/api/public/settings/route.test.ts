import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSystemSettings } = vi.hoisted(() => ({ getSystemSettings: vi.fn() }));

vi.mock('@/lib/system-settings', () => ({ getSystemSettings }));

import { GET } from './route';

describe('GET /api/public/settings', () => {
  beforeEach(() => {
    getSystemSettings.mockReset().mockResolvedValue({
      id: 'default',
      companyName: 'Mắc Khén Farm',
      taxCode: '0100000000',
      representativeName: 'Nguyễn An',
      address: 'Sơn La',
      hotline: '0900000000',
      email: 'hello@example.com',
      b2bItemsPerCarton: 30,
      b2bCartonWeightKg: 4.2,
      dppSupplyGPS: '20.7°N, 104.9°E',
      dppLabResult: 'Salmonella: Âm tính',
      freeShippingThreshold: 250000,
      tasteGuaranteeText: 'Private setting',
    });
  });

  it('returns only public business, logistics and DPP settings', async () => {
    const response = await GET();
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.settings).toEqual({
      companyName: 'Mắc Khén Farm',
      taxCode: '0100000000',
      representativeName: 'Nguyễn An',
      address: 'Sơn La',
      hotline: '0900000000',
      email: 'hello@example.com',
      b2bItemsPerCarton: 30,
      b2bCartonWeightKg: 4.2,
      dppSupplyGPS: '20.7°N, 104.9°E',
      dppLabResult: 'Salmonella: Âm tính',
    });
    expect(result.settings.tasteGuaranteeText).toBeUndefined();
  });
});