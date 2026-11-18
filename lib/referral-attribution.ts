const STORAGE_KEY = 'mackhen_customer_referral';
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeCustomerReferralCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^FRIEND-[A-F0-9]{8}$/.test(code) ? code : null;
}

export function storeCustomerReferralCode(value: unknown): string | null {
  if (typeof window === 'undefined') return null;
  const code = normalizeCustomerReferralCode(value);
  if (!code) return null;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, expiresAt: Date.now() + ATTRIBUTION_WINDOW_MS }));
    return code;
  } catch {
    return null;
  }
}

export function clearStoredCustomerReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function getStoredCustomerReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { code?: unknown; expiresAt?: unknown };
    const code = normalizeCustomerReferralCode(stored.code);
    if (!code || typeof stored.expiresAt !== 'number' || stored.expiresAt <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return code;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}