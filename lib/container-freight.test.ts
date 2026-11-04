import { describe, expect, it } from 'vitest';
import { calculateContainerFreight } from './container-freight';

describe('calculateContainerFreight', () => {
  it('calculates cartons, mass, volume, pallets, and 20ft utilization', () => {
    expect(calculateContainerFreight(40, 20)).toEqual({
      cartons: 40,
      packs: 960,
      netWeightKg: 144,
      totalVolumeCbm: 0.72,
      pallets: 2,
      containerFillPercent: expect.closeTo(0.72 / 33.2 * 100),
    });
  });

  it('returns zero for no cartons and clamps negative inputs', () => {
    expect(calculateContainerFreight(0, 0).pallets).toBe(0);
    expect(calculateContainerFreight(-3, -1)).toMatchObject({ cartons: 0, packs: 0, netWeightKg: 0, totalVolumeCbm: 0, pallets: 0, containerFillPercent: 0 });
  });

  it('caps container utilization at 100 percent', () => {
    expect(calculateContainerFreight(3000, 40).containerFillPercent).toBe(100);
  });
});