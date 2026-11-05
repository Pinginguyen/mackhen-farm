import { describe, expect, it } from 'vitest';
import { getAllowedNextStatuses } from './order-workflow';

describe('order workflow transitions', () => {
  it('allows the final supply-chain workflow in sequence', () => {
    expect(getAllowedNextStatuses('PROCESSING')).toContain('HANDED_OFF');
    expect(getAllowedNextStatuses('HANDED_OFF')).toContain('SHIPPING');
    expect(getAllowedNextStatuses('SHIPPING')).toContain('DELIVERED');
    expect(getAllowedNextStatuses('DELIVERED')).toContain('COMPLETED');
  });

  it('allows returns and cancellation only at supported workflow stages', () => {
    expect(getAllowedNextStatuses('HANDED_OFF')).toContain('RETURNED');
    expect(getAllowedNextStatuses('SHIPPING')).toContain('RETURNED');
    expect(getAllowedNextStatuses('PROCESSING')).toContain('CANCELLED');
    expect(getAllowedNextStatuses('COMPLETED')).not.toContain('CANCELLED');
  });
});