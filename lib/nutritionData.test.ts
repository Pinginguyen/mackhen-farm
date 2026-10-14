import { describe, expect, it } from 'vitest';

import { NUTRITION_MAP } from './nutritionData';

const seededSlugs = [
  'cham-cheo-uot-chuan-vi-dien-bien',
  'hat-mac-khen-rung-sao-kho-son-la',
  'hat-doi-rung-nep-thuong-hang',
  'muoi-cham-cheo-hat-doi-rang-kho',
  'mac-khen-xe-soi-cay-nong',
  'mac-khen-mieng-deo-tieu-rung',
  'mac-khen-chay-toi-gion-cay',
  'combo-bo-ba-nhau-xanh',
];

describe('product nutrition data', () => {
  it('provides every nutrition value for every seeded product slug', () => {
    for (const slug of seededSlugs) {
      expect(NUTRITION_MAP[slug], slug).toBeDefined();
      expect(Object.values(NUTRITION_MAP[slug]).every(Boolean), slug).toBe(true);
    }
  });
});