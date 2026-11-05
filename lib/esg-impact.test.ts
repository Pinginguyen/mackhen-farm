import { describe, expect, it } from 'vitest';
import { calculateEsgImpact, parsePackageWeightGrams } from './esg-impact';

describe('ESG impact estimates', () => {
  it('calculates the requested impact from product weights and quantities', () => {
    expect(calculateEsgImpact([{ quantity: 1, weightGrams: 150 }])).toEqual({
      soyPulpGrams: 450,
      waterSavedLiters: 1200,
      co2AvoidedKg: 3.6,
    });
    expect(calculateEsgImpact([{ quantity: 2, weightGrams: 150 }])).toEqual({
      soyPulpGrams: 900,
      waterSavedLiters: 2400,
      co2AvoidedKg: 7.2,
    });
  });

  it('parses gram and kilogram package weights', () => {
    expect(parsePackageWeightGrams('150g')).toBe(150);
    expect(parsePackageWeightGrams('0.45 kg')).toBe(450);
    expect(parsePackageWeightGrams('invalid')).toBeNull();
  });

  it('uses a 100g package estimate when product weight is unavailable', () => {
    expect(calculateEsgImpact([{ quantity: 1 }])).toEqual({
      soyPulpGrams: 300,
      waterSavedLiters: 800,
      co2AvoidedKg: 2.4,
    });
  });
});