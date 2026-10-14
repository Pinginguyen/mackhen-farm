import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'mkf_session';
export const ADMIN_EMAIL = 'admin@mackhenfarm.vn';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  expiresAt: number;
};

export function getAuthSecret(): string | null {
  return [process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET]
    .find((secret): secret is string => Boolean(secret && secret.length >= 32)) ?? null;
}

export function createSessionToken(user: Omit<SessionPayload, 'expiresAt'>): string | null {
  const secret = getAuthSecret();
  if (!secret) return null;

  const payload = Buffer.from(JSON.stringify({ ...user, expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  const secret = getAuthSecret();
  if (!secret || !token) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;

  const expected = createHmac('sha256', secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionPayload;
    if (!session.userId || !session.email || !['CUSTOMER', 'ADMIN'].includes(session.role) || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_SECONDS,
  };
}

export function getRequestSession(request: Request): SessionPayload | null {
  const token = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  return verifySessionToken(token ? decodeURIComponent(token) : undefined);
}