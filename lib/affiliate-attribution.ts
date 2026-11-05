const STORAGE_KEY = 'mackhen_affiliate_attribution';
export const COOKIE_CONSENT_KEY = 'mackhen_cookie_consent';
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function hasAffiliateConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function clearAffiliateCode(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function normalizeAffiliateCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(code) ? code : null;
}

export function storeAffiliateCode(value: unknown): string | null {
  if (typeof window === 'undefined' || !hasAffiliateConsent()) return null;
  const code = normalizeAffiliateCode(value);
  if (!code) return null;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, expiresAt: Date.now() + ATTRIBUTION_WINDOW_MS }));
    return code;
  } catch {
    return null;
  }
}

export function getStoredAffiliateCode(): string | null {
  if (typeof window === 'undefined' || !hasAffiliateConsent()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { code?: unknown; expiresAt?: unknown };
    const code = normalizeAffiliateCode(stored.code);
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