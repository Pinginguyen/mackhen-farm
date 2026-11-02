import { createHash } from 'node:crypto';

const ORDER_INTEGRITY_SALT = 'MACKHEN_INTEGRITY_SALT';

export function createOrderChecksum(order: { orderCode: string; totalAmount: number; createdAt: Date | string }): string {
  const createdAt = order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date(order.createdAt).toISOString();
  const source = `${order.orderCode}${order.totalAmount}${createdAt}${ORDER_INTEGRITY_SALT}`;
  return createHash('sha256').update(source, 'utf8').digest('hex');
}