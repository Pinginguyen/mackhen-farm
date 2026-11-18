import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';

import { awardOrderLoyaltyPoints, calculateEarnedPoints, getMembershipTier } from './loyalty';

describe('loyalty point calculations', () => {
  it('awards one point for each completed 10,000 VND', () => {
    expect(calculateEarnedPoints(29_999)).toBe(2);
    expect(calculateEarnedPoints(10_000)).toBe(1);
    expect(calculateEarnedPoints(9_999)).toBe(0);
  });

  it('maps lifetime points to Bronze, Silver, and Gold tier codes', () => {
    expect(getMembershipTier(999)).toBe('MEMBER');
    expect(getMembershipTier(1_000)).toBe('VIP');
    expect(getMembershipTier(5_000)).toBe('VVIP');
  });

  it('records an earning once and promotes the member within the transaction', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ membershipTier: 'MEMBER', lifetimePoints: 1_000 });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn();
    const tx = { pointHistory: { createMany }, user: { update, updateMany, findUnique } } as unknown as Prisma.TransactionClient;

    await expect(awardOrderLoyaltyPoints(tx, { userId: 'user-1', orderId: 'order-1', amountVnd: 10_000_000 })).resolves.toBe(1_000);
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: [expect.objectContaining({ type: 'EARN', points: 1_000, idempotencyKey: 'order:order-1:earn' })] }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { loyaltyPoints: { increment: 1_000 }, lifetimePoints: { increment: 1_000 } } }));
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-1', membershipTier: 'MEMBER' }, data: { membershipTier: 'VIP' } }));
  });

  it('does not award points again when the earning key already exists', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 0 });
    const update = vi.fn();
    const tx = { pointHistory: { createMany }, user: { update } } as unknown as Prisma.TransactionClient;

    await expect(awardOrderLoyaltyPoints(tx, { userId: 'user-1', orderId: 'order-1', amountVnd: 50_000 })).resolves.toBe(0);
    expect(update).not.toHaveBeenCalled();
  });
});
