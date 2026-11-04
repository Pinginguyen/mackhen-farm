import { describe, expect, it } from 'vitest';

import { calculateShipping } from './shipping';

describe('calculateShipping', () => {
  it('charges shipping below the free-shipping threshold', () => {
    expect(calculateShipping(168999, ['mac-khen-xe-soi-cay-nong'], 250000)).toBe(35000);
  });

  it('waives shipping at the free-shipping threshold', () => {
    expect(calculateShipping(250000, ['mac-khen-xe-soi-cay-nong'], 250000)).toBe(0);
  });

  it('uses the admin-configured threshold instead of a fixed storefront amount', () => {
    expect(calculateShipping(250000, ['mac-khen-xe-soi-cay-nong'], 300000)).toBe(35000);
    expect(calculateShipping(300000, ['mac-khen-xe-soi-cay-nong'], 300000)).toBe(0);
  });

  it('waives shipping for the combo regardless of subtotal', () => {
    expect(calculateShipping(100000, ['combo-bo-ba-nhau-xanh'], 250000)).toBe(0);
  });

  it('does not charge shipping for an empty cart', () => {
    expect(calculateShipping(0, [], 250000)).toBe(0);
  });
});