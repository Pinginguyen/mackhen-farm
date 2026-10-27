import confetti from 'canvas-confetti';

const celebratedOrders = new Set<string>();

export function celebratePayment(orderCode: string) {
  if (celebratedOrders.has(orderCode)) return;
  celebratedOrders.add(orderCode);
  confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
}