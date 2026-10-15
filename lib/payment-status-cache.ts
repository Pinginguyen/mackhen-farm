export type CachedPaymentStatus = {
  orderCode: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  sender?: string;
  transactionTime?: string;
  updatedAt: number;
};

type PaymentCacheStore = Map<string, CachedPaymentStatus>;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

declare global {
  var __mackhenPaymentStatusCache: PaymentCacheStore | undefined;
}

function getStore(): PaymentCacheStore {
  globalThis.__mackhenPaymentStatusCache ??= new Map<string, CachedPaymentStatus>();
  return globalThis.__mackhenPaymentStatusCache;
}

function pruneStore(store: PaymentCacheStore, now = Date.now()) {
  for (const [orderCode, value] of store) {
    if (now - value.updatedAt > CACHE_TTL_MS) store.delete(orderCode);
  }
  while (store.size > MAX_CACHE_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

export function rememberPendingPayment(orderCode: string, amount: number): void {
  const store = getStore();
  pruneStore(store);
  store.set(orderCode, { orderCode, amount, status: 'PENDING', updatedAt: Date.now() });
}

export function rememberPaidPayment(input: Omit<CachedPaymentStatus, 'status' | 'updatedAt'>): void {
  const store = getStore();
  pruneStore(store);
  store.set(input.orderCode, { ...input, status: 'PAID', updatedAt: Date.now() });
}

export function getCachedPaymentStatus(orderCode: string): CachedPaymentStatus | null {
  const store = getStore();
  pruneStore(store);
  return store.get(orderCode) ?? null;
}