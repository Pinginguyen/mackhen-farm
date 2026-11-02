import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createOrderChecksum } from './crypto-order';

describe('createOrderChecksum', () => {
  it('hashes order code, amount, ISO creation time, and the specified salt', () => {
    const order = {
      orderCode: 'MKF-123456',
      totalAmount: 169000,
      createdAt: new Date('2026-10-14T00:00:00.000Z'),
    };
    const expected = createHash('sha256')
      .update('MKF-1234561690002026-10-14T00:00:00.000ZMACKHEN_INTEGRITY_SALT', 'utf8')
      .digest('hex');

    expect(createOrderChecksum(order)).toBe(expected);
    expect(createOrderChecksum({ ...order, createdAt: '2026-10-14T00:00:00.000Z' })).toBe(expected);
  });
});