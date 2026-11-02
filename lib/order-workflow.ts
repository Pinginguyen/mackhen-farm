export const orderStatuses = ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'HANDED_OFF', 'IN_TRANSIT', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'RETURNED', 'CANCELLED'] as const;
export type OrderWorkflowStatus = (typeof orderStatuses)[number];

export const allowedTransitions = {
  PENDING: ['CONFIRMED', 'PAID', 'CANCELLED'],
  CONFIRMED: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['HANDED_OFF', 'CANCELLED'],
  HANDED_OFF: ['IN_TRANSIT', 'SHIPPING', 'RETURNED'],
  IN_TRANSIT: ['SHIPPING', 'DELIVERED', 'RETURNED'],
  SHIPPING: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  RETURNED: [],
  CANCELLED: [],
} as const satisfies Record<OrderWorkflowStatus, readonly OrderWorkflowStatus[]>;

export function getAllowedNextStatuses(status: string): readonly string[] {
  return allowedTransitions[status as OrderWorkflowStatus] ?? [];
}