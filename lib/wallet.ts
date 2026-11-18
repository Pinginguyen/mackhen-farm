import type { Prisma } from '@prisma/client';

export const ORDER_CASHBACK_RATE_PERCENT = 2;

export async function debitWalletForOrder(tx: Prisma.TransactionClient, input: {
  userId: string;
  orderId: string;
  amount: number;
}): Promise<boolean> {
  if (!Number.isSafeInteger(input.amount) || input.amount < 0) return false;
  if (input.amount === 0) return true;

  const wallet = await tx.wallet.findUnique({ where: { userId: input.userId }, select: { id: true } });
  if (!wallet) return false;
  const claim = await tx.walletTransaction.createMany({
    data: [{
      walletId: wallet.id,
      amount: input.amount,
      type: 'DEBIT',
      referenceId: `order:${input.orderId}:wallet-debit`,
      description: `Thanh toán một phần đơn hàng ${input.orderId}`,
    }],
    skipDuplicates: true,
  });
  if (claim.count !== 1) return false;

  const updated = await tx.wallet.updateMany({
    where: { id: wallet.id, balance: { gte: input.amount } },
    data: { balance: { decrement: input.amount } },
  });
  if (updated.count !== 1) throw new Error('WALLET_BALANCE_CHANGED');
  return true;
}

export async function creditOrderCashback(tx: Prisma.TransactionClient, input: {
  userId: string | null;
  orderId: string;
  orderCode: string;
  orderAmount: number;
}): Promise<number> {
  if (!input.userId || !Number.isSafeInteger(input.orderAmount) || input.orderAmount <= 0) return 0;
  const amount = Math.floor(input.orderAmount * ORDER_CASHBACK_RATE_PERCENT / 100);
  if (!amount) return 0;

  const wallet = await tx.wallet.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId },
    update: {},
    select: { id: true },
  });
  const claim = await tx.walletTransaction.createMany({
    data: [{
      walletId: wallet.id,
      amount,
      type: 'CREDIT',
      referenceId: `order:${input.orderId}:cashback`,
      description: `Cashback ${ORDER_CASHBACK_RATE_PERCENT}% từ đơn ${input.orderCode}`,
    }],
    skipDuplicates: true,
  });
  if (claim.count !== 1) return 0;
  await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
  return amount;
}