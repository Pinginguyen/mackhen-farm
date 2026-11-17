import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const rateLimitBuckets = new Map<string, number[]>();
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/checkout': { limit: 3, windowMs: 10_000 },
  '/api/orders': { limit: 3, windowMs: 10_000 },
  '/api/auth/login': { limit: 10, windowMs: 60_000 },
};
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisLimiters = new Map<string, Ratelimit>();
if (redisUrl && redisToken) {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  for (const [pathname, rule] of Object.entries(RATE_LIMITS)) {
    redisLimiters.set(pathname, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowMs / 1000} s`),
      prefix: `mackhen-farm:middleware:${pathname}`,
    }));
  }
}
let warnedMissingRateLimitStore = false;
const LOCALE_CURRENCY_COOKIE = 'mackhen_locale_currency';

type LocalePreference = { locale: 'vi' | 'en'; currency: 'VND' | 'SGD' };

function clientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) return cloudflareIp;

  const proxyHeadersTrusted = process.env.VERCEL === '1' || process.env.TRUST_PROXY_HEADERS === '1';
  if (!proxyHeadersTrusted) return 'unknown';

  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function rateLimitedResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: { code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' } },
    { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
  );
}

function warnRateLimitFallback(reason: string): void {
  if (warnedMissingRateLimitStore) return;
  console.warn(`[RATE_LIMIT_LOCAL_FALLBACK] ${reason}`);
  warnedMissingRateLimitStore = true;
}

async function rateLimitResponse(request: NextRequest): Promise<NextResponse | null> {
  if (request.method !== 'POST') return null;
  const rule = RATE_LIMITS[request.nextUrl.pathname];
  if (!rule) return null;

  const ip = clientIp(request);
  const key = `${request.nextUrl.pathname}:${ip}`;
  const limiter = redisLimiters.get(request.nextUrl.pathname);
  if (limiter) {
    try {
      const result = await limiter.limit(ip);
      return result.success ? null : rateLimitedResponse(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
    } catch (error) {
      warnRateLimitFallback(`Redis unavailable (${error instanceof Error ? error.name : 'UnknownError'}); using in-memory limits.`);
    }
  } else {
    warnRateLimitFallback('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured; using in-memory limits.');
  }

  const now = Date.now();
  const windowStart = now - rule.windowMs;
  const requests = (rateLimitBuckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
  if (requests.length >= rule.limit) {
    const retryAfter = Math.max(1, Math.ceil((requests[0] + rule.windowMs - now) / 1000));
    return rateLimitedResponse(retryAfter);
  }

  requests.push(now);
  rateLimitBuckets.set(key, requests);
  if (rateLimitBuckets.size > 5_000) {
    for (const [bucketKey, timestamps] of rateLimitBuckets) {
      if (!timestamps.some((timestamp) => timestamp > now - 60_000)) rateLimitBuckets.delete(bucketKey);
    }
    while (rateLimitBuckets.size > 5_000) {
      const oldestKey = rateLimitBuckets.keys().next().value;
      if (!oldestKey) break;
      rateLimitBuckets.delete(oldestKey);
    }
  }
  return null;
}

function geoPreference(request: NextRequest): LocalePreference | null {
  if (request.cookies.has(LOCALE_CURRENCY_COOKIE)) return null;

  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase();
  const firstLanguage = request.headers.get('accept-language')?.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
  if (country === 'SG' || country === 'US' || firstLanguage?.startsWith('en')) {
    return { locale: 'en', currency: 'SGD' };
  }
  return null;
}

function nextWithGeoPreference(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const preference = geoPreference(request);
  if (preference) {
    response.cookies.set(LOCALE_CURRENCY_COOKIE, encodeURIComponent(JSON.stringify(preference)), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    });
  }
  return response;
}

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

type MiddlewareSession = { userId?: string; role?: string; expiresAt?: number };

async function readSession(token: string | undefined, secret: string | undefined): Promise<MiddlewareSession | null> {
  if (!token || !secret || secret.length < 32) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;

  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), new TextEncoder().encode(encoded));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as MiddlewareSession;
    if (!session.userId || !['CUSTOMER', 'ADMIN'].includes(session.role ?? '') || typeof session.expiresAt !== 'number' || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const limited = await rateLimitResponse(request);
  if (limited) return limited;

  const isAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/');
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAccountPage = pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/');
  const token = request.cookies.get('mkf_session')?.value;
  const sessionSecret = [process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET]
    .find((secret) => Boolean(secret && secret.length >= 32));
  const session = await readSession(token, sessionSecret);

  if (isAdminApi) {
    if (session?.role === 'ADMIN') return nextWithGeoPreference(request);
    return NextResponse.json({ error: 'Truy cập bị từ chối' }, { status: 403 });
  }

  if (isAdminPage && session?.role === 'ADMIN') return nextWithGeoPreference(request);
  if (isAdminPage) {
    const loginUrl = new URL('/dang-nhap', request.url);
    loginUrl.searchParams.set('callbackUrl', '/admin');
    return NextResponse.redirect(loginUrl);
  }
  if (isAccountPage && session) return nextWithGeoPreference(request);
  if (!isAccountPage) return nextWithGeoPreference(request);

  const loginUrl = new URL('/dang-nhap', request.url);
  loginUrl.searchParams.set('callbackUrl', isAdminPage ? '/admin' : '/tai-khoan');
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'] };