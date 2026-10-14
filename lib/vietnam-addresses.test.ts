import { describe, expect, it } from 'vitest';

import { getVietnamAddressData } from './vietnam-addresses';

describe('Vietnam checkout address hierarchy', () => {
  it('keeps Ho Chi Minh City districts and wards linked to their parent IDs', async () => {
    const data = await getVietnamAddressData();
    const hoChiMinh = data.provinces.find((province) => province.idProvince === '79');
    expect(hoChiMinh).toBeDefined();

    const districts = data.districts.filter((district) => district.idProvince === hoChiMinh?.idProvince);
    expect(districts).toHaveLength(22);
    expect(districts.map(({ name }) => name)).toContain('Quận 1');
    expect(districts.map(({ name }) => name)).toContain('Quận 7');
    expect(districts.map(({ name }) => name)).toContain('Quận Tân Bình');
    expect(districts.map(({ name }) => name)).toContain('Thành phố Thủ Đức');

    const quanMot = districts.find((district) => district.name === 'Quận 1');
    const wards = data.communes.filter((commune) => commune.idDistrict === quanMot?.idDistrict);
    expect(wards.map(({ name }) => name)).toContain('Phường Bến Thành');
    expect(wards.some(({ name }) => name.includes('Bà Rịa'))).toBe(false);
  });
});