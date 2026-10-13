import { describe, expect, it } from 'vitest';

import { calculateShipping } from './shipping';

describe('calculateShipping', () => {
  it('charges shipping below the free-shipping threshold', () => {
    expect(calculateShipping(168999, ['mac-khen-xe-soi-cay-nong'])).toBe(35000);
  });

  it('waives shipping at the free-shipping threshold', () => {
    expect(calculateShipping(169000, ['mac-khen-xe-soi-cay-nong'])).toBe(0);
  });

  it('waives shipping for the combo regardless of subtotal', () => {
    expect(calculateShipping(100000, ['combo-bo-ba-nhau-xanh'])).toBe(0);
  });

  it('does not charge shipping for an empty cart', () => {
    expect(calculateShipping(0, [])).toBe(0);
  });
});