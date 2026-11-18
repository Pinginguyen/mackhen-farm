import type { Prisma } from '@prisma/client';

export const VND_PER_POINT = 10_000;
export const POINT_REDEMPTION_VALUE_VND = 100;
export const VIP_LIFETIME_POINTS = 1_000;
export const VVIP_LIFETIME_POINTS = 5_000;

export function calculateEarnedPoints(amountVnd: number): number {
  if (!Number.isSafeInteger(amountVnd) || amountVnd < 0) throw new RangeError('Loyalty amount must be a non-negative safe integer.');
  return Math.floor(amountVnd / VND_PER_POINT);
}

export function getMembershipTier(lifetimePoints: number): 'MEMBER' | 'VIP' | 'VVIP' {
  if (lifetimePoints >= VVIP_LIFETIME_POINTS) return 'VVIP';
  if (lifetimePoints >= VIP_LIFETIME_POINTS) return 'VIP';
  return 'MEMBER';
}

const tierRank = { MEMBER: 0, VIP: 1, VVIP: 2 } as const;

export async function awardOrderLoyaltyPoints(tx: Prisma.TransactionClient, input: {
  userId: string | null;
  orderId: string;
  amountVnd: number;
}): Promise<number> {
  if (!input.userId) return 0;
  const points = calculateEarnedPoints(input.amountVnd);
  if (!points) return 0;

  const claim = await tx.pointHistory.createMany({
    data: [{
      userId: input.userId,
      orderId: input.orderId,
      points,
      type: 'EARN',
      description: `Tích điểm từ đơn hàng (${input.orderId})`,
      idempotencyKey: `order:${input.orderId}:earn`,
    }],
    skipDuplicates: true,
  });
  if (claim.count !== 1) return 0;

  const user = await tx.user.update({
    where: { id: input.userId },
    data: { loyaltyPoints: { increment: points }, lifetimePoints: { increment: points } },
    select: { membershipTier: true, lifetimePoints: true },
  });
  let currentTier = user.membershipTier in tierRank ? user.membershipTier as keyof typeof tierRank : 'MEMBER';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextTier = getMembershipTier(user.lifetimePoints);
    if (tierRank[nextTier] <= tierRank[currentTier]) break;
    const updated = await tx.user.updateMany({
      where: { id: input.userId, membershipTier: currentTier },
      data: { membershipTier: nextTier },
    });
    if (updated.count === 1) break;
    const latest = await tx.user.findUnique({ where: { id: input.userId }, select: { membershipTier: true } });
    currentTier = latest && latest.membershipTier in tierRank ? latest.membershipTier as keyof typeof tierRank : 'MEMBER';
  }
  return points;
}
