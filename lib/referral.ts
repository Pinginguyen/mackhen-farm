import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getMembershipTier } from '@/lib/loyalty';

export const CUSTOMER_REFERRAL_REWARD_POINTS = 100;

export function normalizeCustomerReferralCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^FRIEND-[A-F0-9]{8}$/.test(code) ? code : null;
}

export async function ensureCustomerReferralCode(userId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, referralCode: true } });
    if (!user || user.role !== 'CUSTOMER') return null;
    if (user.referralCode) return user.referralCode;

    const referralCode = `FRIEND-${randomBytes(4).toString('hex').toUpperCase()}`;
    try {
      const claimed = await prisma.user.updateMany({
        where: { id: userId, role: 'CUSTOMER', referralCode: null },
        data: { referralCode },
      });
      if (claimed.count === 1) return referralCode;
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')) throw error;
    }
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  return user?.referralCode ?? null;
}

export async function awardReferralPoints(tx: Prisma.TransactionClient, input: {
  orderId: string;
  orderCode: string;
  referrerUserId: string | null;
}): Promise<number> {
  if (!input.referrerUserId) return 0;
  const claim = await tx.pointHistory.createMany({
    data: [{
      userId: input.referrerUserId,
      orderId: input.orderId,
      points: CUSTOMER_REFERRAL_REWARD_POINTS,
      type: 'EARN',
      description: `Thưởng giới thiệu bạn bè qua đơn ${input.orderCode}`,
      idempotencyKey: `referral:${input.orderId}:award`,
    }],
    skipDuplicates: true,
  });
  if (claim.count !== 1) return 0;

  const user = await tx.user.update({
    where: { id: input.referrerUserId },
    data: {
      loyaltyPoints: { increment: CUSTOMER_REFERRAL_REWARD_POINTS },
      lifetimePoints: { increment: CUSTOMER_REFERRAL_REWARD_POINTS },
    },
    select: { membershipTier: true, lifetimePoints: true },
  });
  let currentTier = user.membershipTier === 'VIP' || user.membershipTier === 'VVIP' ? user.membershipTier : 'MEMBER';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextTier = getMembershipTier(user.lifetimePoints);
    if (nextTier === currentTier) break;
    const updated = await tx.user.updateMany({
      where: { id: input.referrerUserId, membershipTier: currentTier },
      data: { membershipTier: nextTier },
    });
    if (updated.count === 1) break;
    const latest = await tx.user.findUnique({ where: { id: input.referrerUserId }, select: { membershipTier: true } });
    currentTier = latest?.membershipTier === 'VIP' || latest?.membershipTier === 'VVIP' ? latest.membershipTier : 'MEMBER';
  }
  return CUSTOMER_REFERRAL_REWARD_POINTS;
}